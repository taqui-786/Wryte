"use client";

import { useMemo } from "react";
import {
  Loading03FreeIcons,
  ToolsIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { cn } from "@/lib/utils";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { StreamingMessage } from "@/components/ai-elements/streaming-message";
import { Markdown } from "@/components/ui/markdown";
import { HumanMessage, AIMessage } from "./types";

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

  if (type === "tool-call" && isComplete) {
    const argsStr = part.args
      ? Object.entries(part.args)
          .map(([k, v]) => `${k}: ${v}`)
          .join(", ")
      : "";
    return {
      statusMessage: `Called ${part.name}${argsStr ? `(${argsStr})` : ""}`,
      statusBadge: "complete",
      isComplete: true,
      previewText: argsStr,
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

export function MessageBubble({
  message,
}: {
  message: HumanMessage | AIMessage;
}) {
  const isUser = message.type === "human";
  const parts = message.parts ?? [];

  const reasoningParts = useMemo(
    () => parts.filter((part: any) => part.type === "reasoning"),
    [message.parts],
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
  }, [message.parts, hasReasoning]);

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
                  animate={false}
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
