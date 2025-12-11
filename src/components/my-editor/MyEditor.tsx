"use client";

import React, { useEffect, useRef, useState } from "react";
import { nodes as basicNodes, marks } from "./myEditorSchema";
import { DOMParser, Schema, Slice } from "prosemirror-model";
import { orderedList, bulletList, listItem } from "prosemirror-schema-list";
import { MyEditorToolbar } from "./MyEditorToolbar";
import { markActive, toolMarkActive, toolMarkInactive } from "./helper";
import { EditorView } from "prosemirror-view";
import { createEditorState } from "./EditorConfig";
import { defaultMarkdownParser } from "prosemirror-markdown";
// @ts-ignore
import "./myEditorStyle.css";
import { marked } from "marked";

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
function MyEditor({
  value,
  onChange,
}: {
  value: string;
  onChange?: (value: string) => void;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);
  const [run, setRun] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  useEffect(() => {
    if (!editorRef.current) return;

    const state = createEditorState(mySchema, viewRef, null, onChange);

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
            new Slice(parsedDoc.content, 0, 0)
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

        const allNodes = [
          {
            name: "paragraph",
            active: currentNode.type === mySchema.nodes.paragraph,
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
            active: currentNode.type === mySchema.nodes.blockquote,
          },
          {
            name: "bullet_list",
            active: currentNode.type === mySchema.nodes.bullet_list,
          },
          {
            name: "ordered_list",
            active: currentNode.type === mySchema.nodes.ordered_list,
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

    return () => {
      if (viewRef.current) {
        viewRef.current.destroy();
      }
    };
  }, []);
  useEffect(() => {
    if (!viewRef.current || !value) return;
    if (run) return;
    setRun(true);
    try {
      // Convert markdown → HTML
      const html = marked.parse(value);
      // Parse HTML → ProseMirror doc
      const parser = DOMParser.fromSchema(mySchema);
      const temp = document.createElement("div");
      temp.innerHTML = html as string;
      const newDoc = parser.parse(temp);

      // Replace the editor content
      const view = viewRef.current;
      const tr = view.state.tr.replaceWith(
        0,
        view.state.doc.content.size,
        newDoc.content
      );

      view.dispatch(tr);
    } catch (err) {
      console.error("Markdown parsing failed:", err);
    }
  }, [value]);
  return (
    <div
      className={`h-fit border transition-colors duration-200 group ${
        isFocused ? "border-primary ring-2 ring-primary/20" : "border-border"
      }`}
    >
      <MyEditorToolbar viewRef={viewRef} mySchema={mySchema} />

      <div ref={editorRef} spellCheck={false} />
    </div>
  );
}

export default MyEditor;
