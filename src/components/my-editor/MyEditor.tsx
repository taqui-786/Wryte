"use client";

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { nodes as basicNodes, marks } from "./myEditorSchema";
import {
  DOMParser,
  Fragment,
  Schema,
  Slice,
  Node as PMNode,
} from "prosemirror-model";
import { orderedList, bulletList, listItem } from "prosemirror-schema-list";
import { MyEditorToolbar } from "./MyEditorToolbar";
import { markActive, toolMarkActive, toolMarkInactive } from "./helper";
import { EditorView } from "prosemirror-view";
import { createEditorState } from "./EditorConfig";
import { EditorState } from "prosemirror-state";
// @ts-ignore
import "./myEditorStyle.css";
import { marked } from "marked";
import { customMarkdownSerializer } from "./EditorConfig";

/** A single line-level change from the AI */
export type AIChange = {
  line: number;
  type: "replace" | "delete" | "insert";
  content: string;
};

/** Imperative handle exposed by MyEditor via ref */
export interface MyEditorHandle {
  applyAIChanges: (changes: AIChange[]) => void;
  getMarkdownAfterAIChanges: (changes: AIChange[]) => string | null;
  getMarkdownAfterAIChangesFromBase: (
    baseMarkdown: string,
    changes: AIChange[],
  ) => string | null;
}

const mySchema = new Schema({
  nodes: {
    doc: basicNodes.doc,
    paragraph: basicNodes.paragraph,
    blockquote: basicNodes.blockquote,
    horizontal_rule: basicNodes.horizontal_rule,
    heading: basicNodes.heading,
    code_block: basicNodes.code_block,
    ordered_list: { ...orderedList, content: "list_item+", group: "block" },
    bullet_list: { ...bulletList, content: "list_item+", group: "block" },
    list_item: { ...listItem, content: "paragraph block*" },
    text: basicNodes.text,
    image: basicNodes.image,
    hard_break: basicNodes.hard_break,
  },
  marks,
});
const MyEditor = forwardRef<
  MyEditorHandle,
  {
    value: string;
    onChange?: (value: string) => void;
    isLocked?: boolean;
  }
>(function MyEditor({ value, onChange, isLocked = false }, ref) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [isFocused, setIsFocused] = useState(false);
  const lastEditorValueRef = useRef<string | null>(null);
  const isApplyingExternalUpdateRef = useRef(false);
  const pendingExternalValueRef = useRef<string | null>(null);

  const buildAIChangeTransaction = (changes: AIChange[], baseDoc?: PMNode) => {
    const view = viewRef.current;
    if (!view && !baseDoc) {
      console.warn("applyAIChanges: editor view not ready");
      return null;
    }

    // Apply delete/replace from bottom to top, then inserts from top to bottom
    const sorted = [
      ...changes
        .filter((c) => c.type !== "insert")
        .sort((a, b) => b.line - a.line),
      ...changes
        .filter((c) => c.type === "insert")
        .sort((a, b) => a.line - b.line),
    ];

    let tr = baseDoc
      ? EditorState.create({ doc: baseDoc, schema: mySchema }).tr
      : view!.state.tr;

    for (const change of sorted) {
      const doc = tr.doc;
      const childCount = doc.childCount;
      // line is 1-indexed, index is 0-indexed
      const idx = change.line - 1;

      if (change.type === "delete") {
        if (idx < 0 || idx >= childCount) continue;
        const child = doc.child(idx);
        let pos = 0;
        for (let i = 0; i < idx; i++) pos += doc.child(i).nodeSize;
        tr = tr.delete(pos, pos + child.nodeSize);
      } else if (change.type === "replace") {
        if (idx < 0 || idx >= childCount) continue;
        const child = doc.child(idx);
        let pos = 0;
        for (let i = 0; i < idx; i++) pos += doc.child(i).nodeSize;

        // Parse the new content as HTML → ProseMirror fragment
        const html = marked.parse(change.content) as string;
        const temp = document.createElement("div");
        temp.innerHTML = html;
        const parsed = DOMParser.fromSchema(mySchema).parse(temp);
        tr = tr.replaceWith(pos, pos + child.nodeSize, parsed.content);
      } else if (change.type === "insert") {
        // Insert AFTER the node at `line - 1`.
        // If line is 0 or the doc is empty, insert at the start.
        let pos: number;
        if (idx <= 0 || childCount === 0) {
          pos = 0;
        } else {
          // clamp index to last child
          const clampedIdx = Math.min(idx, childCount) - 1;
          pos = 0;
          for (let i = 0; i <= clampedIdx; i++) pos += doc.child(i).nodeSize;
        }

        const html = marked.parse(change.content) as string;
        const temp = document.createElement("div");
        temp.innerHTML = html;
        const parsed = DOMParser.fromSchema(mySchema).parse(temp);
        tr = tr.insert(pos, parsed.content);
      }
    }

    return tr;
  };

  const parseMarkdownToDoc = (markdown: string) => {
    const html = marked.parse(markdown);
    const temp = document.createElement("div");
    temp.innerHTML = html as string;
    return DOMParser.fromSchema(mySchema).parse(temp);
  };

  const applyExternalValue = (nextValue: string) => {
    const view = viewRef.current;
    if (!view) return;
    if (nextValue === undefined || nextValue === null) return;
    // Get current editor markdown to compare
    const currentMarkdown = customMarkdownSerializer.serialize(view.state.doc);

    // Only skip if both the ref AND current editor content match the incoming value
    if (
      nextValue === lastEditorValueRef.current &&
      nextValue === currentMarkdown
    )
      return;
    try {
      // Convert markdown -> HTML
      const html = marked.parse(nextValue);
      // Parse HTML -> ProseMirror doc
      const parser = DOMParser.fromSchema(mySchema);
      const temp = document.createElement("div");
      temp.innerHTML = html as string;
      const newDoc = parser.parse(temp);

      // Replace the editor content
      isApplyingExternalUpdateRef.current = true;
      const tr = view.state.tr.replaceWith(
        0,
        view.state.doc.content.size,
        newDoc.content,
      );

      view.dispatch(tr);
      lastEditorValueRef.current = nextValue;
    } catch (err) {
      console.error("Markdown parsing failed:", err);
    } finally {
      isApplyingExternalUpdateRef.current = false;
    }
  };

  // ── Expose applyAIChanges to parent via ref ──
  useImperativeHandle(
    ref,
    () => ({
      applyAIChanges(changes: AIChange[]) {
        const view = viewRef.current;
        if (!view) return;

        const tr = buildAIChangeTransaction(changes);
        if (tr?.docChanged) view.dispatch(tr);
      },
      getMarkdownAfterAIChanges(changes: AIChange[]) {
        const view = viewRef.current;
        if (!view) return null;

        const tr = buildAIChangeTransaction(changes);
        if (!tr?.docChanged) return null;

        return customMarkdownSerializer.serialize(tr.doc);
      },
      getMarkdownAfterAIChangesFromBase(
        baseMarkdown: string,
        changes: AIChange[],
      ) {
        if (!baseMarkdown) return null;
        const baseDoc = parseMarkdownToDoc(baseMarkdown);
        const tr = buildAIChangeTransaction(changes, baseDoc);
        if (!tr?.docChanged) return null;

        return customMarkdownSerializer.serialize(tr.doc);
      },
    }),
    [],
  );
  useEffect(() => {
    if (!editorRef.current) return;

    const handleInternalChange = (md: string) => {
      lastEditorValueRef.current = md;
      if (!isApplyingExternalUpdateRef.current) {
        onChange?.(md);
      }
    };

    const state = createEditorState(
      mySchema,
      viewRef,
      null,
      handleInternalChange,
    );

    const toolLink = document.querySelectorAll("tool-link");

    toolLink.forEach((el) => {
      if (!(el instanceof HTMLButtonElement)) return;
      el.disabled = true;
    });
    const view = new EditorView(editorRef.current, {
      state,
      attributes: {
        class: "prose-editor",
      },
      handleDOMEvents: {
        focus: () => {
          setIsFocused(true);
          return false;
        },
        blur: () => {
          setIsFocused(false);
          return false;
        },
      },
      handlePaste(view, event, slice) {
        const text = event.clipboardData?.getData("text/plain");
        if (text) {
          const html = marked.parse(text) as string;
          const temp = document.createElement("div");
          temp.innerHTML = html;
          const parsedDoc = DOMParser.fromSchema(mySchema).parse(temp);
          const tr = view.state.tr.replaceSelection(
            new Slice(parsedDoc.content, 0, 0),
          );
          view.dispatch(tr);
          return true;
        }
        return false;
      },

      dispatchTransaction: (transaction) => {
        const newState = view.state.apply(transaction);
        view.updateState(newState);
        const isContentSelected = view.state.selection.empty;
        const toolLink = document.querySelectorAll("tool-link");

        toolLink.forEach((el) => {
          if (!(el instanceof HTMLButtonElement)) return;
          el.disabled = isContentSelected;
        });

        // Map and log all marks with name and active status
        const allMarks = Object.keys(mySchema.marks).map((markName) => ({
          name: markName,
          active: markActive(view.state, mySchema.marks[markName]),
        }));
        allMarks.forEach((item) => {
          if (item.active) toolMarkActive(`tool-${item.name}`);
          else toolMarkInactive(`tool-${item.name}`);
        });

        // Map and log all node tools with active status
        const { $head } = view.state.selection;
        const currentNode = $head.parent;

        // Helper function to check if we're inside a specific node type
        const isInsideNode = (nodeType: any) => {
          for (let d = $head.depth; d > 0; d--) {
            if ($head.node(d).type === nodeType) {
              return true;
            }
          }
          return false;
        };

        // Helper function to check if we're inside a list
        const isInsideList = (listType: any) => {
          for (let d = $head.depth; d > 0; d--) {
            const node = $head.node(d);
            if (node.type === listType) {
              return true;
            }
          }
          return false;
        };

        const allNodes = [
          {
            name: "paragraph",
            active:
              currentNode.type === mySchema.nodes.paragraph &&
              !isInsideNode(mySchema.nodes.blockquote) &&
              !isInsideList(mySchema.nodes.bullet_list) &&
              !isInsideList(mySchema.nodes.ordered_list),
          },
          {
            name: "heading1",
            active:
              currentNode.type === mySchema.nodes.heading &&
              currentNode.attrs.level === 1,
          },
          {
            name: "heading2",
            active:
              currentNode.type === mySchema.nodes.heading &&
              currentNode.attrs.level === 2,
          },
          {
            name: "heading3",
            active:
              currentNode.type === mySchema.nodes.heading &&
              currentNode.attrs.level === 3,
          },

          {
            name: "code_block",
            active: currentNode.type === mySchema.nodes.code_block,
          },
          {
            name: "blockquote",
            active: isInsideNode(mySchema.nodes.blockquote),
          },
          {
            name: "bullet_list",
            active: isInsideList(mySchema.nodes.bullet_list),
          },
          {
            name: "ordered_list",
            active: isInsideList(mySchema.nodes.ordered_list),
          },
        ];

        allNodes.forEach((item) => {
          if (item.active) toolMarkActive(`tool-${item.name}`);
          else toolMarkInactive(`tool-${item.name}`);
        });

        const updateHandler = new Event("editorStateChange");
        view.dom.dispatchEvent(updateHandler);
      },
    });

    viewRef.current = view;
    if (pendingExternalValueRef.current !== null) {
      applyExternalValue(pendingExternalValueRef.current);
      pendingExternalValueRef.current = null;
    }

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
      }
    };
  }, []);
  useEffect(() => {
    if (value === undefined || value === null) return;
    if (!viewRef.current) {
      pendingExternalValueRef.current = value;
      return;
    }
    pendingExternalValueRef.current = null;
    applyExternalValue(value);
  }, [value]);
  useEffect(() => {
    if (!viewRef.current) return;
    viewRef.current.setProps({
      editable: () => !isLocked,
    });
    viewRef.current.dom.setAttribute(
      "aria-disabled",
      isLocked ? "true" : "false",
    );
  }, [isLocked]);
  return (
    <div
      className={`h-fit border transition-colors duration-200 group ${
        isFocused ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <MyEditorToolbar
        viewRef={viewRef}
        mySchema={mySchema}
        isFocused={isFocused}
        isLocked={isLocked}
      />

      <div
        ref={editorRef}
        spellCheck={false}
        className={isLocked ? "pointer-events-none opacity-80" : undefined}
      />
    </div>
  );
});

export default MyEditor;
