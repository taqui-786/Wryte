import { Plugin, PluginKey, TextSelection } from "prosemirror-state";
import type { EditorView } from "prosemirror-view";
import { createRoot, Root } from "react-dom/client";
import { Button } from "@/components/ui/button";
import { Bold, Code, Italic, Strikethrough, Underline } from "lucide-react";
import { toggleMark } from "prosemirror-commands";
import EditorLinkPopover from "./EditorLinkPopover";
import { toolMarkInactive } from "./helper";
import {
  BoldSolid,
  CodeSolid,
  ItalicsSolid,
  StrikeThroughSolid,
  UnderlineSolid,
} from "./editorIcons";

class SelectionSizeTooltip {
  tooltip: HTMLDivElement;
  root: Root;
  view: EditorView;

  constructor(view: EditorView) {
    this.view = view;

    // Create tooltip container
    this.tooltip = document.createElement("div");
    this.tooltip.className =
      "absolute bg-card border text-xs px-2 py-1 rounded shadow tooltip";
    this.tooltip.style.position = "absolute";
    this.tooltip.style.zIndex = "100";

    const parent = view.dom.parentNode as HTMLElement;
    parent.appendChild(this.tooltip);

    // Mount React root inside tooltip
    this.root = createRoot(this.tooltip);

    // Initial render
    this.root.render(
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="sm">
          0
        </Button>
      </div>
    );

    this.update(view, null);
  }

  update(view: EditorView, lastState: any) {
    const state = view.state;

    // Skip if document and selection didn't change
    if (
      lastState &&
      lastState.doc.eq(state.doc) &&
      lastState.selection.eq(state.selection)
    ) {
      return;
    }

    // Hide tooltip if no selection
    if (state.selection.empty) {
      this.tooltip.style.display = "none";
      return;
    }

    const { from, to, $from } = state.selection;
    // Don't show tooltip in code blocks
    if ($from.parent.type.spec.code) {
      this.tooltip.style.display = "none";
      return;
    }

    // Don't show tooltip if selection has code mark
    const codeMark = state.schema.marks.code;
    if (state.doc.rangeHasMark(from, to, codeMark)) {
      this.tooltip.style.display = "none";
      return;
    }

    // Show tooltip
    this.tooltip.style.display = "block";

    const start = view.coordsAtPos(from);
    const end = view.coordsAtPos(to);
    const box = (
      this.tooltip.offsetParent as HTMLElement
    ).getBoundingClientRect();

    const left = Math.max((start.left + end.left) / 2, start.left + 3);
    this.tooltip.style.left = `${left - box.left}px`;
    this.tooltip.style.bottom = `${box.bottom - start.top + 5}px`;

    const toggleBold = () => {
      const result = toggleMark(this.view.state.schema.marks.strong)(
        this.view.state,
        this.view.dispatch
      );
      if (result) {
        toolMarkInactive("tool-strong");
        const { to } = this.view.state.selection;
        const strongMark = this.view.state.schema.marks.strong;
        let tr = this.view.state.tr;
        tr = tr.setSelection(TextSelection.create(tr.doc, to));
        tr = tr.removeStoredMark(strongMark);
        this.view.dispatch(tr);
        this.view.focus();
      }
      return result;
    };
    const toggleItalic = () => {
      const result = toggleMark(this.view.state.schema.marks.em)(
        this.view.state,
        this.view.dispatch
      );
      if (result) {
        toolMarkInactive("tool-em");
        const { to } = this.view.state.selection;
        const italicMark = this.view.state.schema.marks.em;
        let tr = this.view.state.tr;
        tr = tr.setSelection(TextSelection.create(tr.doc, to));
        tr = tr.removeStoredMark(italicMark);
        this.view.dispatch(tr);
        this.view.focus();
      }
      return result;
    };
    const toggleCode = () => {
      const result = toggleMark(this.view.state.schema.marks.code)(
        this.view.state,
        this.view.dispatch
      );
      if (result) {
        toolMarkInactive("tool-code");
        const { to } = this.view.state.selection;
        const codeMark = this.view.state.schema.marks.code;
        let tr = this.view.state.tr;
        tr = tr.setSelection(TextSelection.create(tr.doc, to));
        tr = tr.removeStoredMark(codeMark);
        this.view.dispatch(tr);
        this.view.focus();
      }
      return result;
    };
    const toggleUnderline = () => {
      const result = toggleMark(this.view.state.schema.marks.underline)(
        this.view.state,
        this.view.dispatch
      );
      if (result) {
        toolMarkInactive("tool-underline");
        const { to } = this.view.state.selection;
        const underlineMark = this.view.state.schema.marks.underline;
        let tr = this.view.state.tr;
        tr = tr.setSelection(TextSelection.create(tr.doc, to));
        tr = tr.removeStoredMark(underlineMark);
        this.view.dispatch(tr);
        this.view.focus();
      }
      return result;
    };
    const toggleStrike = () => {
      const result = toggleMark(this.view.state.schema.marks.strike)(
        this.view.state,
        this.view.dispatch
      );
      if (result) {
        toolMarkInactive("tool-strike");
        const { to } = this.view.state.selection;
        const strikeMark = this.view.state.schema.marks.strike;
        let tr = this.view.state.tr;
        tr = tr.setSelection(TextSelection.create(tr.doc, to));
        tr = tr.removeStoredMark(strikeMark);
        this.view.dispatch(tr);
        this.view.focus();
      }
      return result;
    };
    const linkMarkType = state.schema.marks.link;
    let currentHref = "";

    if (!state.selection.empty) {
      const { from, to } = state.selection;
      state.doc.nodesBetween(from, to, (node) => {
        const linkMark = linkMarkType.isInSet(node.marks);
        if (linkMark) {
          currentHref = linkMark.attrs.href;
          return false; // Stop searching
        }
        return true;
      });
    } else {
      const { $from } = state.selection;
      const marks = state.storedMarks || $from.marks();
      const linkMark = linkMarkType.isInSet(marks);
      if (linkMark) {
        currentHref = linkMark.attrs.href;
      }
    }

    // ✅ React re-render with updated content
    this.root.render(
      <div className="flex items-center gap-1">
        <Button
          size={"icon-sm"}
          variant={"ghost"}
          type="button"
          className="tool-strong"
          onClick={toggleBold}
          title="Bold (Ctrl+B)"
        >
          <BoldSolid size={"16"} />
        </Button>
        <Button
          size={"icon-sm"}
          variant={"ghost"}
          type="button"
          onClick={toggleItalic}
          className={"tool-em"}
          title="Italic (Ctrl+I)"
        >
          <ItalicsSolid size={"16"} />
        </Button>
        <Button
          size={"icon-sm"}
          variant={"ghost"}
          type="button"
          onClick={toggleCode}
          className={"tool-code"}
          title="Inline Code (Ctrl+`)"
        >
          <CodeSolid size={"16"} />
        </Button>
        <Button
          size={"icon-sm"}
          variant={"ghost"}
          type="button"
          onClick={toggleUnderline}
          className={"tool-underline"}
          title="underline (Ctrl+`)"
        >
          <UnderlineSolid size={"16"} />
        </Button>
        <Button
          size={"icon-sm"}
          variant={"ghost"}
          type="button"
          onClick={toggleStrike}
          className={"tool-strike"}
          title="strike (Ctrl+`)"
        >
          <StrikeThroughSolid size={"16"} />
        </Button>
        <EditorLinkPopover
          viewRef={{ current: this.view } as any}
          mySchema={this.view.state.schema}
        />
      </div>
    );
  }

  destroy() {
    // Defer unmount to avoid race condition with React rendering
    setTimeout(() => {
      this.root.unmount();
      this.tooltip.remove();
    }, 0);
  }
}

export const selectionSizeTooltipPlugin = new Plugin({
  key: new PluginKey("selectionSizeTooltipReact"),
  view(editorView) {
    return new SelectionSizeTooltip(editorView);
  },
});
