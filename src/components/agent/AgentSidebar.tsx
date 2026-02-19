import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { PlusIcon } from "../UserSidebar";
import { useChat } from "@ai-sdk/react";
import { cn } from "@/lib/utils";
import type { MyUIMessage } from "@/app/api/chat/route";
import { buildEditorContentFromMarkdown } from "./editor-content";
import type {
  EditorUpdatePayload,
  TitleUpdatePayload,
} from "./ai-update-types";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "../ai-elements/reasoning";
import { StreamingMessage } from "../ai-elements/streaming-message";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Brain01FreeIcons,
  Clock04Icon,
  Menu01Icon,
  ToolsIcon,
} from "@hugeicons/core-free-icons";
import { Markdown } from "../ui/markdown";

// --- Helpers for dynamic tool card rendering ---

/** Prettify a raw part type into a human-readable label.
 *  "tool-get_weather_tool"   → "Get Weather"
 *  "data-editor-update"      → "Editor Update"
 *  "data-tool-reasoning"     → "Tool Reasoning"
 */
function prettifyPartType(type: string): string {
  return type
    .replace(/^(data-|tool-)/, "") // strip prefix
    .replace(/_tool$/, "") // strip trailing _tool
    .replace(/[_-]/g, " ") // underscores/dashes → spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Title Case
}

type ToolCardProps = {
  statusMessage: string;
  statusBadge: string;
  isComplete: boolean;
  previewText?: string;
  previewIsMarkdown?: boolean;
};

/** Derive a unified card model from ANY data-* or tool-* part. */
function getToolCardProps(part: any): ToolCardProps | null {
  const type: string = part.type ?? "";
  const status: string = part.data?.status ?? "processing";
  const isComplete = status === "complete";
  const label = prettifyPartType(type);

  // tool-* invocation parts  (tool-get_weather_tool, tool-write_in_editor_tool, …)
  // if (type.startsWith("tool-")) {
  //   return {
  //     statusMessage: `Running ${label}`,
  //     statusBadge: status,
  //     isComplete: false,
  //   };
  // }

  // data-editor-update
  if (type === "data-editor-update") {
    return {
      statusMessage: isComplete ? "Editor updated" : "Updating editor",
      statusBadge: status,
      isComplete,
      previewText: part.data?.markdown,
      previewIsMarkdown: true,
    };
  }

  // data-title-update
  if (type === "data-title-update") {
    return {
      statusMessage: isComplete ? "Title updated" : "Updating title",
      statusBadge: status,
      isComplete,
      previewText: part.data?.title,
    };
  }

  // data-tool-reasoning  (only show while NOT complete)
  if (type === "data-tool-reasoning" && !isComplete) {
    return {
      statusMessage: isComplete ? `${label} complete` : `Processing`,
      statusBadge: status,
      isComplete,
      previewText: part.data?.text,
      previewIsMarkdown: true,
    };
  }

  // data-tool-output  (only show when complete)
  if (type === "data-tool-output" && isComplete) {
    return {
      statusMessage: "Task completed",
      statusBadge: status,
      isComplete: true,
      previewText: part.data?.text,
      previewIsMarkdown: true,
    };
  }

  return null; // not a tool-card part
}

/** Reusable status card rendered for every tool / data-* part. */
function ToolStatusCard({
  index,
  props,
}: {
  index: number;
  props: ToolCardProps;
}) {
  return (
    <div
      key={index}
      className={cn(
        "rounded-md border px-3 py-2 text-sm my-2",
        props.isComplete
          ? "border-border bg-white"
          : "border-border bg-primary/10",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <HugeiconsIcon
            icon={ToolsIcon}
            className={cn("size-[16px]", !props.isComplete && "animate-pulse")}
          />
          <span className="font-medium">{props.statusMessage}</span>
        </div>
        <span className="text-xs capitalize text-muted-foreground">
          {props.statusBadge}
        </span>
      </div>
      {props.previewText && (
        <div className="text-xs text-muted-foreground mt-2 italic line-clamp-4">
          {props.previewIsMarkdown ? (
            <Markdown className="text-sm">{props.previewText}</Markdown>
          ) : (
            props.previewText
          )}
        </div>
      )}
    </div>
  );
}

// --- Message bubble component ---

function MessageBubble({
  message,
  parts,
}: {
  message: MyUIMessage;
  parts: any[];
}) {
  const isUser = message.role === "user";

  // Filter parts to only show relevant current state
  const filteredParts = useMemo(() => {
    const hasReasoning = parts.some((p) => p.type === "reasoning");
    // Dynamic: match any tool-* invocation part
    const hasToolCall = parts.some((p) => p.type.startsWith("tool-"));
    const hasDataToolReasoning = parts.some(
      (p) => p.type === "data-tool-reasoning",
    );
    const hasDataToolOutput = parts.some((p) => p.type === "data-tool-output");
    const hasEditorUpdate = parts.some((p) => p.type === "data-editor-update");
    const hasTitleUpdate = parts.some((p) => p.type === "data-title-update");
    const hasFinalText = parts.some((p) => p.type === "text" && p.text?.trim());

    const hasAnyActivity =
      hasReasoning ||
      hasToolCall ||
      hasDataToolReasoning ||
      hasDataToolOutput ||
      hasEditorUpdate ||
      hasTitleUpdate ||
      hasFinalText;

    // Latest-part helpers — only show the most recent of each data-* category
    const latestOf = (type: string) =>
      [...parts].reverse().find((p) => p.type === type);

    const latestOutputPart = latestOf("data-tool-output");
    const latestReasoningPart = latestOf("data-tool-reasoning");
    const latestEditorUpdatePart = latestOf("data-editor-update");
    const latestTitleUpdatePart = latestOf("data-title-update");

    return parts.filter((part) => {
      // Hide step-start once we have any real content
      if (part.type === "step-start") return !hasAnyActivity;

      // Always show model reasoning (it collapses itself)
      if (part.type === "reasoning") return true;

      // Hide tool-invocation parts once we have data parts
      if (part.type.startsWith("tool-")) {
        return !hasDataToolReasoning && !hasDataToolOutput;
      }

      // Show latest reasoning part only if output hasn't started
      if (part.type === "data-tool-reasoning") {
        if (latestOutputPart?.data?.text?.trim()) return false;
        return part === latestReasoningPart;
      }

      // Show latest output part only
      if (part.type === "data-tool-output") return part === latestOutputPart;

      // Show latest editor/title update only
      if (part.type === "data-editor-update")
        return part === latestEditorUpdatePart;
      if (part.type === "data-title-update")
        return part === latestTitleUpdatePart;

      // Show text only if it has content
      if (part.type === "text") return Boolean(part.text?.trim());

      return false;
    });
  }, [parts]);

  return (
    <div
      className={`mb-4 group  flex ${isUser ? "justify-end" : "justify-start"}`}
      data-user-type={isUser}
    >
      <div
        className={` group-data-[user-type=false]:w-full w-fit max-w-[80%] rounded-lg p-3 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {filteredParts.map((part, i) => {
          // Model reasoning (collapsible)
          if (part.type === "reasoning") {
            return (
              <Reasoning
                key={i}
                className="w-full"
                isStreaming={part?.state !== "done"}
              >
                <ReasoningTrigger />
                <ReasoningContent>{part?.text}</ReasoningContent>
              </Reasoning>
            );
          }

          // data-title-update, data-tool-reasoning, data-tool-output
          const cardProps = getToolCardProps(part);
          if (cardProps) {
            return <ToolStatusCard key={i} index={i} props={cardProps} />;
          }

          // Final text response
          if (part.type === "text") {
            return (
              <div className="whitespace-pre-wrap" key={i}>
                <StreamingMessage
                  markdown
                  animate={message.role === "assistant"}
                  text={part.text}
                />
              </div>
            );
          }

          return null;
        })}
      </div>
    </div>
  );
}

type AIStreamStatus = "processing" | "streaming" | "complete";

function AgentSidebar({
  editorMarkdown,
  onEditorUpdate,
  onTitleUpdate,
  editorHeading,
}: {
  editorMarkdown: string;
  editorHeading: string;
  onEditorUpdate?: (payload: EditorUpdatePayload) => void;
  onTitleUpdate?: (payload: TitleUpdatePayload) => void;
}) {
  const [viewHistory, setViewHistory] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const { messages, sendMessage, setMessages } = useChat<MyUIMessage>({
    onError: (error) => {
      console.error("Error sending message:", error);
      setIsThinking(false);
    },
  });

  const [inputValue, setInputValue] = useState("");
  const editorContent = useMemo(
    () => buildEditorContentFromMarkdown(editorMarkdown),
    [editorMarkdown],
  );
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const lastEditorUpdateRef = useRef<EditorUpdatePayload | null>(null);
  const lastTitleUpdateRef = useRef<TitleUpdatePayload | null>(null);

  // Auto-scroll to bottom when messages change or isThinking changes
  // Using direct scroll instead of timeout to ensure it updates during streaming
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isThinking]);

  useEffect(() => {
    if (!onEditorUpdate) return;

    let latestPart: {
      part: any;
      messageId: string;
    } | null = null;

    for (let mIndex = messages.length - 1; mIndex >= 0; mIndex -= 1) {
      const message = messages[mIndex];
      for (let pIndex = message.parts.length - 1; pIndex >= 0; pIndex -= 1) {
        const part = message.parts[pIndex];
        if (part.type === "data-editor-update") {
          latestPart = { part, messageId: message.id };
          break;
        }
      }
      if (latestPart) break;
    }

    if (!latestPart) return;

    const updateId = latestPart.part.id ?? latestPart.messageId;
    const status = (latestPart.part.data?.status ??
      "processing") as AIStreamStatus;
    const markdown = latestPart.part.data?.markdown ?? "";

    const nextPayload: EditorUpdatePayload = {
      id: updateId,
      status,
      markdown,
    };

    const lastPayload = lastEditorUpdateRef.current;
    if (
      lastPayload &&
      lastPayload.id === nextPayload.id &&
      lastPayload.status === nextPayload.status &&
      lastPayload.markdown === nextPayload.markdown
    ) {
      return;
    }

    lastEditorUpdateRef.current = nextPayload;
    onEditorUpdate(nextPayload);
  }, [messages, onEditorUpdate]);

  useEffect(() => {
    if (!onTitleUpdate) return;

    let latestPart: {
      part: any;
      messageId: string;
    } | null = null;

    for (let mIndex = messages.length - 1; mIndex >= 0; mIndex -= 1) {
      const message = messages[mIndex];
      for (let pIndex = message.parts.length - 1; pIndex >= 0; pIndex -= 1) {
        const part = message.parts[pIndex];
        if (part.type === "data-title-update") {
          latestPart = { part, messageId: message.id };
          break;
        }
      }
      if (latestPart) break;
    }

    if (!latestPart) return;

    const updateId = latestPart.part.id ?? latestPart.messageId;
    const status = (latestPart.part.data?.status ??
      "processing") as AIStreamStatus;
    const title = latestPart.part.data?.title ?? "";

    const nextPayload: TitleUpdatePayload = {
      id: updateId,
      status,
      title,
    };

    const lastPayload = lastTitleUpdateRef.current;
    if (
      lastPayload &&
      lastPayload.id === nextPayload.id &&
      lastPayload.status === nextPayload.status &&
      lastPayload.title === nextPayload.title
    ) {
      return;
    }

    lastTitleUpdateRef.current = nextPayload;
    onTitleUpdate(nextPayload);
  }, [messages, onTitleUpdate]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    // if (!inputValue.trim() || isLoading) return;

    try {
      const text = inputValue;
      setInputValue("");

      // Send message to API - useChat will handle adding it to messages
      setIsThinking(true);
      sendMessage({
        text,
        metadata: {
          userMessage: text,
          editorContent,
          editorMarkdown,
          editorHeading,
        },
      });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Taqui yrr don't remove this code
  useEffect(() => {
    if (!isThinking) return;

    for (const message of messages) {
      if (message.role !== "assistant") continue;
      for (let index = 0; index < message.parts.length; index += 1) {
        const part = message.parts[index];
        if (part.type === "step-start" && index === 0) {
          setIsThinking(false);
          return;
        }
      }
    }
  }, [messages, isThinking]);
  console.log({ messages });

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Heading */}
      <div className="w-full p-2 flex items-center justify-between border-b">
        <h2 className="text-lg font-medium">Agent</h2>
        <div className="flex items-center justify-center gap-1">
          <Button
            variant={"ghost"}
            size="icon-sm"
            onClick={() => {
              // setMessages([]);
            }}
          >
            <PlusIcon size="20" />
          </Button>
          <Button
            data-active={viewHistory}
            variant={"ghost"}
            size="icon-sm"
            className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
            onClick={() => setViewHistory(!viewHistory)}
          >
            <HugeiconsIcon icon={Clock04Icon} size="20" />
          </Button>
          <Button variant={"ghost"} size="icon-sm">
            <HugeiconsIcon icon={Menu01Icon} size="20" />
          </Button>
        </div>
      </div>
      {viewHistory ? (
        <div className="h-full flex items-center justify-center">
          <p>Your Recent Chats</p>
        </div>
      ) : (
        <>
          {/* body part scroll area */}
          <div
            ref={scrollRef}
            className="flex-1  min-h-0 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent"
          >
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>Start a conversation with AI agent...</p>
              </div>
            ) : (
              messages.map((message, index) => {
                return (
                  <MessageBubble
                    parts={message.parts}
                    key={message.id}
                    message={message}
                  />
                );
              })
            )}
            {isThinking && (
              <div className="mb-4 flex justify-start">
                <div className="max-w-[85%] rounded-lg p-3 bg-transparent text-foreground">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground animate-pulse">
                    <HugeiconsIcon
                      icon={Brain01FreeIcons}
                      className="size-[18px] animate-pulse"
                    />
                    <span>Thinking...</span>
                  </div>
                </div>
              </div>
            )}
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
            {/* Removed separate loading indicator - now shown via streaming thinking */}
          </div>
          {/* Agent - Chat box */}
          <div className="p-2">
            <div className="">
              <form
                onSubmit={handleSend}
                className="w-full p-2 border rounded-lg flex gap-2"
              >
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                  disabled={isThinking}
                  placeholder="Ask AI anything..."
                  className="flex-1 h-24 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button
                  size="icon"
                  className="self-end"
                  type="submit"
                  disabled={isThinking || !inputValue.trim()}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="m22 2-7 20-4-9-9-4Z" />
                    <path d="M22 2 11 13" />
                  </svg>
                </Button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default AgentSidebar;
