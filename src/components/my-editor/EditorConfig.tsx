import { EditorState, Plugin } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import { keymap } from "prosemirror-keymap";
import { baseKeymap, toggleMark } from "prosemirror-commands";
import { history, undo, redo } from "prosemirror-history";
import { autocompletePlugin, placeholderPlugin } from "./MyPlugins";
import { dropCursor } from "prosemirror-dropcursor";
import { gapCursor } from "prosemirror-gapcursor";
import { buildInputRules } from "./EditorInputRules";
import { selectionSizeTooltipPlugin } from "./EditorSelectionMenu";
import {
  splitListItem,
  liftListItem,
  sinkListItem,
} from "prosemirror-schema-list";
import { DOMParser } from "prosemirror-model";
import {
  defaultMarkdownParser,
  defaultMarkdownSerializer,
  MarkdownSerializer,
} from "prosemirror-markdown";

// Create a custom markdown serializer that supports underline and strike marks
export const customMarkdownSerializer = new MarkdownSerializer(
  {
    ...defaultMarkdownSerializer.nodes,
  },
  {
    ...defaultMarkdownSerializer.marks,
    underline: {
      open: "<u>",
      close: "</u>",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
    strike: {
      open: "~~",
      close: "~~",
      mixable: true,
      expelEnclosingWhitespace: true,
    },
  },
);
export function createEditorState(
  mySchema: any,
  viewRef: React.MutableRefObject<any>,
  defaultContent?: string | null,
  onChange?: (json: any) => void,
) {
  let startDoc: any;

  if (defaultContent) {
    // 1. JSON
    if (typeof defaultContent === "object") {
      startDoc = mySchema.nodeFromJSON(defaultContent);
    }

    // 2. Markdown string
    else if (
      (typeof defaultContent === "string" &&
        defaultContent.trim().startsWith("#")) ||
      defaultContent.includes("*") ||
      defaultContent.includes("- ")
    ) {
      try {
        // use markdown parser
        startDoc = defaultMarkdownParser.parse(defaultContent);
      } catch (err) {
        console.error("Markdown parse failed, using fallback HTML parser", err);

        const parser = DOMParser.fromSchema(mySchema);
        const element = document.createElement("div");
        element.innerHTML = defaultContent;
        startDoc = parser.parse(element);
      }
    }

    // 3. HTML string
    else if (typeof defaultContent === "string") {
      const parser = DOMParser.fromSchema(mySchema);
      const element = document.createElement("div");
      element.innerHTML = defaultContent;
      startDoc = parser.parse(element);
    }
  }

  // fallback empty document
  if (!startDoc) {
    startDoc = mySchema.node("doc", null, [mySchema.node("paragraph")]);
  }

  const editorKeymap = keymap({
    "Mod-z": (state, dispatch) => {
      if (viewRef.current) {
        const result = undo(state, dispatch);
        if (result) viewRef.current.focus();
        return result;
      }
      return false;
    },
    "Mod-y": (state, dispatch) => {
      if (viewRef.current) {
        const result = redo(state, dispatch);
        if (result) viewRef.current.focus();
        return result;
      }
      return false;
    },
    "Mod-b": (state, dispatch) => {
      if (viewRef.current) {
        const result = toggleMark(mySchema.marks.strong)(state, dispatch);
        if (result) viewRef.current.focus();
        return result;
      }
      return false;
    },
    "Mod-i": (state, dispatch) => {
      if (viewRef.current) {
        const result = toggleMark(mySchema.marks.em)(state, dispatch);
        if (result) viewRef.current.focus();
        return result;
      }
      return false;
    },
    "Mod-`": (state, dispatch) => {
      if (viewRef.current) {
        const result = toggleMark(mySchema.marks.code)(state, dispatch);
        if (result) viewRef.current.focus();
        return result;
      }
      return false;
    },
  });

  // Plugin that adds data-line="N" attributes to every top-level block node
  const dataLinePlugin = new Plugin({
    props: {
      decorations(state) {
        const decorations: Decoration[] = [];
        let lineNumber = 1;
        state.doc.forEach((node, pos) => {
          decorations.push(
            Decoration.node(pos, pos + node.nodeSize, {
              "data-line": String(lineNumber),
            }),
          );
          lineNumber++;
        });
        return DecorationSet.create(state.doc, decorations);
      },
    },
  });

  const toolbarUpdatePlugin = new Plugin({
    view(editorView) {
      return {
        update() {
          if (viewRef.current) {
            const updateEvent = new Event("editorStateChange");
            viewRef.current.dom.dispatchEvent(updateEvent);
          }
          if (typeof onChange === "function") {
            const md = customMarkdownSerializer.serialize(editorView.state.doc);

            onChange(md);
          }
        },
      };
    },
  });

  return EditorState.create({
    doc: startDoc,
    plugins: [
      history(),
      buildInputRules(mySchema),
      //   menuBar({ floating: true, content: buildMenuItems(mySchema).fullMenu }), // just for tesing
      editorKeymap,
      keymap({
        Enter: splitListItem(mySchema.nodes.list_item),
        "Mod-[": liftListItem(mySchema.nodes.list_item),
        "Mod-]": sinkListItem(mySchema.nodes.list_item),
      }),
      keymap(baseKeymap),
      dropCursor(),
      placeholderPlugin("Let's start writing your document..."),
      autocompletePlugin(mySchema),
      gapCursor(),
      dataLinePlugin,
      toolbarUpdatePlugin,
      selectionSizeTooltipPlugin,
    ],
  });
}
