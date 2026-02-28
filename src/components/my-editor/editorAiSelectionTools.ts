import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import { Decoration, DecorationSet } from "prosemirror-view";
import type { EditorView } from "prosemirror-view";

export type SelectionTransformAction = "shorten" | "expand";

type ProcessingMeta = { from: number; to: number } | null;

export const selectionAiProcessingPluginKey =
  new PluginKey<DecorationSet>("selectionAiProcessingPlugin");

export const selectionAiProcessingPlugin = new Plugin<DecorationSet>({
  key: selectionAiProcessingPluginKey,
  state: {
    init: (_, state) => DecorationSet.empty,
    apply(tr, old) {
      const mapped = old.map(tr.mapping, tr.doc);
      const meta = tr.getMeta(selectionAiProcessingPluginKey) as
        | ProcessingMeta
        | undefined;

      if (meta === undefined) {
        return mapped;
      }

      if (meta === null || meta.from >= meta.to) {
        return DecorationSet.empty;
      }

      return DecorationSet.create(tr.doc, [
        Decoration.inline(meta.from, meta.to, {
          class: "pm-ai-selection-processing",
        }),
      ]);
    },
  },
  props: {
    decorations(state) {
      return selectionAiProcessingPluginKey.getState(state);
    },
  },
});

const setSelectionProcessing = (view: EditorView, range: ProcessingMeta) => {
  const tr = view.state.tr.setMeta(selectionAiProcessingPluginKey, range);
  view.dispatch(tr);
};

const getSelectedText = (view: EditorView) => {
  const { from, to } = view.state.selection;
  return view.state.doc.textBetween(from, to, "\n\n").trim();
};

const truncateText = (text: string, limit: number) =>
  text.length > limit ? text.slice(0, limit) : text;

export const SUMMARY_EVENT_NAME = "wryte:selection-summarize";
export const SUMMARY_TEXT_LIMIT = 4000;
export const readSelectionText = (view: EditorView) =>
  truncateText(getSelectedText(view), SUMMARY_TEXT_LIMIT);

const applyTransformedText = (
  view: EditorView,
  fallbackRange: { from: number; to: number },
  text: string,
) => {
  const decorations = selectionAiProcessingPluginKey.getState(view.state);
  const activeRange = decorations?.find()[0];
  const range = activeRange
    ? { from: activeRange.from, to: activeRange.to }
    : fallbackRange;

  const tr = view.state.tr.insertText(text, range.from, range.to);
  const cursorPos = Math.min(range.from + text.length, tr.doc.content.size);
  tr.setSelection(TextSelection.create(tr.doc, cursorPos));
  view.dispatch(tr);
  view.focus();
};

export const runSelectionTransform = async (
  view: EditorView,
  action: SelectionTransformAction,
): Promise<boolean> => {
  const { from, to, empty } = view.state.selection;
  if (empty) return false;

  const selectedText = getSelectedText(view);
  if (!selectedText) return false;

  const selectedRange = { from, to };
  setSelectionProcessing(view, selectedRange);

  try {
    const response = await fetch("/api/editor-selection-transform", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action,
        text: selectedText,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed selection transform: ${response.status}`);
    }

    const payload = (await response.json()) as {
      text?: string;
    };

    const transformed = payload.text?.trim();
    if (!transformed) {
      return false;
    }

    applyTransformedText(view, selectedRange, transformed);
    return true;
  } catch (error) {
    console.error("Selection transform failed", error);
    return false;
  } finally {
    setSelectionProcessing(view, null);
  }
};
