import React from "react";
import { EditorView } from "prosemirror-view";
import { toggleMark, setBlockType, wrapIn, lift } from "prosemirror-commands";
import { undo, redo } from "prosemirror-history";
import {
  Bold,
  Italic,
  Code,
  Undo2,
  Redo2,
  Heading1,
  Heading2,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading3,
  CodeXml,
  Quote,
  Minus,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { wrapInList } from "prosemirror-schema-list";
import { LinkPopover } from "./LinkPopover";

interface TestingToolbarProps {
  viewRef: React.MutableRefObject<EditorView | null>;
  mySchema: any;
}

export function TestingToolbar({ viewRef, mySchema }: TestingToolbarProps) {
  const toggleBold = () => {
    if (viewRef.current) {
      const result = toggleMark(mySchema.marks.strong)(
        viewRef.current.state,
        viewRef.current.dispatch
      );
      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };

  const toggleItalic = () => {
    if (viewRef.current) {
      const result = toggleMark(mySchema.marks.em)(
        viewRef.current.state,
        viewRef.current.dispatch
      );
      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };

  const toggleCode = () => {
    if (viewRef.current) {
      const result = toggleMark(mySchema.marks.code)(
        viewRef.current.state,
        viewRef.current.dispatch
      );
      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };
  const toggleCodeBlock = () => {
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
          viewRef.current.dispatch
        );
      } else {
        // Otherwise, set to code block
        result = setBlockType(codeBlockNode)(
          viewRef.current.state,
          viewRef.current.dispatch
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
    if (viewRef.current) {
      const result = toggleMark(mySchema.marks.underline)(
        viewRef.current.state,
        viewRef.current.dispatch
      );
      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };
  const toggleStrike = () => {
    if (viewRef.current) {
      const result = toggleMark(mySchema.marks.strike)(
        viewRef.current.state,
        viewRef.current.dispatch
      );
      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };

  const toggleHeading = (level: 1 | 2 | 3) => {
    if (viewRef.current) {
      const { $head } = viewRef.current.state.selection;
      const node = $head.parent;
      const headingNode = mySchema.nodes.heading;
      const paragraphNode = mySchema.nodes.paragraph;

      let result: boolean;
      if (node.type === headingNode && node.attrs.level === level) {
        // If already a heading of the same level, toggle to paragraph
        result = setBlockType(paragraphNode)(
          viewRef.current.state,
          viewRef.current.dispatch
        );
      } else {
        // Otherwise, set to heading with the specified level
        result = setBlockType(headingNode, { level })(
          viewRef.current.state,
          viewRef.current.dispatch
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
    if (viewRef.current) {
      const result = undo(viewRef.current.state, viewRef.current.dispatch);
      if (result) viewRef.current.focus();
      return result;
    }
    return false;
  };

  const redoAction = () => {
    if (viewRef.current) {
      const result = redo(viewRef.current.state, viewRef.current.dispatch);
      if (result) viewRef.current.focus();
      return result;
    }
    return false;
  };
  const toggleNumberedList = () => {
    if (viewRef.current) {
      const command = wrapInList(mySchema.nodes.ordered_list);
      const result = command(viewRef.current.state, viewRef.current.dispatch);

      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };
  const toggleBulletedList = () => {
    if (viewRef.current) {
      const command = wrapInList(mySchema.nodes.bullet_list);
      const result = command(viewRef.current.state, viewRef.current.dispatch);

      if (result) {
        viewRef.current.focus();
      }
      return result;
    }
    return false;
  };
  const toggleQuote = () => {
   if (viewRef.current) {
     const isInBlockquote = () => {
       for (let d = viewRef.current!.state.selection.$head.depth; d > 0; d--) {
         if (viewRef.current!.state.selection.$head.node(d).type === mySchema.nodes.blockquote) {
           return true;
         }
       }
       return false;
     };

     const command = isInBlockquote() ? lift : wrapIn(mySchema.nodes.blockquote);
     const result = command(viewRef.current.state, viewRef.current.dispatch);

     if (result) {
       viewRef.current.focus();
     }
     return result;
   }
   return false;
 };
  const toggleDivider = () => {
    if (viewRef.current) {
      const command = (state: any, dispatch: any) => {
        if (dispatch) {
          dispatch(
            state.tr
              .replaceSelectionWith(mySchema.nodes.horizontal_rule.create())
              .scrollIntoView()
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
    <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 mr-4">
          <Button
            type="button"
            onClick={undoAction}
            className={""}
            title="Undo (Ctrl+Z)"
            size={"icon-sm"}
            variant={"ghost"}
          >
            <Undo2 size={16} />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={redoAction}
            className={""}
            title="Redo (Ctrl+Y)"
          >
            <Redo2 size={16} />
          </Button>
        </div>

        {/* <div className="w-px h-6 bg-gray-300" /> */}

        <div className="flex gap-1 border-x">
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleBold}
            className={"tool-strong"}
            title="Bold (Ctrl+B)"
          >
            <Bold size={16} />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleItalic}
            className={"tool-em"}
            title="Italic (Ctrl+I)"
          >
            <Italic size={16} />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleCode}
            className={"tool-code"}
            title="Inline Code (Ctrl+`)"
          >
            <Code size={16} />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleCodeBlock}
            className={"tool-code_block"}
            title="Inline Code (Ctrl+`)"
          >
            <CodeXml size={16} />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleUnderline}
            className={"tool-underline"}
            title="underline (Ctrl+`)"
          >
            <Underline size={16} />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleStrike}
            className={"tool-strike"}
            title="strike (Ctrl+`)"
          >
            <Strikethrough size={16} />
          </Button>

          
        </div>

        {/* <div className="w-px h-full bg-gray-300" /> */}

        <div className="flex gap-1 border-r">
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={() => toggleHeading(1)}
            className={"tool-heading1"}
            title="Heading 1"
          >
            <Heading1 size={16} />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={() => toggleHeading(2)}
            className={"tool-heading2"}
            title="Heading 2"
          >
            <Heading2 size={16} />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={() => toggleHeading(3)}
            className={"tool-heading3"}
            title="Heading 2"
          >
            <Heading3 size={16} />
          </Button>
        </div>
        <div className="flex gap-1 border-r">
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleNumberedList}
            className={"tool-ordered_list"}
            title="Number List"
          >
            <ListOrdered size={16} />
          </Button>
          <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleBulletedList}
            className={"tool-bullet_list"}
            title="Number List"
          >
            <List size={16} />
          </Button>
       
        </div>
         <div className="flex gap-1 ">
          <LinkPopover viewRef={viewRef} mySchema={mySchema} currentHref={""} />
           <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleQuote}
            className={"tool-numbered_list"}
            title="Number List"
          >
            <Quote size={16} />
          </Button>
           <Button
            size={"icon-sm"}
            variant={"ghost"}
            type="button"
            onClick={toggleDivider}
            className={"tool-numbered_list"}
            title="Number List"
          >
            <Minus size={16} />
          </Button>
         </div>
      </div>
    </div>
  );
}

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

    el.className = `${newClasses} ${toolId}`;
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

    el.className = `${newClasses} ${toolId}`;
  });
}
