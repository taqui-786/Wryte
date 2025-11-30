"use client";
import React, { useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Link, Trash2 } from "lucide-react";
import { toggleMark } from "prosemirror-commands";
import { EditorView } from "prosemirror-view";
import { Label } from "@/components/ui/label";

interface LinkPopoverProps {
  currentHref: string;
  viewRef: React.MutableRefObject<EditorView | null>;
  mySchema: any;
}

export function LinkPopover({
  viewRef,
  mySchema,
  currentHref = "",
}: LinkPopoverProps) {
  const [isLinkPopoverOpen, setIsLinkPopoverOpen] = useState(false);
  const [linkHref, setLinkHref] = useState(currentHref);
  const [linkTitle, setLinkTitle] = useState("");
  const isLinkActive = () => {
    if (!viewRef.current) return false;
    const state = viewRef.current.state;
    const { from, $from, to, empty } = state.selection;
    const markType = mySchema.marks.link;
    if (empty) return !!markType.isInSet(state.storedMarks || $from.marks());
    else return state.doc.rangeHasMark(from, to, markType);
  };
  useEffect(() => {
    if (currentHref) setLinkHref(currentHref);
  }, [currentHref]);

  const toggleLink = () => {
    if (!viewRef.current) return;
    setIsLinkPopoverOpen(true);
    viewRef.current.focus();
  };
  const removeLink = () => {
    if (!viewRef.current) return;
    const { state, dispatch } = viewRef.current;
    const { from, to, empty } = state.selection;
    const markType = mySchema.marks.link;

    if (isLinkActive()) {
      let tr: any;
      if (empty) {
        tr = state.tr.removeStoredMark(markType);
      } else {
        tr = state.tr.removeMark(from, to);
      }

      dispatch(tr);
      setIsLinkPopoverOpen(false);
      setLinkHref("");
      setLinkTitle("");
      viewRef.current.focus();
    }
  };
  const applyLink = () => {
    if (!viewRef.current || !linkHref.trim()) return;
    const { state, dispatch } = viewRef.current;
    const { empty } = state.selection;
    const attrs = { href: linkHref, title: linkTitle };

    if (empty) {
      const linkMark = mySchema.marks.link.create(attrs);
      const node = mySchema.text(linkHref, [linkMark]);
      dispatch(state.tr.replaceSelectionWith(node));
    } else {
      toggleMark(mySchema.marks.link, attrs)(state, dispatch);
    }

    viewRef.current.focus();
    setIsLinkPopoverOpen(false);
    setLinkHref("");
    setLinkTitle("");
  };
  const updateLinkHref = () => {
    if (!viewRef.current || !linkHref.trim()) return;
    const { state, dispatch } = viewRef.current;
    const { from, to, empty } = state.selection;
    const attrs = { href: linkHref, title: linkTitle };
    const markType = mySchema.marks.link;

    if (empty) {
      const linkMark = markType.create(attrs);
      const node = mySchema.text(linkHref, [linkMark]);
      dispatch(state.tr.replaceSelectionWith(node));
    } else {
      const tr = state.tr
        .removeMark(from, to, markType)
        .addMark(from, to, markType.create(attrs));
      dispatch(tr);
    }

    viewRef.current.focus();
    setIsLinkPopoverOpen(false);
    setLinkHref("");
    setLinkTitle("");
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
          title="Add Link"
        >
          <Link size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 z-[99999]">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="font-medium leading-none">Add Link</h4>
            <p className="text-sm text-muted-foreground">
              Enter the URL and optional title for the link.
            </p>
          </div>
          <div className="grid gap-2">
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="href">URL</Label>
              <Input
                id="href"
                value={linkHref}
                onChange={(e) => setLinkHref(e.target.value)}
                placeholder="https://example.com"
                className="col-span-2 h-8"
              />
            </div>
            <div className="grid grid-cols-3 items-center gap-4">
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={linkTitle}
                onChange={(e) => setLinkTitle(e.target.value)}
                placeholder="Link title (optional)"
                className="col-span-2 h-8"
              />
            </div>
          </div>
          <div className="w-full flex gap-2 justify-end">
            {currentHref ? (
              <>
                <Button onClick={updateLinkHref} disabled={!linkHref.trim()}>
                  Save changes
                </Button>

                <Button
                  variant={"destructive"}
                  size={"icon-sm"}
                  onClick={removeLink}
                >
                  <Trash2 size={16} />
                </Button>
              </>
            ) : (
              <Button onClick={applyLink} disabled={!linkHref.trim()}>
                Apply Link
              </Button>
            )}
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
