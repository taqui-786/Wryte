"use client";
import {
  Copy01Icon,
  Delete02Icon,
  Edit03Icon,
  MoreVerticalCircle01Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { useAutosave } from "@/hooks/useAutosave";
import { useDeleteDoc } from "@/lib/queries/deleteDocQuery";
import { type DocWithThread, updateUserDocs } from "@/lib/serverAction";
import AgentSidebarNew from "./agent/AgentSidebarNew";
import { LoadingSpinnerIcon } from "./customIcons";
import type { AIChange } from "./my-editor/MyEditor";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
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
  const router = useRouter();
  const [isEditingHeading, setIsEditingHeading] = useState(false);
  const [heading, setHeading] = useState(doc.title || "Untitled");
  const headingInputRef = useRef<HTMLInputElement>(null);
  const [isAIApplying, setIsAIApplying] = useState(false);
  const editorRef = useRef<any>(null);
  const [value, setValue] = useState(doc.content || "");
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const deleteDocMutation = useDeleteDoc();

  const handleAppendContent = (content: string) => {
    setValue((prev) => prev + content);
  };
  const handleReplaceContent = (content: string) => {
    setValue(content);
  };

  const handleCopyMarkdown = async () => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Markdown code copied to clipboard");
    } catch (_err) {
      toast.error("Failed to copy markdown to clipboard");
    }
  };

  const handleDeleteConfirm = () => {
    deleteDocMutation.mutate(doc.id, {
      onSuccess: () => {
        setIsDeleteDialogOpen(false);
        router.push("/dashboard");
      },
    });
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
              <div className="w-full flex items-center justify-between">
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
                <div className="flex gap-2">
                  <Button>
                    <Link href={`/p/${doc.id}`} prefetch={false}>
                      Publish
                    </Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size={"icon-sm"} variant={"ghost"}>
                        <HugeiconsIcon icon={MoreVerticalCircle01Icon} />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={handleCopyMarkdown}
                        className="cursor-pointer"
                      >
                        <HugeiconsIcon
                          icon={Copy01Icon}
                          className="mr-2 h-4 w-4"
                        />
                        Copy Markdown
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setIsDeleteDialogOpen(true)}
                        className="cursor-pointer text-destructive focus:text-destructive focus:bg-destructive/10"
                      >
                        <HugeiconsIcon
                          icon={Delete02Icon}
                          className="mr-2 h-4 w-4"
                        />
                        Delete Document
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <AlertDialog
                    open={isDeleteDialogOpen}
                    onOpenChange={(open) =>
                      !deleteDocMutation.isPending &&
                      setIsDeleteDialogOpen(open)
                    }
                  >
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>
                          Delete "{doc.title || heading}"?
                        </AlertDialogTitle>
                        <AlertDialogDescription>
                          This action cannot be restored. Deleting this document
                          will mark it as deleted, and all associated agent
                          messages, conversation history, and document content
                          will no longer be accessible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel
                          disabled={deleteDocMutation.isPending}
                        >
                          Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                          variant="destructive"
                          onClick={(e) => {
                            e.preventDefault();
                            handleDeleteConfirm();
                          }}
                          disabled={deleteDocMutation.isPending}
                        >
                          {deleteDocMutation.isPending ? (
                            <>
                              Deleting...
                              <LoadingSpinnerIcon
                                className="ml-2 animate-spin"
                                size="16"
                              />
                            </>
                          ) : (
                            "Confirm Delete"
                          )}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
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
