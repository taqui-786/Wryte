"use client";
import React, { useState, useEffect, useRef } from "react";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import WriteClientSkeleton from "./ui/WriteClientSkeleton";
import { Button } from "./ui/button";
import { DeleteIcon } from "./my-editor/editorIcons";
import { Input } from "./ui/input";
import MyEditor, {
  type AIChange,
  type MyEditorHandle,
} from "./my-editor/MyEditor";
import DeletePageDailog from "./DeletePageDailog";
import AgentSidebar from "./agent/AgentSidebar";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable";
import { ScrollArea } from "./ui/scroll-area";
import { marked } from "marked";
import z from "zod";
import { HugeiconsIcon } from "@hugeicons/react";
import { Clock04Icon, Loading03Icon, MoreVerticalSquare01Icon } from "@hugeicons/core-free-icons";

const ChangeSchema = z.object({
  line: z.number().int().positive(),
  type: z.enum(["replace", "delete", "insert"]),
  content: z.string(),
});

const AIResponseSchema = z.object({
  elements: z.array(z.any()),
});

type AIStreamStatus = "processing" | "streaming" | "complete";

type EditorUpdatePayload = {
  id?: string;
  status: AIStreamStatus;
  markdown: string;
};

type TitleUpdatePayload = {
  id?: string;
  status: AIStreamStatus;
  title: string;
};

function safeParseChanges(input: unknown): AIChange[] {
  let parsed = input;

  if (typeof input === "string") {
    try {
      parsed = JSON.parse(input);
    } catch (err) {
      console.error("Failed to JSON.parse AI output", err);
      return [];
    }
  }

  // Handle both { elements: [...] } and raw array formats
  let rawItems: unknown[];
  if (Array.isArray(parsed)) {
    rawItems = parsed;
  } else {
    const result = AIResponseSchema.safeParse(parsed);
    if (!result.success) {
      console.error("Invalid AI output shape", result.error);
      return [];
    }
    rawItems = result.data.elements;
  }

  // Validate each item against ChangeSchema
  const validated: AIChange[] = [];
  for (const item of rawItems) {
    const res = ChangeSchema.safeParse(item);
    if (res.success) {
      validated.push(res.data);
    }
  }
  return validated;
}

function extractJsonObjectsFromStream(text: string): unknown[] {
  const objects: unknown[] = [];
  let inString = false;
  let escape = false;
  let bracketDepth = 0;
  let braceDepth = 0;
  let objStart = -1;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];

    if (inString) {
      if (escape) {
        escape = false;
      } else if (ch === "\\") {
        escape = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }

    if (ch === '"') {
      inString = true;
      continue;
    }

    if (ch === "[") {
      bracketDepth += 1;
      continue;
    }

    if (ch === "]") {
      bracketDepth = Math.max(0, bracketDepth - 1);
      continue;
    }

    if (bracketDepth < 1) continue;

    if (ch === "{") {
      if (braceDepth === 0) {
        objStart = i;
      }
      braceDepth += 1;
      continue;
    }

    if (ch === "}") {
      if (braceDepth > 0) {
        braceDepth -= 1;
      }
      if (braceDepth === 0 && objStart >= 0) {
        const slice = text.slice(objStart, i + 1);
        objStart = -1;
        try {
          objects.push(JSON.parse(slice));
        } catch {
          // ignore invalid partial object
        }
      }
    }
  }

  return objects;
}

function safeParseChangesFromStream(input: string): AIChange[] {
  const trimmed = input.trim();
  if (!trimmed) return [];

  const direct = safeParseChanges(trimmed);
  if (direct.length > 0) return direct;

  const rawObjects = extractJsonObjectsFromStream(trimmed);
  if (rawObjects.length === 0) return [];

  const validated: AIChange[] = [];
  for (const item of rawObjects) {
    const res = ChangeSchema.safeParse(item);
    if (res.success) validated.push(res.data);
  }
  return validated;
}

const looksLikeJson = (text: string) => /^[\[{]/.test(text.trim());

const isListItemLine = (line: string) =>
  /^\s*(?:[-*+]\s+|\d+\.\s+)/.test(line.trim());

const dedupeChanges = (changes: AIChange[]) => {
  const seen = new Set<string>();
  const result: AIChange[] = [];
  for (const change of changes) {
    const key = `${change.line}|${change.type}|${change.content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(change);
  }
  return result;
};

const buildMarkdownFromInsertChanges = (changes: AIChange[]) => {
  const sorted = [...changes].sort((a, b) => a.line - b.line);
  const parts: string[] = [];
  for (let i = 0; i < sorted.length; i += 1) {
    const content = sorted[i].content ?? "";
    if (i === 0) {
      parts.push(content);
      continue;
    }

    const prev = sorted[i - 1].content ?? "";
    const prevIsList = isListItemLine(prev);
    const currIsList = isListItemLine(content);
    const joiner = prevIsList && currIsList ? "\n" : "\n\n";
    parts.push(joiner, content);
  }
  return parts.join("");
};

const isSequentialInsertDocument = (changes: AIChange[]) => {
  if (changes.length === 0) return false;
  if (!changes.every((c) => c.type === "insert")) return false;
  const sorted = [...changes].sort((a, b) => a.line - b.line);
  for (let i = 0; i < sorted.length; i += 1) {
    if (sorted[i].line !== i + 1) return false;
  }
  return true;
};

/**
 * Adds data-line="N" attributes to every top-level block element in an HTML string.
 * Only targets top-level block tags (p, h1-h6, blockquote, pre, ul, ol, hr, div, table).
 */
function addDataLineAttributes(html: string): string {
  if (!html) return html;

  const container = document.createElement("div");
  container.innerHTML = html;

  const blockTags = new Set([
    "P",
    "H1",
    "H2",
    "H3",
    "H4",
    "H5",
    "H6",
    "BLOCKQUOTE",
    "PRE",
    "UL",
    "OL",
    "HR",
    "DIV",
    "TABLE",
  ]);

  let lineNumber = 0;
  Array.from(container.children).forEach((el) => {
    if (!blockTags.has(el.tagName)) return;
    lineNumber += 1;
    el.setAttribute("data-line", String(lineNumber));
  });

  return container.innerHTML;
}

function WriteClient() {
  const { mutateAsync: createDoc, isPending } = useCreateDoc();
  const { mutateAsync: updateDoc, isPending: isUpdatingDoc } = useUpdateDoc();
  const [docs] = useQueryState("page", parseAsString);
  const [heading, setHeading] = useState("");
  const [value, setValue] = useState("");
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isAIApplying, setIsAIApplying] = useState(false);
  const saveTimeoutRef = useRef<number | null>(null);
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
  const { data, isLoading, isError } = useQuery({
    queryKey: ["page", docs],
    queryFn: async () => await getDocsById(docs as string),
    staleTime: 1000 * 60 * 5,
  });
  const activeDoc = Array.isArray(data) ? data[0] : data;
  const hasActiveDoc = Boolean(docs && activeDoc?.id);

  useEffect(() => {
    if (docs && activeDoc) {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = null;
      }
      
      isInitialLoadRef.current = true;
      setHeading(activeDoc.title ?? "");
      setValue(activeDoc.content ?? "");
      latestHeadingRef.current = activeDoc.title ?? "";
      latestValueRef.current = activeDoc.content ?? "";
      lastSavedHeadingRef.current = activeDoc.title ?? "";
      lastSavedValueRef.current = activeDoc.content ?? "";
      // Allow changes after initial load completes
      setTimeout(() => {
        isInitialLoadRef.current = false;
      }, 100);
    } else {
      setHeading("");
      setValue("");
      latestHeadingRef.current = "";
      latestValueRef.current = "";
      lastSavedHeadingRef.current = "";
      lastSavedValueRef.current = "";
    }
  }, [data, docs]);

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

  const queueAutoSave = (nextHeading: string, nextValue: string) => {
    if (!docs || isInitialLoadRef.current) {
      return;
    }

    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    if (
      nextHeading === lastSavedHeadingRef.current &&
      nextValue === lastSavedValueRef.current
    ) {
      return;
    }

    saveTimeoutRef.current = window.setTimeout(async () => {
      setIsAutoSaving(true);

      try {
        await updateDoc({
          docId: docs as string,
          title: nextHeading,
          content: nextValue,
        });
        lastSavedHeadingRef.current = nextHeading;
        lastSavedValueRef.current = nextValue;
      } catch (err) {
        console.error(err);
      } finally {
        setIsAutoSaving(false);
      }
    }, 1000);
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
  const updateDocHandler = async () => {
    if (docs) {
      try {
        await updateDoc({
          docId: docs as string,
          title: heading,
          content: value,
        });
        lastSavedHeadingRef.current = heading;
        lastSavedValueRef.current = value;
      } catch (err) {
        console.error(err);
      }
    }
  };
  const handleChange = (content: string) => {
    if(content === value) return;
    setValue(content);
    latestValueRef.current = content;

    if (!docs || isInitialLoadRef.current || isAIApplyingRef.current) {
      return;
    }

    queueAutoSave(latestHeadingRef.current, latestValueRef.current);
  };

  const applyHeadingUpdate = (
    newHeading: string,
    options?: { skipAutoSave?: boolean },
  ) => {
    setHeading(newHeading);
    latestHeadingRef.current = newHeading;

    if (options?.skipAutoSave || isAIApplyingRef.current) {
      return;
    }

    queueAutoSave(newHeading, latestValueRef.current);
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

  const handleCreatePost = async () => {
    if (docs) {
      await createDoc({ title: heading, content: value });
      return;
    }
  };

  /**
   * Handles AI-generated editor updates — parses the structured JSON output
   * from the AI and applies line-level changes via the editor's imperative handle.
   * Falls back to full-document replace if parsing fails.
   */
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
    return <WriteClientSkeleton />;
  }
  // console.log(
  //   addDataLineAttributes(marked.parse(latestValueRef.current) as string),
  // );

  return (
    <ResizablePanelGroup orientation="horizontal" className="overflow-hidden ">
      <ResizablePanel defaultSize={70} className="max-h-[calc(100vh-3.5rem)]">
        <ScrollArea className="h-full">
          <div className="w-full flex p-4  justify-center">
            <div className=" max-w-5xl w-full h-full flex flex-col  gap-4  ">
              <div className="p-2 flex items-center justify-between">
                <div className="">
                  {hasActiveDoc ? (
                    <div className="flex gap-2 items-center text-muted-foreground">
                      <HugeiconsIcon icon={Clock04Icon} size="20" />
                      <span className="text-sm font-medium">
                        Last edited{" "}
                        {activeDoc?.updatedAt
                          ? formatDistanceToNow(new Date(activeDoc.updatedAt))
                          : "just now"}{" "}
                        ago
                      </span>
                    </div>
                  ) : (
                    ""
                  )}
                </div>
                <div className="">
                  {hasActiveDoc ? (
                    <div className="flex items-center justify-center gap-2">
                      <Button
                        disabled={isUpdatingDoc}
                        onClick={updateDocHandler || isAutoSaving}
                        variant={"outline"}
                      >
                        {isAutoSaving ? (
                          <>
                            <HugeiconsIcon icon={Loading03Icon} size="18" className="animate-spin" />
                              Auto Saving
                          </>
                        ) : isUpdatingDoc ? (
                          <>
                            <HugeiconsIcon icon={Loading03Icon} size="18" className="animate-spin" />
                              Saving
                          </>
                        ) : (
                          "Save Changes"
                        )}
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size={"icon"} variant={"outline"}>
                           <HugeiconsIcon icon={MoreVerticalSquare01Icon} size="20" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
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
                          <HugeiconsIcon icon={Loading03Icon} size="18" className="animate-spin" />
                          Creating...
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
                disabled={isAIApplying}
              />
              {/* </div> */}
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
      <ResizablePanel defaultSize={30} className="max-h-[calc(100vh-3.5rem)]">
        <AgentSidebar
          editorContent={addDataLineAttributes(
            marked.parse(latestValueRef.current) as string,
          )}
          editorMarkdown={latestValueRef.current}
          onEditorUpdate={(nextOutput) => {
            handleAIEditorUpdate(nextOutput);
          }}
          onTitleUpdate={(nextTitle) => {
            handleAITitleUpdate(nextTitle);
          }}
          editorHeading={heading}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export default WriteClient;
