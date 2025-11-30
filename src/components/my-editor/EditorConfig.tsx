import { EditorState, Plugin } from "prosemirror-state";
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

export function createEditorState(
  mySchema: any,
  viewRef: React.MutableRefObject<any>
) {
  const startDoc = mySchema.node("doc", null, [mySchema.node("paragraph")]);

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

  const toolbarUpdatePlugin = new Plugin({
    view() {
      return {
        update() {
          if (viewRef.current) {
            const updateEvent = new Event("editorStateChange");
            viewRef.current.dom.dispatchEvent(updateEvent);
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
        "Enter": splitListItem(mySchema.nodes.list_item),
        "Mod-[": liftListItem(mySchema.nodes.list_item),
        "Mod-]": sinkListItem(mySchema.nodes.list_item),
      }),
      keymap(baseKeymap),
      dropCursor(),
      placeholderPlugin("Let's start writing your document..."),
      autocompletePlugin(),
      gapCursor(),
      toolbarUpdatePlugin,
      selectionSizeTooltipPlugin,
    ],
  });
}
