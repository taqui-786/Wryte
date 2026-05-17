"use client";

import {
  Brain01FreeIcons,
  Clock04Icon,
  Loading03FreeIcons,
  Menu01Icon,
  PlusSignIcon,
  SentIcon,
  ToolsIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "../ai-elements/reasoning";
import { StreamingMessage } from "../ai-elements/streaming-message";
import { Button } from "../ui/button";
import { Markdown } from "../ui/markdown";

type ToolCardProps = {
  statusMessage: string;
  statusBadge: string;
  isComplete: boolean;
  previewText?: string;
  previewIsMarkdown?: boolean;
};

function getToolCardProps(part: any): ToolCardProps | null {
  const type: string = part.type ?? "";
  const status: string = part.data?.status ?? "processing";
  const isComplete = status === "complete";

  if (type === "data-editor-update") {
    return {
      statusMessage: isComplete ? "Editor updated" : "Updating editor",
      statusBadge: status,
      isComplete,
      previewText: part.data?.markdown,
      previewIsMarkdown: true,
    };
  }

  if (type === "data-title-update") {
    return {
      statusMessage: isComplete ? "Title updated" : "Updating title",
      statusBadge: status,
      isComplete,
      previewText: part.data?.title,
    };
  }

  if (type === "data-tool-reasoning" && !isComplete) {
    return {
      statusMessage: `Processing`,
      statusBadge: status,
      isComplete,
      previewText: part.data?.text,
      previewIsMarkdown: true,
    };
  }

  if (type === "data-tool-output" && isComplete) {
    return {
      statusMessage: "Task completed",
      statusBadge: status,
      isComplete: true,
      previewText: part.data?.text || "",
      previewIsMarkdown: true,
    };
  }

  return null;
}

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
          ? "border-border bg-muted"
          : "border-border bg-primary/10",
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          {!props.isComplete ? (
            <HugeiconsIcon
              icon={Loading03FreeIcons}
              className={cn("size-[16px] animate-spin")}
            />
          ) : (
            <HugeiconsIcon icon={ToolsIcon} className={cn("size-[16px]")} />
          )}
          <span className="font-medium">{props.statusMessage}</span>
        </div>
        <span className="text-xs capitalize text-muted-foreground">
          {props.statusBadge}
        </span>
      </div>
      {props.previewText && (
        <div className="text-xs text-muted-foreground mt-2 italic line-clamp-4">
          {props.previewIsMarkdown ? (
            props.previewText.startsWith("{") ? (
              ""
            ) : (
              <Markdown className="text-sm">{props.previewText}</Markdown>
            )
          ) : props.previewText.startsWith("{") ? (
            ""
          ) : (
            props.previewText
          )}
        </div>
      )}
    </div>
  );
}

function parseUserMessage(text: string) {
  if (!/^<Summarize\b/.test(text)) {
    return text;
  }

  const userMsg = text.match(/<userMsg>([\s\S]*?)<\/userMsg>/)?.[1] ?? "";
  const content =
    text.match(/<content><!\[CDATA\[([\s\S]*?)\]\]><\/content>/)?.[1] ?? "";

  return (
    <>
      <div className="text-base mb-2">{userMsg}</div>
      <div className="p-2 bg-muted border rounded">
        <div className="text-sm text-black line-clamp-4">{content}</div>
      </div>
    </>
  );
}

function MessageBubble({
  message,
  parts,
  isOld,
}: {
  message: { id: string; role: "user" | "assistant"; parts: any[] };
  parts: any[];
  isOld: boolean;
}) {
  const isUser = message.role === "user";

  const reasoningParts = useMemo(
    () => parts.filter((part: any) => part.type === "reasoning"),
    [parts],
  );
  const hasReasoning = reasoningParts.length > 0;
  const reasoningText = useMemo(
    () =>
      reasoningParts
        .map((part: any) => part.text ?? "")
        .filter(Boolean)
        .join("\n\n"),
    [reasoningParts],
  );
  const isReasoningStreaming = reasoningParts.some(
    (part: any) => part?.state !== "done",
  );

  const filteredParts = useMemo(() => {
    const hasToolCall = parts.some((p: any) => p.type.startsWith("tool-"));
    const hasDataToolReasoning = parts.some(
      (p: any) => p.type === "data-tool-reasoning",
    );
    const hasDataToolOutput = parts.some(
      (p: any) => p.type === "data-tool-output",
    );
    const hasEditorUpdate = parts.some(
      (p: any) => p.type === "data-editor-update",
    );
    const hasTitleUpdate = parts.some(
      (p: any) => p.type === "data-title-update",
    );
    const hasFinalText = parts.some(
      (p: any) => p.type === "text" && p.text?.trim(),
    );

    const hasAnyActivity =
      hasReasoning ||
      hasToolCall ||
      hasDataToolReasoning ||
      hasDataToolOutput ||
      hasEditorUpdate ||
      hasTitleUpdate ||
      hasFinalText;

    const latestOf = (type: string) =>
      [...parts].reverse().find((p: any) => p.type === type);

    const latestOutputPart = latestOf("data-tool-output");
    const latestReasoningPart = latestOf("data-tool-reasoning");
    const latestEditorUpdatePart = latestOf("data-editor-update");
    const latestTitleUpdatePart = latestOf("data-title-update");

    return parts.filter((part: any) => {
      if (part.type === "step-start") return !hasAnyActivity;

      if (part.type.startsWith("tool-")) {
        return !hasDataToolReasoning && !hasDataToolOutput;
      }

      if (part.type === "data-tool-reasoning") {
        if (latestOutputPart?.data?.text?.trim()) return false;
        return part === latestReasoningPart;
      }

      if (part.type === "data-tool-output") return part === latestOutputPart;

      if (part.type === "data-editor-update")
        return part === latestEditorUpdatePart;
      if (part.type === "data-title-update")
        return part === latestTitleUpdatePart;

      if (part.type === "text") return Boolean(part.text?.trim());

      return false;
    });
  }, [parts, hasReasoning]);

  return (
    <div
      className={`mb-4 group flex ${isUser ? "justify-end" : "justify-start"}`}
      data-user-type={isUser}
    >
      <div
        className={`group-data-[user-type=false]:w-full w-fit 2xl:max-w-[80%] max-w-full rounded-lg p-3 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-background text-foreground"
        }`}
      >
        {hasReasoning && (
          <Reasoning
            key="reasoning-block"
            className="w-full"
            isStreaming={isReasoningStreaming}
          >
            <ReasoningTrigger />
            <ReasoningContent>{reasoningText}</ReasoningContent>
          </Reasoning>
        )}

        {filteredParts.map((part: any, i: number) => {
          const cardProps = getToolCardProps(part);
          const key = `${part.type}-${i}`;
          if (cardProps) {
            return <ToolStatusCard key={key} index={i} props={cardProps} />;
          }
          if (part.type === "text" && isUser) {
            return (
              <div className="flex flex-col" key={key}>
                {parseUserMessage(part.text)}
              </div>
            );
          }
          if (part.type === "text") {
            return (
              <div className="whitespace-pre-wrap" key={key}>
                <StreamingMessage
                  markdown
                  animate={message.role === "assistant" && !isOld}
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

const AgentSidebarNew: React.FC = () => {
  const [viewHistory, setViewHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<
    Array<{ id: string; role: "user" | "assistant"; parts: any[] }>
  >([]);
  const [threadId, setThreadId] = useState<string>(() => crypto.randomUUID());

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text) return;

    setInputValue("");
    setIsThinking(true);

    try {
      const userMsg = {
        id: crypto.randomUUID(),
        role: "user" as const,
        parts: [{ type: "text", text }],
      };
      const assistantMsg = {
        id: crypto.randomUUID(),
        role: "assistant" as const,
        parts: [] as any[],
      };

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      const res = await fetch("/api/chat-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, thread_id: threadId }),
      });

      if (!res.ok) throw new Error(`Chat API returned ${res.status}`);

      let accReasoning = "";
      let accContent = "";

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.trim()) continue;
          try {
            const chunk = JSON.parse(line);
            accReasoning += chunk.reasoning ?? "";
            accContent += chunk.content ?? "";

            const parts: any[] = [];
            if (accReasoning.trim()) {
              parts.push({
                type: "reasoning",
                text: accReasoning,
                state: "streaming",
              });
            }
            if (accContent.trim()) {
              parts.push({ type: "text", text: accContent });
            }

            setMessages((prev) => {
              const updated = [...prev];
              if (updated.length > 0) {
                updated[updated.length - 1] = {
                  ...updated[updated.length - 1],
                  parts,
                };
              }
              return updated;
            });
          } catch {
            // skip malformed JSON
          }
        }
      }

      if (accReasoning.trim()) {
        setMessages((prev) => {
          const updated = [...prev];
          if (updated.length > 0) {
            const last = updated[updated.length - 1];
            updated[updated.length - 1] = {
              ...last,
              parts: last.parts.map((p: any) =>
                p.type === "reasoning" ? { ...p, state: "done" } : p,
              ),
            };
          }
          return updated;
        });
      }
    } catch (error) {
      console.error("Chat error:", error);
    } finally {
      setIsThinking(false);
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [inputValue, threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });
  console.log({messages});
  return (
    <div className="h-full flex flex-col gap-4">
      {/* Heading */}
      <div className="w-full p-2 gap-2 flex items-center justify-between border-b">
        <h2 className="text-sm font-medium truncate block w-full">
          {messages.length > 0 ? "Chat" : "New Chat"}
        </h2>
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setMessages([]);
              setThreadId(crypto.randomUUID());
            }}
          >
            <HugeiconsIcon icon={PlusSignIcon} size="20" />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            data-active={viewHistory}
            className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
            onClick={() => setViewHistory(!viewHistory)}
          >
            <HugeiconsIcon icon={Clock04Icon} size="20" />
          </Button>
          <Button variant="ghost" size="icon-sm">
            <HugeiconsIcon icon={Menu01Icon} size="20" />
          </Button>
        </div>
      </div>
      {viewHistory ? (
        <div className="p-4 text-sm text-muted-foreground">
          History panel placeholder
        </div>
      ) : (
        <>
          {/* Body */}
          <div
            ref={scrollRef}
            className="flex-1 min-h-0 overflow-y-auto 2xl:p-4 p-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent"
          >
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-muted-foreground gap-4">
                <p>Start a conversation with Agent...</p>
              </div>
            ) : (
              messages.map((message, index) => {
                const isOld = index < messages.length - 1;
                return (
                  <MessageBubble
                    key={message.id}
                    message={message}
                    parts={message.parts}
                    isOld={isOld}
                  />
                );
              })
            )}
            {isThinking &&
              messages[messages.length - 1]?.parts.length === 0 && (
                <div className="mb-4 flex justify-start transition-opacity duration-300">
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
            <div ref={messagesEndRef} />
          </div>
          {/* Input */}
          <div className="p-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="w-full p-2 border-t flex flex-col gap-1"
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
                placeholder="Tell me what you want to write..."
                className="flex-1 h-24 resize-none bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <Button
                size="icon-lg"
                className="self-end"
                type="submit"
                disabled={isThinking || !inputValue.trim()}
              >
                <HugeiconsIcon icon={SentIcon} />
              </Button>
            </form>
          </div>
        </>
      )}
    </div>
  );
};

export default AgentSidebarNew;
