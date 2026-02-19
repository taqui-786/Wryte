import React from "react";
import { EditorView } from "prosemirror-view";
import { toggleMark, setBlockType, wrapIn, lift } from "prosemirror-commands";
import { undo, redo } from "prosemirror-history";

import { Button } from "@/components/ui/button";
import { wrapInList } from "prosemirror-schema-list";
import EditorLinkPopover from "./EditorLinkPopover";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  CodeIcon,
  CodeSimpleIcon,
  CodeSquareIcon,
  Heading01Icon,
  Heading02Icon,
  Heading03Icon,
  LeftToRightListNumberIcon,
  Loading03Icon,
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

interface TestingToolbarProps {
  viewRef: React.MutableRefObject<EditorView | null>;
  mySchema: any;
  isFocused: boolean;
  isLocked?: boolean;
}

export function MyEditorToolbar({
  viewRef,
  mySchema,
  isFocused,
  isLocked = false,
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
          <Button
            type="button"
            onClick={undoAction}
            className={""}
            title="Undo (Ctrl+Z)"
            size={"icon-sm"}
            variant={"ghost"}
            disabled={isDisabled}
          >
            <HugeiconsIcon icon={Undo03Icon} size="16" />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={redoAction}
            className={""}
            title="Redo (Ctrl+Y)"
            disabled={isDisabled}
          >
            <HugeiconsIcon icon={Redo03Icon} size="16" />
          </Button>
        </div>

        <div className="flex gap-1 border-x border-x-border px-2">
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleBold}
            className={"tool-strong"}
            title="Bold (Ctrl+B)"
            disabled={isDisabled}
          >
            <HugeiconsIcon icon={TextBoldIcon} size="16" />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleItalic}
            className={"tool-em"}
            title="Italic (Ctrl+I)"
            disabled={isDisabled}
          >
            <HugeiconsIcon icon={TextItalicIcon} size="16" />
          </Button>

          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleUnderline}
            className={"tool-underline"}
            title="underline (Ctrl+`)"
            disabled={isDisabled}
          >
            <HugeiconsIcon icon={TextUnderlineIcon} size="16" />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleStrike}
            className={"tool-strike"}
            title="strike (Ctrl+`)"
            disabled={isDisabled}
          >
            <HugeiconsIcon icon={TextStrikethroughIcon} size="16" />
          </Button>
          <EditorLinkPopover
            viewRef={viewRef}
            mySchema={mySchema}
            isLocked={isDisabled}
          />
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleCode}
            className={"tool-code"}
            title="Inline Code (Ctrl+`)"
            disabled={isDisabled}
          >
            <HugeiconsIcon icon={CodeSimpleIcon} size="16" />
          </Button>
        </div>

        <div className="flex gap-1 border-r border-r-border pr-2">
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={() => toggleHeading(1)}
            className={"tool-heading1"}
            title="Heading 1"
            disabled={isDisabled}
          >
            <HugeiconsIcon icon={Heading01Icon} size="16" />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={() => toggleHeading(2)}
            className={"tool-heading2"}
            title="Heading 2"
            disabled={isDisabled}
          >
            <HugeiconsIcon icon={Heading02Icon} size="16" />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={() => toggleHeading(3)}
            className={"tool-heading3"}
            title="Heading 2"
            disabled={isDisabled}
          >
            <HugeiconsIcon icon={Heading03Icon} size="16" />
          </Button>
        </div>
        <div className="flex gap-1 border-r border-r-border pr-2">
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleNumberedList}
            className={"tool-ordered_list"}
            title="Number List"
            disabled={isDisabled}
          >
            <HugeiconsIcon icon={LeftToRightListNumberIcon} size="16" />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleBulletedList}
            className={"tool-bullet_list"}
            title="Number List"
            disabled={isDisabled}
          >
            <HugeiconsIcon icon={ParagraphBulletsPoint01Icon} size="16" />
          </Button>
        </div>
        <div className="flex gap-1 pr-2 ">
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleCodeBlock}
            className={"tool-code_block"}
            title="Inline Code (Ctrl+`)"
            disabled={isDisabled}
          >
            <HugeiconsIcon icon={SourceCodeSquareIcon} size="16" />
          </Button>

          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleQuote}
            className={"tool-blockquote"}
            title="Quote"
            disabled={isDisabled}
          >
            <HugeiconsIcon icon={QuoteDownIcon} size="16" />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleDivider}
            className={"tool-hr"}
            title="Number List"
            disabled={isDisabled}
          >
            <HugeiconsIcon icon={MinusSignIcon} size="16" />
          </Button>
        </div>
      </div>
      <div className="flex items-center justify-center">
        {isLocked && (
          <HugeiconsIcon
            icon={Loading03Icon}
            className="size-5 animate-spin text-primary"
          />
        )}
      </div>
    </div>
  );
}
