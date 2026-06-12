"use client";

import { ToolsIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai-elements/reasoning";
import { StreamingMessage } from "@/components/ai-elements/streaming-message";
import {
  HumanMessage,
  AIMessage,
  ToolCall,
  StreamingPart,
  NodeType,
} from "./types";
interface PlanStep {
  step: number;
  action: string;
  params: Record<string, any>;
  description: string;
}
interface StepCompleted {
  plan: PlanStep[];
  current_step_index: number;
  research_requested: boolean;
  writer_requested: boolean;
  step_results: string[];
}
function ToolCallCard({ toolCall }: { toolCall: ToolCall }) {
  console.log({ toolCall });

  return (
    <div className="rounded-md border border-border bg-muted px-3 py-2 text-sm my-2">
      <div className="flex items-center gap-2">
        <HugeiconsIcon icon={ToolsIcon} className="size-4" />
        <span className="font-medium">Called {toolCall.name}</span>

        <span className="text-xs text-muted-foreground">
          {toolCall?.isRunning === true ? "Running" : "Completed"}
        </span>
      </div>
    </div>
  );
}

// function parseUserMessage(text: string) {
//   if (!/^<Summarize\b/.test(text)) return text;

//   const userMsg = text.match(/<userMsg>([\s\S]*?)<\/userMsg>/)?.[1] ?? "";
//   const content =
//     text.match(/<content><!\[CDATA\[([\s\S]*?)\]\]><\/content>/)?.[1] ?? "";

//   return (
//     <>
//       <div className="text-base mb-2">{userMsg}</div>
//       <div className="p-2 bg-muted border rounded">
//         <div className="text-sm text-black line-clamp-4">{content}</div>
//       </div>
//     </>
//   );
// }

export function MessageBubble({
  message,
  node,
}: {
  message: HumanMessage | AIMessage;
  node: NodeType[];
}) {
  const isUser = message.type === "human";
  const parts = message.parts ?? [];
  const toolCalls = message.type === "ai" ? message.data.tool_calls : [];

  const reasoningText = message.data.additional_kwargs
    .reasoning_content as string;

  function isTypedPart(p: unknown): p is StreamingPart {
    return (
      (typeof p === "object" &&
        p !== null &&
        "type" in p &&
        (p as { type: string }).type === "reasoning") ||
      (p as { type: string }).type === "content" ||
      (p as { type: string }).type === "tool_call"
    );
  }
  function renderParts() {
    console.log({ parts });
    if (parts.length === 0 || !isTypedPart(parts[0])) {
      return (
        <>
          {reasoningText?.length > 0 && (
            <Reasoning
              key="reasoning-block"
              className="w-full"
              defaultOpen={parts?.length > 0}
              isStreaming={
                message.data.additional_kwargs?.isReasoning as boolean
              }
            >
              <ReasoningTrigger />
              <ReasoningContent>{reasoningText ?? ""}</ReasoningContent>
            </Reasoning>
          )}

          {toolCalls.map((tc) => (
            <ToolCallCard key={tc.id} toolCall={tc} />
          ))}

          <div className="whitespace-pre-wrap" key={`text-${message.data.id}`}>
            <StreamingMessage
              markdown
              animate={false}
              text={message.data.content ?? ""}
            />
          </div>
        </>
      );
    }

    return (parts as StreamingPart[]).map((part, i) => {
      switch (part.type) {
        case "reasoning":
          return (
            <Reasoning
              key={i}
              className="w-full"
              defaultOpen={false}
              isStreaming={false}
            >
              <ReasoningTrigger />
              <ReasoningContent>{part.content}</ReasoningContent>
            </Reasoning>
          );
        case "content":
          const activeNode = node[node.length - 1];
          if (node[node.length - 2] === "task_planner" && node[node.length - 1] === "step_executor") {
            const my_plan = JSON.parse(part.content) as PlanStep[];
            const topic = my_plan[0]?.params?.topic ?? "Plan";
            return (
              <div
                key={i}
                className="rounded-lg border border-border bg-muted/50 p-3 my-2 space-y-2"
              >
                <div className="flex items-center gap-2 pb-1.5 border-b border-border">
                  <div className="size-2 rounded-full bg-primary" />
                  <span className="font-semibold text-sm truncate">
                    {topic}
                  </span>
                </div>
                {my_plan.map((ps) => (
                  <div
                    key={ps.step}
                    className="flex items-start gap-2.5 text-sm"
                  >
                    <div className="flex items-center justify-center size-6 shrink-0 rounded-full bg-primary/10 text-primary text-xs font-bold mt-0.5">
                      {ps.step}
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="font-medium capitalize">
                        {ps.action.replace(/_/g, " ")}
                      </span>
                      <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
                        {ps.description}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            );
          }
          if (activeNode === "step_complete") {
            const { plan, current_step_index } = JSON.parse(
              part.content,
            ) as StepCompleted;
            const topic = plan[0]?.params?.topic ?? "Plan";
            return (
              <div
                key={i}
                className="rounded-lg border border-border bg-muted/50 p-3 my-2 space-y-2"
              >
                <div className="flex items-center gap-2 pb-1.5 border-b border-border">
                  <div className="size-2 rounded-full bg-green-500" />
                  <span className="font-semibold text-sm truncate">
                    {topic}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground">
                    {current_step_index}/{plan.length}
                  </span>
                </div>
                {plan.map((ps) => {
                  const isDone = ps.step <= current_step_index;
                  return (
                    <div
                      key={ps.step}
                      className={`flex items-start gap-2.5 text-sm ${isDone ? "opacity-50" : ""}`}
                    >
                      <div
                        className={`flex items-center justify-center size-6 shrink-0 rounded-full text-xs font-bold mt-0.5 ${isDone ? "bg-green-500/20 text-green-600" : "bg-primary/10 text-primary"}`}
                      >
                        {isDone ? "✓" : ps.step}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span
                          className={`font-medium capitalize ${isDone ? "line-through" : ""}`}
                        >
                          {ps.action.replace(/_/g, " ")}
                        </span>
                        <p className="text-muted-foreground text-xs leading-relaxed line-clamp-2">
                          {ps.description}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            );
          }
          if (activeNode === "chat_node") {
            return (
              <div key={i} className="whitespace-pre-wrap">
                <StreamingMessage
                  markdown
                  animate={message.type === "ai"}
                  text={part.content}
                />
              </div>
            );
          }
          return ""
        case "tool_call":
          return <ToolCallCard key={i} toolCall={part.toolCall} />;
      }
    });
  }

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
        {renderParts()}
        {/* {reasoningText?.length > 0 && (
          <Reasoning
            key="reasoning-block"
            className="w-full"
            defaultOpen={parts?.length > 0}
            isStreaming={message.data.additional_kwargs?.isReasoning as boolean}
          >
            <ReasoningTrigger />
            <ReasoningContent>{reasoningText ?? ""}</ReasoningContent>
          </Reasoning>
        )} */}

        {/* {toolCalls.map((tc) => (
          <ToolCallCard key={tc.id} toolCall={tc} />
        ))} */}

        {/* <div className="whitespace-pre-wrap" key={`text-${message.data.id}`}>
          <StreamingMessage
            markdown
            animate={parts?.length > 0 && message.type === "ai"}
            text={message.data.content ?? ""}
          />
        </div> */}
      </div>
    </div>
  );
}
