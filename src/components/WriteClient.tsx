"use client";
import React, { useState, useEffect, useRef, Activity } from "react";
import { useQueryState, parseAsString } from "nuqs";
import { useCreateDoc } from "@/lib/queries/createDocQuery";
import { useQuery } from "@tanstack/react-query";
import { getDocsById } from "@/lib/serverAction";
import { useUpdateDoc } from "@/lib/queries/updateDocQuery";
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WriteClientSkeleton from "./ui/WriteClientSkeleton";
import { ClockIcon, LoadingSpinnerIcon, MenuIcon } from "./customIcons";
import { Button } from "./ui/button";
import { DeleteIcon } from "./my-editor/editorIcons";
import { Input } from "./ui/input";
import MyEditor from "./my-editor/MyEditor";
import DeletePageDailog from "./DeletePageDailog";
function WriteClient() {
  const { mutateAsync: createDoc, isPending } = useCreateDoc();
  const { mutateAsync: updateDoc, isPending: isUpdatingDoc } = useUpdateDoc();
  const [docs] = useQueryState("page", parseAsString);
  const [heading, setHeading] = useState("");
  const [value, setValue] = useState("");
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const latestHeadingRef = useRef("");
  const [open, setOpen] = useState(false);
  const latestValueRef = useRef("");
  const isInitialLoadRef = useRef(false);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["page", docs],
    queryFn: async () => await getDocsById(docs as string),
  });

  useEffect(() => {
    if (docs && data && data.length > 0) {
      isInitialLoadRef.current = true;
      setHeading(data[0].title);
      setValue(data[0].content);
      latestHeadingRef.current = data[0].title;
      latestValueRef.current = data[0].content;
      // Allow changes after initial load completes
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
    } else {
      setHeading("");
      setValue("");
      latestHeadingRef.current = "";
      latestValueRef.current = "";
    }
  }, [data, docs]);
  const updateDocHandler = async () => {
    if (docs) {
      await updateDoc({
        docId: docs as string,
        title: heading,
        content: value,
      });
    }
  };
  const handleChange = (content: string) => {
    setValue(content);
    latestValueRef.current = content;

    if (!docs || isInitialLoadRef.current) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      setIsAutoSaving(true);

      try {
        await updateDoc({
          docId: docs as string,
          title: latestHeadingRef.current,
          content: latestValueRef.current,
        });
      } catch (err) {
        console.error(err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 1000);
  };

  const handleHeadingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeading = e.target.value;
    setHeading(newHeading);

    latestHeadingRef.current = newHeading;

    if (docs && !isInitialLoadRef.current) {
      // Auto-save for existing docs
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }

      saveTimeoutRef.current = window.setTimeout(async () => {
        setIsAutoSaving(true);

        try {
          await updateDoc({
            docId: docs as string,
            title: latestHeadingRef.current,
            content: latestValueRef.current,
          });
        } catch (err) {
          console.error(err);
        } finally {
          setIsAutoSaving(false);
        }
      }, 1000);
    }
  };

  const handleCreatePost = async () => {
    if (docs) {
      await createDoc({ title: heading, content: value });
      return;
    }
  };
  if (isLoading) {
    return <WriteClientSkeleton />;
  }

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="p-2 flex items-center justify-between">
        <div className="">
          {data?.[0]?.id && docs ? (
            <div className="flex gap-2 items-center text-muted-foreground">
              <ClockIcon size="20" />
              <span className="text-sm font-medium">
                Last edited{" "}
                {formatDistanceToNow(new Date(data?.[0]?.updatedAt))} ago
              </span>
            </div>
          ) : (
            ""
          )}
        </div>
        <div className="">
          {data?.[0]?.id && docs ? (
            <div className="flex items-center justify-center gap-2">
              <Button
                disabled={isUpdatingDoc}
                onClick={updateDocHandler || isAutoSaving}
                variant={"outline"}
              >
                {isAutoSaving ? (
                  <>
                    Auto Saving{" "}
                    <LoadingSpinnerIcon size="18" className="animate-spin" />
                  </>
                ) : isUpdatingDoc ? (
                  <>
                    Saving
                    <LoadingSpinnerIcon size="18" className="animate-spin" />
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size={"icon"} variant={"outline"}>
                    <MenuIcon size={"20"} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  {/* <DropdownMenuLabel >
                  
                  </DropdownMenuLabel> */}
                  {/* <DropdownMenuSeparator /> */}
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => setOpen(true)}
                  >
                    <DeleteIcon size={"16"} />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          ) : (
            <Button disabled={isPending} onClick={handleCreatePost}>
              {isPending ? (
                <>
                  Creating
                  <LoadingSpinnerIcon size="18" className="animate-spin" />
                </>
              ) : (
                "Create Page"
              )}
            </Button>
          )}
        </div>
      </div>
      <Input
        type="text"
        placeholder="Write a heading of your post..."
        className=" w-full border-border rounded-none px-4 py-1 h-12 text-6xl font-medium shadow-none"
        value={heading}
        onChange={handleHeadingChange}
      />
      {/* </div> */}
      <MyEditor onChange={handleChange} value={value || ""} />
      <DeletePageDailog open={open} setOpen={setOpen} />
    </div>
  );
}

export default WriteClient;
