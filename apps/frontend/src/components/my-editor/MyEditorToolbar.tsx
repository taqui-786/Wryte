import {
  CheckmarkCircle02Icon,
  CloudUploadIcon,
  CodeIcon,
  CodeSimpleIcon,
  CodeSquareIcon,
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  LeftToRightListNumberIcon,
  MinusSignIcon,
  ParagraphBulletsPoint01Icon,
  QuoteDownIcon,
  Redo03Icon,
  SourceCodeSquareIcon,
  TextBoldIcon,
  TextItalicIcon,
  TextStrikethroughIcon,
  TextUnderlineIcon,
  Undo03Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { lift, setBlockType, toggleMark, wrapIn } from "prosemirror-commands";
import { redo, undo } from "prosemirror-history";
import { wrapInList } from "prosemirror-schema-list";
import type { EditorView } from "prosemirror-view";
import type React from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import EditorLinkPopover from "./EditorLinkPopover";

interface TestingToolbarProps {
  viewRef: React.MutableRefObject<EditorView | null>;
  mySchema: any;
  isFocused: boolean;
  isLocked?: boolean;
  autosaveEnabled?: boolean;
  onToggleAutosave?: () => void;
  onSaveNow?: () => Promise<void> | void;
  isSaving?: boolean;
  hasUnsavedChanges?: boolean;
}

// Prevent editor from losing focus when clicking toolbar buttons
const preventFocusLoss = (e: React.MouseEvent) => {
  e.preventDefault();
};

export function MyEditorToolbar({
  viewRef,
  mySchema,
  isFocused,
  isLocked = false,
  autosaveEnabled = true,
  onToggleAutosave,
  onSaveNow,
  isSaving = false,
  hasUnsavedChanges = false,
}: TestingToolbarProps) {
  const isDisabled = isLocked;
  const toggleBold = () => {
    if (isDisabled) return false;
    if (viewRef.current) {
      const result = toggleMark(mySchema.marks.strong)(
        viewRef.current.state,
        viewRef.current.dispatch,
      );
      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };

  const toggleItalic = () => {
    if (isDisabled) return false;
    if (viewRef.current) {
      const result = toggleMark(mySchema.marks.em)(
        viewRef.current.state,
        viewRef.current.dispatch,
      );
      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };

  const toggleCode = () => {
    if (isDisabled) return false;
    if (viewRef.current) {
      const result = toggleMark(mySchema.marks.code)(
        viewRef.current.state,
        viewRef.current.dispatch,
      );
      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };
  const toggleCodeBlock = () => {
    if (isDisabled) return false;
    if (viewRef.current) {
      const { $head } = viewRef.current.state.selection;
      const node = $head.parent;
      const codeBlockNode = mySchema.nodes.code_block;
      const paragraphNode = mySchema.nodes.paragraph;

      let result: boolean;
      if (node.type === codeBlockNode) {
        // If already a code block, toggle to paragraph
        result = setBlockType(paragraphNode)(
          viewRef.current.state,
          viewRef.current.dispatch,
        );
      } else {
        // Otherwise, set to code block
        result = setBlockType(codeBlockNode)(
          viewRef.current.state,
          viewRef.current.dispatch,
        );
      }

      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };
  const toggleUnderline = () => {
    if (isDisabled) return false;
    if (viewRef.current) {
      const result = toggleMark(mySchema.marks.underline)(
        viewRef.current.state,
        viewRef.current.dispatch,
      );
      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };
  const toggleStrike = () => {
    if (isDisabled) return false;
    if (viewRef.current) {
      const result = toggleMark(mySchema.marks.strike)(
        viewRef.current.state,
        viewRef.current.dispatch,
      );
      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };

  const toggleHeading = (level: 1 | 2 | 3) => {
    if (isDisabled) return false;
    if (viewRef.current) {
      const { $head } = viewRef.current.state.selection;
      const node = $head.parent;
      const headingNode = mySchema.nodes.heading;
      const paragraphNode = mySchema.nodes.paragraph;

      let result: boolean;
      if (node.type === headingNode && node.attrs.level === level) {
        result = setBlockType(paragraphNode)(
          viewRef.current.state,
          viewRef.current.dispatch,
        );
      } else {
        result = setBlockType(headingNode, { level })(
          viewRef.current.state,
          viewRef.current.dispatch,
        );
      }

      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };

  const undoAction = () => {
    if (isDisabled) return false;
    if (viewRef.current) {
      const result = undo(viewRef.current.state, viewRef.current.dispatch);
      if (result) viewRef.current.focus();
      return result;
    }
    return false;
  };

  const redoAction = () => {
    if (isDisabled) return false;
    if (viewRef.current) {
      const result = redo(viewRef.current.state, viewRef.current.dispatch);
      if (result) viewRef.current.focus();
      return result;
    }
    return false;
  };
  const toggleNumberedList = () => {
    if (isDisabled) return false;
    if (viewRef.current) {
      const { $head } = viewRef.current.state.selection;

      let inOrderedList = false;
      for (let d = $head.depth; d > 0; d--) {
        if ($head.node(d).type === mySchema.nodes.ordered_list) {
          inOrderedList = true;
          break;
        }
      }

      let result: boolean;
      if (inOrderedList) {
        const { liftListItem } = require("prosemirror-schema-list");
        result = liftListItem(mySchema.nodes.list_item)(
          viewRef.current.state,
          viewRef.current.dispatch,
        );
      } else {
        const command = wrapInList(mySchema.nodes.ordered_list);
        result = command(viewRef.current.state, viewRef.current.dispatch);
      }

      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };
  const toggleBulletedList = () => {
    if (isDisabled) return false;
    if (viewRef.current) {
      const { $head } = viewRef.current.state.selection;

      // Check if we're already in a bullet list
      let inBulletList = false;
      for (let d = $head.depth; d > 0; d--) {
        if ($head.node(d).type === mySchema.nodes.bullet_list) {
          inBulletList = true;
          break;
        }
      }

      let result: boolean;
      if (inBulletList) {
        // If already in a bullet list, lift out of it
        const { liftListItem } = require("prosemirror-schema-list");
        result = liftListItem(mySchema.nodes.list_item)(
          viewRef.current.state,
          viewRef.current.dispatch,
        );
      } else {
        // Otherwise, wrap in bullet list
        const command = wrapInList(mySchema.nodes.bullet_list);
        result = command(viewRef.current.state, viewRef.current.dispatch);
      }

      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };
  const toggleQuote = () => {
    if (isDisabled) return false;
    if (viewRef.current) {
      const isInBlockquote = () => {
        for (let d = viewRef.current!.state.selection.$head.depth; d > 0; d--) {
          if (
            viewRef.current!.state.selection.$head.node(d).type ===
            mySchema.nodes.blockquote
          ) {
            return true;
          }
        }
        return false;
      };

      const command = isInBlockquote()
        ? lift
        : wrapIn(mySchema.nodes.blockquote);
      const result = command(viewRef.current.state, viewRef.current.dispatch);

      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };
  const toggleDivider = () => {
    if (isDisabled) return false;
    if (viewRef.current) {
      const command = (state: any, dispatch: any) => {
        if (dispatch) {
          dispatch(
            state.tr
              .replaceSelectionWith(mySchema.nodes.horizontal_rule.create())
              .scrollIntoView(),
          );
        }
        return true;
      };
      const result = command(viewRef.current.state, viewRef.current.dispatch);

      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };

  return (
    <div
      className={`border-b   rounded-none px-3 py-2 bg-background flex items-center justify-between ${
        isFocused ? "border-b-primary " : "border-b-border "
      }`}
    >
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 mr-4">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                onClick={undoAction}
                onMouseDown={preventFocusLoss}
                className={""}
                size={"icon-sm"}
                variant={"ghost"}
                disabled={isDisabled}
              >
                <HugeiconsIcon icon={Undo03Icon} size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Undo (Ctrl+Z)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size={"icon-sm"}
                variant={"ghost"}
                type="button"
                onClick={redoAction}
                onMouseDown={preventFocusLoss}
                className={""}
                disabled={isDisabled}
              >
                <HugeiconsIcon icon={Redo03Icon} size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Redo (Ctrl+Y)</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex gap-1 border-x border-x-border px-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size={"icon-sm"}
                variant={"ghost"}
                type="button"
                onClick={toggleBold}
                onMouseDown={preventFocusLoss}
                className={"tool-strong"}
                disabled={isDisabled}
              >
                <HugeiconsIcon icon={TextBoldIcon} size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bold (Ctrl+B)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size={"icon-sm"}
                variant={"ghost"}
                type="button"
                onClick={toggleItalic}
                onMouseDown={preventFocusLoss}
                className={"tool-em"}
                disabled={isDisabled}
              >
                <HugeiconsIcon icon={TextItalicIcon} size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Italic (Ctrl+I)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size={"icon-sm"}
                variant={"ghost"}
                type="button"
                onClick={toggleUnderline}
                onMouseDown={preventFocusLoss}
                className={"tool-underline"}
                disabled={isDisabled}
              >
                <HugeiconsIcon icon={TextUnderlineIcon} size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Underline (Ctrl+U)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size={"icon-sm"}
                variant={"ghost"}
                type="button"
                onClick={toggleStrike}
                onMouseDown={preventFocusLoss}
                className={"tool-strike"}
                disabled={isDisabled}
              >
                <HugeiconsIcon icon={TextStrikethroughIcon} size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Strikethrough (Ctrl+D)</TooltipContent>
          </Tooltip>
          <EditorLinkPopover
            viewRef={viewRef}
            mySchema={mySchema}
            isLocked={isDisabled}
          />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size={"icon-sm"}
                variant={"ghost"}
                type="button"
                onClick={toggleCode}
                onMouseDown={preventFocusLoss}
                className={"tool-code"}
                disabled={isDisabled}
              >
                <HugeiconsIcon icon={CodeSimpleIcon} size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Inline Code (Ctrl+`)</TooltipContent>
          </Tooltip>
        </div>

        <div className="flex gap-1 border-r border-r-border pr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size={"icon-sm"}
                variant={"ghost"}
                type="button"
                onClick={() => toggleHeading(1)}
                onMouseDown={preventFocusLoss}
                className={"tool-heading1"}
                disabled={isDisabled}
              >
                <HugeiconsIcon icon={Heading01Icon} size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Heading 1 (Ctrl+Alt+1)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size={"icon-sm"}
                variant={"ghost"}
                type="button"
                onClick={() => toggleHeading(2)}
                onMouseDown={preventFocusLoss}
                className={"tool-heading2"}
                disabled={isDisabled}
              >
                <HugeiconsIcon icon={Heading02Icon} size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Heading 2 (Ctrl+Alt+2)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size={"icon-sm"}
                variant={"ghost"}
                type="button"
                onClick={() => toggleHeading(3)}
                onMouseDown={preventFocusLoss}
                className={"tool-heading3"}
                disabled={isDisabled}
              >
                <HugeiconsIcon icon={Heading03Icon} size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Heading 3 (Ctrl+Alt+3)</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex gap-1 border-r border-r-border pr-2">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size={"icon-sm"}
                variant={"ghost"}
                type="button"
                onClick={toggleNumberedList}
                onMouseDown={preventFocusLoss}
                className={"tool-ordered_list"}
                disabled={isDisabled}
              >
                <HugeiconsIcon icon={LeftToRightListNumberIcon} size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Numbered List (Ctrl+Shift+7)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size={"icon-sm"}
                variant={"ghost"}
                type="button"
                onClick={toggleBulletedList}
                onMouseDown={preventFocusLoss}
                className={"tool-bullet_list"}
                disabled={isDisabled}
              >
                <HugeiconsIcon icon={ParagraphBulletsPoint01Icon} size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Bullet List (Ctrl+Shift+8)</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex gap-1 pr-2 ">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size={"icon-sm"}
                variant={"ghost"}
                type="button"
                onClick={toggleCodeBlock}
                onMouseDown={preventFocusLoss}
                className={"tool-code_block"}
                disabled={isDisabled}
              >
                <HugeiconsIcon icon={SourceCodeSquareIcon} size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Code Block (Ctrl+Shift+C)</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size={"icon-sm"}
                variant={"ghost"}
                type="button"
                onClick={toggleQuote}
                onMouseDown={preventFocusLoss}
                className={"tool-blockquote"}
                disabled={isDisabled}
              >
                <HugeiconsIcon icon={QuoteDownIcon} size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Blockquote (Ctrl+Shift+B)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                size={"icon-sm"}
                variant={"ghost"}
                type="button"
                onClick={toggleDivider}
                onMouseDown={preventFocusLoss}
                className={"tool-hr"}
                disabled={isDisabled}
              >
                <HugeiconsIcon icon={MinusSignIcon} size="16" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Horizontal Rule (Ctrl+Shift+H)</TooltipContent>
          </Tooltip>
        </div>
      </div>
      <div className="flex items-center gap-2 pl-2 ml-auto">
        {/* Saving indicator: spinner while saving, check when recently saved */}
        {isSaving ? (
          <Tooltip>
            <TooltipTrigger asChild>
              <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <Spinner className="size-4 text-primary" />
                <span className="hidden sm:inline">Saving…</span>
              </span>
            </TooltipTrigger>
            <TooltipContent>Saving changes</TooltipContent>
          </Tooltip>
        ) : (
          !hasUnsavedChanges && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                  {/* <HugeiconsIcon
                    icon={CheckmarkCircle02Icon}
                    size="16"
                    className="text-emerald-500"
                  /> */}
                  <span className="hidden sm:inline text-primary">Saved</span>
                </span>
              </TooltipTrigger>
              <TooltipContent>All changes saved</TooltipContent>
            </Tooltip>
          )
        )}

        {/* Manual "Save changes" button — only visible when autosave is OFF */}
        {!autosaveEnabled && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant={hasUnsavedChanges ? "default" : "outline"}
                onClick={() => onSaveNow?.()}
                disabled={isSaving || !hasUnsavedChanges}
                onMouseDown={preventFocusLoss}
                className="gap-1.5"
              >
                <HugeiconsIcon icon={CloudUploadIcon} size="16" />
                <span>Save changes</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent>Save changes now (Ctrl+S)</TooltipContent>
          </Tooltip>
        )}

        {/* Autosave on/off toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="flex items-center gap-1.5">
              <Label
                htmlFor="autosave-toggle"
                className="text-xs text-muted-foreground cursor-pointer hidden sm:inline"
              >
                Auto-save
              </Label>
              <Switch
                id="autosave-toggle"
                checked={autosaveEnabled}
                onCheckedChange={onToggleAutosave}
                disabled={isSaving}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            {autosaveEnabled ? "Auto-save is ON" : "Auto-save is OFF"}
          </TooltipContent>
        </Tooltip>
      </div>
    </div>
  );
}
