"use client";
import { Edit03Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import dynamic from "next/dynamic";
import { parseAsString, useQueryState } from "nuqs";
import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import AgentSidebarLoading from "./agent/AgentSidebarLoading";
import {
  buildMarkdownFromInsertChanges,
  dedupeChanges,
  isSequentialInsertDocument,
  looksLikeJson,
  safeParseChangesFromStream,
} from "./agent/ai-change-utils";
import type {
  EditorUpdatePayload,
  TitleUpdatePayload,
} from "./agent/ai-update-types";
import WriteClientActions from "./agent/WriteClientActions";
import DeletePageDailog from "./DeletePageDailog";
import MyEditor, { type MyEditorHandle } from "./my-editor/MyEditor";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable";
import { ScrollArea } from "./ui/scroll-area";

const AgentSidebar = dynamic(() => import("./agent/AgentSidebar"), {
  loading: () => <AgentSidebarLoading />,
  ssr: false,
});

function WriteClient() {
  // DB-driven doc queries/mutations removed — editor works in local-only mode
  const isPending = false;
  const isUpdatingDoc = false;

  const [docs] = useQueryState("page", parseAsString);
  const [heading, setHeading] = useState("");
  const [isEditingHeading, setIsEditingHeading] = useState(false);
  const headingInputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState("");
  const [isAutoSaving] = useState(false);
  const [isAIApplying, setIsAIApplying] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
  const currentDocIdRef = useRef<string | null>(null);
  const latestHeadingRef = useRef("");
  const lastSavedHeadingRef = useRef("");
  const [open, setOpen] = useState(false);
  const latestValueRef = useRef("");
  const lastSavedValueRef = useRef("");
  const isInitialLoadRef = useRef(false);
  const editorRef = useRef<MyEditorHandle>(null);
  const isAIApplyingRef = useRef(false);
  const activeAIStreamsRef = useRef(0);
  const editorStreamIntervalRef = useRef<number | null>(null);
  const editorStreamIdRef = useRef(0);
  const titleStreamIntervalRef = useRef<number | null>(null);
  const titleStreamIdRef = useRef(0);
  const activeEditorStreamIdRef = useRef<string | null>(null);
  const activeTitleStreamIdRef = useRef<string | null>(null);
  const aiStreamBaseMarkdownRef = useRef<string | null>(null);

  // Static/local doc state — no DB fetch
  const activeDocId = undefined as string | undefined;
  const activeDocTitle = "";
  const activeDocContent = "";
  const hasActiveDoc = false;
  const isLoading = false;

  const agentChatDraftRef = useRef<{
    activeChatId: string | null;
    messages: Array<{
      id: string;
      role: "user" | "assistant";
      parts: unknown;
    }>;
  }>({
    activeChatId: null,
    messages: [],
  });

  useEffect(() => {
    currentDocIdRef.current = docs ?? null;
  }, [docs]);

  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }

    if (docs && activeDocId) {
      isInitialLoadRef.current = true;
      setHeading(activeDocTitle);
      setValue(activeDocContent);
      latestHeadingRef.current = activeDocTitle;
      latestValueRef.current = activeDocContent;
      lastSavedHeadingRef.current = activeDocTitle;
      lastSavedValueRef.current = activeDocContent;
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
    } else {
      const RandomTimeId: string = (
        (Date.now() + Math.random() * 90000) %
        100000
      )
        .toFixed(0)
        .padStart(5, "0");
      const noHeaderId = `Untitled Doc ${RandomTimeId}`;
      setHeading(noHeaderId);
      setValue("");
      latestHeadingRef.current = noHeaderId;
      latestValueRef.current = "";
      lastSavedHeadingRef.current = noHeaderId;
      lastSavedValueRef.current = "";
    }
  }, [activeDocContent, activeDocId, activeDocTitle, docs]);

  const setAIApplyingState = (next: boolean) => {
    isAIApplyingRef.current = next;
    setIsAIApplying(next);
  };

  const beginAIAction = () => {
    activeAIStreamsRef.current += 1;
    if (activeAIStreamsRef.current === 1) {
      setAIApplyingState(true);
    }
  };

  const endAIAction = () => {
    activeAIStreamsRef.current = Math.max(0, activeAIStreamsRef.current - 1);
    if (activeAIStreamsRef.current === 0) {
      setAIApplyingState(false);
    }
  };

  const beginEditorStream = (id?: string) => {
    if (activeEditorStreamIdRef.current === id) return;
    activeEditorStreamIdRef.current = id ?? "stream";
    aiStreamBaseMarkdownRef.current = latestValueRef.current;
    beginAIAction();
  };

  const endEditorStream = (id?: string) => {
    if (!activeEditorStreamIdRef.current) return;
    if (id && activeEditorStreamIdRef.current !== id) return;
    activeEditorStreamIdRef.current = null;
    aiStreamBaseMarkdownRef.current = null;
    endAIAction();
  };

  const beginTitleStream = (id?: string) => {
    if (activeTitleStreamIdRef.current === id) return;
    activeTitleStreamIdRef.current = id ?? "stream";
    beginAIAction();
  };

  const endTitleStream = (id?: string) => {
    if (!activeTitleStreamIdRef.current) return;
    if (id && activeTitleStreamIdRef.current !== id) return;
    activeTitleStreamIdRef.current = null;
    endAIAction();
  };

  const cancelStream = (
    intervalRef: React.MutableRefObject<number | null>,
    streamIdRef: React.MutableRefObject<number>,
  ) => {
    streamIdRef.current += 1;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
      endAIAction();
    }
  };

  // Auto-save removed — no-op so all dependent code compiles
  const queueAutoSave = (_nextHeading: string, _nextValue: string) => {
    // DB persistence removed
  };

  const startAIStream = (
    text: string,
    onUpdate: (chunk: string) => void,
    onComplete: () => void,
    intervalRef: React.MutableRefObject<number | null>,
    streamIdRef: React.MutableRefObject<number>,
  ) => {
    cancelStream(intervalRef, streamIdRef);

    streamIdRef.current += 1;
    const streamId = streamIdRef.current;

    const totalLength = text.length;
    if (totalLength === 0) {
      beginAIAction();
      onUpdate("");
      onComplete();
      endAIAction();
      return;
    }

    const intervalMs = 16;
    const maxDurationMs = 3500;
    const maxSteps = Math.max(1, Math.floor(maxDurationMs / intervalMs));
    const stepSize =
      totalLength <= 400 ? 1 : Math.max(1, Math.ceil(totalLength / maxSteps));
    let index = 0;

    const tick = () => {
      if (streamId !== streamIdRef.current) return;
      index = Math.min(totalLength, index + stepSize);
      onUpdate(text.slice(0, index));
      if (index >= totalLength) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
        endAIAction();
        onComplete();
      }
    };

    beginAIAction();
    tick();
    intervalRef.current = window.setInterval(tick, intervalMs);
  };

  useEffect(() => {
    return () => {
      if (editorStreamIntervalRef.current) {
        clearInterval(editorStreamIntervalRef.current);
        editorStreamIntervalRef.current = null;
      }
      if (titleStreamIntervalRef.current) {
        clearInterval(titleStreamIntervalRef.current);
        titleStreamIntervalRef.current = null;
      }
      activeAIStreamsRef.current = 0;
    };
  }, []);

  // updateDocHandler — no-op (DB removed)
  const updateDocHandler = async () => {};

  const handleChange = (content: string) => {
    if (content === value) return;
    setValue(content);
    latestValueRef.current = content;
  };

  const applyHeadingUpdate = (
    newHeading: string,
    _options?: { skipAutoSave?: boolean },
  ) => {
    setHeading(newHeading);
    latestHeadingRef.current = newHeading;
  };

  const handleHeadingChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newHeading = e.target.value;
    applyHeadingUpdate(newHeading);
  };

  const streamEditorUpdate = (nextMarkdown: string) => {
    if (nextMarkdown === latestValueRef.current) return;

    startAIStream(
      nextMarkdown,
      (chunk) => {
        setValue(chunk);
        latestValueRef.current = chunk;
      },
      () => {
        latestValueRef.current = nextMarkdown;
        setValue(nextMarkdown);
        queueAutoSave(latestHeadingRef.current, nextMarkdown);
      },
      editorStreamIntervalRef,
      editorStreamIdRef,
    );
  };

  const resolveMarkdownFromAIOutput = (
    aiOutput: string,
    baseMarkdown?: string | null,
  ) => {
    const changes = dedupeChanges(safeParseChangesFromStream(aiOutput));
    if (changes.length === 0 || !editorRef.current) return null;

    if (isSequentialInsertDocument(changes)) {
      return buildMarkdownFromInsertChanges(changes);
    }

    if (baseMarkdown) {
      return editorRef.current.getMarkdownAfterAIChangesFromBase(
        baseMarkdown,
        changes,
      );
    }

    return editorRef.current.getMarkdownAfterAIChanges(changes);
  };

  // handleCreatePost — no-op (DB removed, toast guides user)
  const handleCreatePost = async () => {
    if (!docs && heading && value) {
      toast.info("Document saving is currently disabled.");
    } else {
      if (heading.length === 0 && value.length > 0) {
        toast.error("No Title provided ", {
          description: "Please provide any Doc Title to save this.",
        });
      } else if (heading.length > 0 && value.length === 0) {
        toast.error("No Content provided ", {
          description: "Please provide any Doc Content to save this.",
        });
      } else {
        toast.error("Incomplete Data ", {
          description: "Please provide Doc Title and at least some content.",
        });
      }
    }
  };

  const handlePersistableChatChange = useCallback(
    (payload: {
      activeChatId: string | null;
      messages: Array<{
        id: string;
        role: "user" | "assistant";
        parts: unknown;
      }>;
    }) => {
      agentChatDraftRef.current = payload;
    },
    [],
  );

  const handleAIEditorUpdate = ({
    id,
    status,
    markdown,
  }: EditorUpdatePayload) => {
    if (!markdown && status === "processing") {
      beginEditorStream(id);
      return;
    }

    if (status === "processing") {
      beginEditorStream(id);
      return;
    }

    if (status === "streaming") {
      beginEditorStream(id);
      cancelStream(editorStreamIntervalRef, editorStreamIdRef);

      const baseMarkdown =
        aiStreamBaseMarkdownRef.current ?? latestValueRef.current;
      const nextMarkdown = resolveMarkdownFromAIOutput(markdown, baseMarkdown);
      if (!nextMarkdown) return;
      if (nextMarkdown === latestValueRef.current) return;

      setValue(nextMarkdown);
      latestValueRef.current = nextMarkdown;
      return;
    }

    // status === "complete"
    const baseMarkdown =
      aiStreamBaseMarkdownRef.current ?? latestValueRef.current;
    const nextMarkdown = resolveMarkdownFromAIOutput(markdown, baseMarkdown);

    if (nextMarkdown && nextMarkdown !== latestValueRef.current) {
      setValue(nextMarkdown);
      latestValueRef.current = nextMarkdown;
      queueAutoSave(latestHeadingRef.current, nextMarkdown);
      endEditorStream(id);
      return;
    }

    if (!looksLikeJson(markdown) && markdown.trim()) {
      streamEditorUpdate(markdown);
    }

    endEditorStream(id);
  };

  const handleAITitleUpdate = ({ id, status, title }: TitleUpdatePayload) => {
    if (status === "processing") {
      beginTitleStream(id);
      return;
    }

    if (status === "streaming") {
      beginTitleStream(id);
      cancelStream(titleStreamIntervalRef, titleStreamIdRef);
      if (!title) return;
      setHeading(title);
      latestHeadingRef.current = title;
      return;
    }

    if (!title) {
      endTitleStream(id);
      return;
    }

    setHeading(title);
    latestHeadingRef.current = title;
    queueAutoSave(title, latestValueRef.current);
    endTitleStream(id);
  };

  if (isLoading) {
    return null;
  }

  return (
    <ResizablePanelGroup orientation="horizontal" className="overflow-hidden ">
      <ResizablePanel defaultSize={70} className="max-h-[calc(100vh-4rem)]">
        <ScrollArea className="h-full">
          <div className="w-full flex p-4  justify-center">
            <div className=" max-w-5xl w-full h-full flex flex-col  gap-4  ">
              <WriteClientActions
                hasActiveDoc={hasActiveDoc}
                updatedAt={undefined}
                isUpdatingDoc={isUpdatingDoc}
                isAutoSaving={isAutoSaving}
                isPending={isPending}
                onSave={updateDocHandler}
                onCreate={handleCreatePost}
                onDelete={() => setOpen(true)}
              />
              {isEditingHeading ? (
                <Input
                  ref={headingInputRef}
                  type="text"
                  autoFocus
                  placeholder="Untitled"
                  className="w-full border-0 border-b border-border rounded-none px-0 py-1 text-2xl font-semibold shadow-none leading-tight bg-transparent focus-visible:ring-0 focus-visible:border-primary"
                  value={heading}
                  onChange={handleHeadingChange}
                  disabled={isAIApplying}
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
                onChange={handleChange}
                value={value || ""}
                isLocked={isAIApplying}
              />
              <DeletePageDailog open={open} setOpen={setOpen} />
            </div>
          </div>
        </ScrollArea>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel defaultSize={30} className="max-h-[calc(100vh-4rem)]">
        <AgentSidebar
          editorMarkdown={latestValueRef.current}
          onEditorUpdate={(nextOutput) => {
            handleAIEditorUpdate(nextOutput);
          }}
          onTitleUpdate={(nextTitle) => {
            handleAITitleUpdate(nextTitle);
          }}
          onPersistableChatChange={handlePersistableChatChange}
          editorHeading={heading}
          docId={docs as string}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export default WriteClient;
