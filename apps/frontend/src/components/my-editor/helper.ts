import { EditorState } from "prosemirror-state";
import { buttonVariants } from "../ui/button";
import { MarkType } from "prosemirror-model";

export function toolMarkActive(toolId: string) {
  const selector =
    toolId.startsWith(".") || toolId.startsWith("#") ? toolId : `.${toolId}`;

  const toolElements = document.querySelectorAll(selector);

  toolElements.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;

    const newClasses = buttonVariants({
      variant: "default",
      size: "icon-sm",
    });

    el.className = ` ${newClasses} ${toolId}`;
  });
}
export function toolMarkInactive(toolId: string) {
  const selector =
    toolId.startsWith(".") || toolId.startsWith("#") ? toolId : `.${toolId}`;

  const toolElements = document.querySelectorAll(selector);

  toolElements.forEach((el) => {
    if (!(el instanceof HTMLElement)) return;

    const newClasses = buttonVariants({
      variant: "ghost",
      size: "icon-sm",
    });

    el.className = ` ${newClasses} ${toolId}`;
  });
}

export function markActive(state: EditorState, type: MarkType) {
  let { from, $from, to, empty } = state.selection;
  if (empty) return !!type.isInSet(state.storedMarks || $from.marks());
  else return state.doc.rangeHasMark(from, to, type);
}
