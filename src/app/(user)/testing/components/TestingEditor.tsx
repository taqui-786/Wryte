"use client";
import React, { useEffect, useRef, useState } from "react";
import { EditorView } from "prosemirror-view";
import { createEditorState } from "./TestingEditorConfig";
import { EditorState, PluginKey } from "prosemirror-state";
import { MarkType } from "prosemirror-model";
import {
  TestingToolbar,
  toolMarkActive,
  toolMarkInactive,
} from "./TestingToolbar";
import { nodes as basicNodes, marks } from "./prosemirrorSchema";
import { Schema } from "prosemirror-model";
import { orderedList, bulletList, listItem } from "prosemirror-schema-list";

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
function TestingEditor() {
  const editorRef = useRef<HTMLDivElement>(null);
  const viewRef = useRef<EditorView | null>(null);

  useEffect(() => {
    if (!editorRef.current) return;

    const state = createEditorState(mySchema, viewRef);
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

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">
          ProseMirror Editor with Toolbar
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          A full-featured ProseMirror setup with formatting toolbar
        </p>
      </div>

      <TestingToolbar viewRef={viewRef} mySchema={mySchema} />

      <div ref={editorRef} />
    </div>
  );
}

export default TestingEditor;

export function markActive(state: EditorState, type: MarkType) {
  let { from, $from, to, empty } = state.selection;
  if (empty) return !!type.isInSet(state.storedMarks || $from.marks());
  else return state.doc.rangeHasMark(from, to, type);
}
