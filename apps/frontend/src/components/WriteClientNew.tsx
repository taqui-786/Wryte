"use client";
import { Edit03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import dynamic from "next/dynamic";
import { useCallback, useRef, useState } from "react";
import { useAutosave } from "@/hooks/useAutosave";
import { type DocWithThread, updateUserDocs } from "@/lib/serverAction";
import AgentSidebarNew from "./agent/AgentSidebarNew";
import type { AIChange } from "./my-editor/MyEditor";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable";
import { ScrollArea } from "./ui/scroll-area";
import { Skeleton } from "./ui/skeleton";

const MyEditor = dynamic(() => import("./my-editor/MyEditor"), {
  ssr: false,
  loading: () => <EditorSkeleton />,
});

function EditorSkeleton() {
  return (
    <div className="border border-border">
      <div className="border-b border-border px-3 py-2 flex items-center gap-2">
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-7 w-7 rounded-md" />
        <Skeleton className="h-7 w-7 rounded-md" />
        <div className="ml-auto flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-5 w-8 rounded-full" />
        </div>
      </div>
      <div className="min-h-[500px] p-4 space-y-3">
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-2/3" />
      </div>
    </div>
  );
}

type Props = { doc: DocWithThread };

const WriteClientNew: React.FC<Props> = ({ doc }) => {
  const [isEditingHeading, setIsEditingHeading] = useState(false);
  const [heading, setHeading] = useState(doc.title || "Untitled");
  const headingInputRef = useRef<HTMLInputElement>(null);
  const [isAIApplying, setIsAIApplying] = useState(false);
  const editorRef = useRef<any>(null);
  const [value, setValue] = useState(doc.content || "");
  const handleAppendContent = (content: string) => {
    setValue((prev) => prev + content);
  };
  const handleReplaceContent = (content: string) => {
    setValue(content);
  };

  const handleSave = useCallback(
    async (payload: { docId: string; title: string; content: string }) => {
      await updateUserDocs(payload);
    },
    [],
  );

  const autosave = useAutosave({
    docId: doc.id,
    title: heading,
    content: value,
    onSave: handleSave,
  });

  return (
    <ResizablePanelGroup orientation="horizontal" className="overflow-hidden ">
      <ResizablePanel defaultSize={70} className="max-h-[calc(100vh-4rem)]">
        <ScrollArea className="h-full">
          <div className="w-full flex p-4  justify-center">
            <div className=" max-w-5xl w-full h-full flex flex-col  gap-4  ">
              {isEditingHeading ? (
                <Input
                  type="text"
                  autoFocus
                  ref={headingInputRef}
                  placeholder="Untitled"
                  className="w-full border-0 border-b border-border rounded-none px-0 py-1 text-2xl font-semibold shadow-none leading-tight bg-transparent focus-visible:ring-0 focus-visible:border-primary"
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  onBlur={() => setIsEditingHeading(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") {
                      setIsEditingHeading(false);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!isAIApplying) {
                      setIsEditingHeading(true);
                      setTimeout(() => headingInputRef.current?.focus(), 0);
                    }
                  }}
                  className="group flex items-center gap-2 text-left w-full px-0 py-1 bg-transparent border-none cursor-text"
                  disabled={isAIApplying}
                >
                  <span className="text-2xl font-semibold leading-tight truncate text-muted-foreground pl-4">
                    {heading}
                  </span>
                  <Button variant="ghost" size={"icon-lg"}>
                    <HugeiconsIcon icon={Edit03Icon} />
                  </Button>
                </button>
              )}
              <MyEditor
                ref={editorRef}
                onChange={(val) => setValue(val)}
                value={value}
                isLocked={isAIApplying}
                autosaveEnabled={autosave.autosaveEnabled}
                onToggleAutosave={autosave.toggleAutosave}
                onSaveNow={autosave.saveNow}
                isSaving={autosave.isSaving}
                hasUnsavedChanges={autosave.hasUnsavedChanges}
              />
            </div>
          </div>
        </ScrollArea>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={30} className="max-h-[calc(100vh-4rem)]">
        <AgentSidebarNew
          docId={doc.id}
          userId={doc.userId}
          editorValue={value}
          onEditorAppend={handleAppendContent}
          onEditorReplace={handleReplaceContent}
          allThreads={doc.threads || []}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
export default WriteClientNew;
