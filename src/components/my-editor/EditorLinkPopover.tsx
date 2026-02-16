"use client";
import React, { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Trash2, ExternalLink } from "lucide-react";
import { toggleMark } from "prosemirror-commands";
import { EditorView } from "prosemirror-view";
import { Label } from "@/components/ui/label";
import { LinkSolid } from "./editorIcons";

interface LinkPopoverProps {
  viewRef: React.MutableRefObject<EditorView | null>;
  mySchema: any;
  isLocked?: boolean;
}

function EditorLinkPopover({ viewRef, mySchema, isLocked = false }: LinkPopoverProps) {
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [linkHref, setLinkHref] = useState("");
  const [linkTitle, setLinkTitle] = useState("");
  const [isEditingExistingLink, setIsEditingExistingLink] = useState(false);

  // Check if link mark is active at current cursor position
  const isLinkActive = () => {
    if (!viewRef.current) return false;
    const state = viewRef.current.state;
    const { from, $from, to, empty } = state.selection;
    const markType = mySchema.marks.link;
    if (empty) return !!markType.isInSet(state.storedMarks || $from.marks());
    else return state.doc.rangeHasMark(from, to, markType);
  };

  // Get link attributes at cursor position
  const getLinkAtCursor = () => {
    if (!viewRef.current) return null;
    const { state } = viewRef.current;
    const { from, $from, to } = state.selection;
    const markType = mySchema.marks.link;

    // Check marks at cursor position
    const marks = $from.marks();
    const linkMark = marks.find((m: any) => m.type === markType);

    if (linkMark) {
      return linkMark.attrs;
    }

    // If selection range, check if entire range has link mark
    if (from !== to) {
      let foundAttrs: any = null;
      state.doc.nodesBetween(from, to, (node) => {
        if (!foundAttrs && node.marks) {
          const mark = node.marks.find((m) => m.type === markType);
          if (mark) {
            foundAttrs = mark.attrs;
          }
        }
      });
      return foundAttrs;
    }

    return null;
  };

  // Detect and populate existing link when popover opens
  useEffect(() => {
    if (isLinkPopoverOpen) {
      const linkAttrs = getLinkAtCursor();
      if (linkAttrs) {
        setLinkHref(linkAttrs.href || "");
        setLinkTitle(linkAttrs.title || "");
        setIsEditingExistingLink(true);
      } else {
        setLinkHref("");
        setLinkTitle("");
        setIsEditingExistingLink(false);
      }
    } else {
      // Reset states when popover closes
      setLinkHref("");
      setLinkTitle("");
      setIsEditingExistingLink(false);
    }
  }, [isLinkPopoverOpen]);

  const toggleLink = () => {
    if (isLocked) return;
    if (!viewRef.current) return;
    setIsLinkPopoverOpen(true);
    viewRef.current.focus();
  };

  const removeLink = () => {
    if (!viewRef.current) return;
    const { state, dispatch } = viewRef.current;
    const { from, to, empty, $from } = state.selection;
    const markType = mySchema.marks.link;

    if (isLinkActive()) {
      if (empty) {
        // Cursor is within a link - find the full extent of the link
        const linkMark = $from.marks().find((m: any) => m.type === markType);

        if (linkMark) {
          // Find the range of the link by walking the document
          let start = from;
          let end = from;

          // Walk backwards to find link start
          let pos = from - 1;
          while (pos >= $from.start()) {
            const resolvedPos = state.doc.resolve(pos);
            const marks = resolvedPos.marks();
            const hasMatchingLink = marks.some(
              (m: any) => m.type === markType && m.eq(linkMark)
            );
            if (hasMatchingLink) {
              start = pos;
              pos--;
            } else {
              break;
            }
          }

          // Walk forwards to find link end
          pos = from;
          while (pos <= $from.end()) {
            const resolvedPos = state.doc.resolve(pos);
            const marks = resolvedPos.marks();
            const hasMatchingLink = marks.some(
              (m: any) => m.type === markType && m.eq(linkMark)
            );
            if (hasMatchingLink) {
              end = pos + 1;
              pos++;
            } else {
              break;
            }
          }

          const tr = state.tr.removeMark(start, end, markType);
          dispatch(tr);
        }
      } else {
        // Text is selected - remove from selection
        const tr = state.tr.removeMark(from, to, markType);
        dispatch(tr);
      }

      setIsLinkPopoverOpen(false);
      viewRef.current.focus();
    }
  };

  const applyLink = () => {
    if (!viewRef.current || !linkHref.trim()) return;
    const { state, dispatch } = viewRef.current;
    const { from, to, empty } = state.selection;
    const attrs = { href: linkHref.trim(), title: linkTitle.trim() };
    const markType = mySchema.marks.link;

    if (isEditingExistingLink) {
      // Update existing link
      const tr = state.tr
        .removeMark(from, to, markType)
        .addMark(from, to, markType.create(attrs));
      dispatch(tr);
    } else {
    
      if (empty) {

        const displayText = linkTitle.trim() || linkHref.trim();
        const linkMark = markType.create(attrs);
        const linkNode = mySchema.text(displayText, [linkMark]);

   
        const tr = state.tr
          .replaceSelectionWith(linkNode, false)
          .insertText(" ");

   
        dispatch(tr.removeStoredMark(markType));
      } else {
     
        toggleMark(markType, attrs)(state, dispatch);
      }
    }

    viewRef.current.focus();
    setIsLinkPopoverOpen(false);
  };

  const previewLink = () => {
    if (linkHref.trim()) {
      window.open(linkHref.trim(), "_blank", "noopener,noreferrer");
    }
  };


  const isValidUrl = (url: string) => {
    try {
      new URL(url);
      return url.startsWith("http://") || url.startsWith("https://");
    } catch {
      return false;
    }
  };

  return (
    <Popover open={isLinkPopoverOpen} onOpenChange={setIsLinkPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          size={"icon-sm"}
          variant={"ghost"}
          type="button"
          onClick={toggleLink}
          className="tool-link"
          title="Add/Edit Link"
          disabled={isLocked}
        >
          <LinkSolid size={"16"} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 z-[99999]">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-semibold leading-none">
              {isEditingExistingLink ? "Edit Link" : "Add Link"}
            </h4>
            <p className="text-sm text-muted-foreground">
              {isEditingExistingLink
                ? "Update the URL and title for this link."
                : "Enter the URL and optional title for the link."}
            </p>
          </div>
          <div className="grid gap-3">
            <div className="grid gap-2">
              <Label htmlFor="href" className="text-sm font-medium">
                URL
              </Label>
              <Input
                id="href"
                value={linkHref}
                onChange={(e) => setLinkHref(e.target.value)}
                placeholder="https://example.com"
                className="h-9"
                autoFocus
                disabled={isLocked}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-sm font-medium">
                Title (optional)
              </Label>
              <Input
                id="title"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Link title"
                className="h-9"
                disabled={isLocked}
              />
            </div>
          </div>
          <div className="flex gap-2 justify-between items-center">
            <div className="flex gap-2">
              {isValidUrl(linkHref) && (
                <Button
                  variant="outline"
                  size="icon-sm"
                  onClick={previewLink}
                  title="Open in new tab"
                  type="button"
                  disabled={isLocked}
                >
                  <ExternalLink size={16} />
                </Button>
              )}
              {isEditingExistingLink && (
                <Button
                  variant="destructive"
                  size="icon-sm"
                  onClick={removeLink}
                  title="Remove link"
                  type="button"
                  disabled={isLocked}
                >
                  <Trash2 size={16} />
                </Button>
              )}
            </div>
            <Button
              onClick={applyLink}
              disabled={isLocked || !linkHref.trim()}
              size="sm"
              type="button"
            >
              {isEditingExistingLink ? "Save Changes" : "Apply Link"}
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

export default EditorLinkPopover;
