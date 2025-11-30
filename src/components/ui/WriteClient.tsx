"use client";
import React, { useState, useEffect, useRef } from "react";
import { Input } from "./input";
import MyEditor from "../my-editor/MyEditor";
import { Button } from "./button";
import { useQueryState, parseAsString } from "nuqs";
import { useCreateDoc } from "@/lib/queries/createDocQuery";
import { useQuery } from "@tanstack/react-query";
import { getDocsById } from "@/lib/serverAction";

function WriteClient() {
  const { mutateAsync: createDoc, isPending } = useCreateDoc();
  const [docs] = useQueryState("page", parseAsString);
  const [heading, setHeading] = useState("");
  const [value, setValue] = useState("");
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["page"],
    queryFn: async () => await getDocsById(docs as string),
  });
  useEffect(() => {
    if (docs && data && data.length > 0) {
      setHeading(data[0].title);
      setValue(data[0].content);
    }
  }, [data, docs]);

  const handleChange = (content: any) => {
    setValue(content);
    if (docs) {
      // Auto-save for existing docs
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        setIsAutoSaving(true);
        try {
          setLastSaved(new Date());
        } catch (error) {
          console.error("Auto-save failed:", error);
        } finally {
          setIsAutoSaving(false);
        }
      }, 1000); // 1 second delay
    }
  };

  const handleHeadingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeading = e.target.value;
    setHeading(newHeading);
    if (docs) {
      // Auto-save for existing docs
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(async () => {
        setIsAutoSaving(true);
        try {
          // await saveDoc({ id: docs, title: newHeading, content: value });
          setLastSaved(new Date());
        } catch (error) {
          console.error("Auto-save failed:", error);
        } finally {
          setIsAutoSaving(false);
        }
      }, 1000); // 1 second delay
    }
  };

  const handleCreatePost = async () => {
    if (docs) {
      await createDoc({ title: heading, content: value });
      return;
    }
    await createDoc({ title: heading, content: value });
  };

  return (
    <div className="w-full h-full flex flex-col gap-4">
      <div className="p-2 flex items-center justify-between">
        <div className=""></div>
        <div className="">
          <Button disabled={isPending} onClick={handleCreatePost}>
            {isPending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>
      <Input
        type="text"
        placeholder="Write a heading of your post..."
        className=" w-full border-primary rounded-none px-4 py-1 h-12 text-6xl font-medium shadow-none"
        value={heading}
        onChange={(e) => setHeading(e.target.value)}
      />
      {/* </div> */}
      <MyEditor
        // initialContent={data?.[0]?.content || ""}
        // onContentChange={handleChange}
      />
    </div>
  );
}

export default WriteClient;
