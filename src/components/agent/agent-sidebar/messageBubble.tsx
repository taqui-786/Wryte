"use client";

import { useMemo } from "react";
import { ToolsIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { StreamingMessage } from "@/components/ai-elements/streaming-message";
import { HumanMessage, AIMessage, ToolCall } from "./types";

function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  const argsStr = Object.entries(toolCall.args)
    .map(([k, v]) => `${k}: ${v}`)
    .join(", ");

  return (
    <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm my-2">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={ToolsIcon} className="size-[16px]" />
        <span className="font-medium">
          Called {toolCall.name}({argsStr})
        </span>
      </div>
    </div>
  );
}

function parseUserMessage(text: string) {
  if (!/^<Summarize\b/.test(text)) return text;

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

export function MessageBubble({
  message,
}: {
  message: HumanMessage | AIMessage;
}) {
  const isUser = message.type === "human";
  const parts = message.parts ?? [];
  const toolCalls = message.type === "ai" ? message.data.tool_calls : [];

  const reasoningParts = useMemo(
    () => parts.filter((p: any) => p.type === "reasoning"),
    [parts],
  );
  const reasoningText = useMemo(
    () =>
      reasoningParts
        .map((p: any) => p.text ?? "")
        .filter(Boolean)
        .join("\n\n"),
    [reasoningParts],
  );
  const isReasoningStreaming = reasoningParts.some(
    (p: any) => p.state !== "done",
  );

  const displayParts = useMemo(
    () => parts.filter((p: any) => p.type === "text"),
    [parts],
  );

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
        {reasoningParts.length > 0 && (
          <Reasoning
            key="reasoning-block"
            className="w-full"
            isStreaming={isReasoningStreaming}
          >
            <ReasoningTrigger />
            <ReasoningContent>{reasoningText}</ReasoningContent>
          </Reasoning>
        )}

        {toolCalls.map((tc) => (
          <ToolCallCard key={tc.id} toolCall={tc} />
        ))}

        {displayParts.map((part: any, i: number) => {
          const key = `text-${i}`;
          if (isUser) {
            return (
              <div className="flex flex-col" key={key}>
                {parseUserMessage(part.text)}
              </div>
            );
          }
          return (
            <div className="whitespace-pre-wrap" key={key}>
              <StreamingMessage
                markdown
                animate={false}
                text={part.text}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
