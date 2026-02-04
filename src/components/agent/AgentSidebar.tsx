import React, { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../ui/button";
import { PlusIcon } from "../UserSidebar";
import { HistoryIcon, MenuIcon } from "../customIcons";
import { useChat } from "@ai-sdk/react";
import { cn } from "@/lib/utils";
import { MyUIMessage } from "@/app/api/chat/route";
import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "../ai-elements/reasoning";
import { StreamingMessage } from "../ai-elements/streaming-message";
import { HugeiconsIcon } from "@hugeicons/react";
import { Brain01FreeIcons, ToolsIcon } from "@hugeicons/core-free-icons";
import { Markdown } from "../ui/markdown";

// Message bubble component
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
    // Check what parts exist to determine visibility
    const hasReasoning = parts.some((p) => p.type === "reasoning");
    const hasToolCall = parts.some((p) => p.type === "tool-get_weather_tool");
    const hasDataToolReasoning = parts.some(
      (p) => p.type === "data-tool-reasoning",
    );
    const hasDataToolOutput = parts.some((p) => p.type === "data-tool-output");
    const hasFinalText = parts.some((p) => p.type === "text" && p.text?.trim());

    // Get the latest output part specifically (for final weather report)
    const latestOutputPart = [...parts]
      .reverse()
      .find((p) => p.type === "data-tool-output");

    // Get latest reasoning part
    const latestReasoningPart = [...parts]
      .reverse()
      .find((p) => p.type === "data-tool-reasoning");

    return parts.filter((part) => {
      // Hide step-start once we have reasoning or anything else
      if (part.type === "step-start") {
        return (
          !hasReasoning &&
          !hasToolCall &&
          !hasDataToolReasoning &&
          !hasDataToolOutput &&
          !hasFinalText
        );
      }

      // Always show reasoning (it collapses itself)
      if (part.type === "reasoning") {
        return true;
      }

      // Hide tool-call once we have data parts
      if (part.type === "tool-get_weather_tool") {
        return !hasDataToolReasoning && !hasDataToolOutput;
      }

      // Show latest reasoning part (only if output hasn't started yet)
      if (part.type === "data-tool-reasoning") {
        // If we have output with content, hide reasoning
        const hasOutputWithContent = latestOutputPart?.data?.text?.trim();
        if (hasOutputWithContent) return false;
        return part === latestReasoningPart;
      }

      // Show latest output part
      if (part.type === "data-tool-output") {
        return part === latestOutputPart;
      }

      // Show text only if it has content
      if (part.type === "text") {
        return Boolean(part.text?.trim());
      }

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

          // Tool status display - handles all tool-related parts
          if (
            part.type === "tool-get_weather_tool" ||
            part.type === "data-tool-reasoning" || part.type === "data-tool-output"
            
          ) {
            // Determine which status to show and what text to display
            let statusMessage = "";
            let statusBadge = "";
            let isComplete = false;
            let toolText = "";

            if (part.type === "tool-get_weather_tool") {
              statusMessage = "Running weather tool";
              statusBadge = "calling";
            } else if (part.type === "data-tool-reasoning") {
              const reasoningStatus = part.data?.status;
              statusBadge = reasoningStatus || "processing";
              toolText = part.data?.text || "";

              if (reasoningStatus === "streaming") {
                statusMessage = "Processing Weather Data";
              } else if (reasoningStatus === "complete") {
                statusMessage = "Processing Complete";
                isComplete = true;
              } 
              if(part.type === "data-tool-output" && part.data?.status === "complete"){
                statusMessage = "Weather Job Completed";
              }
            } 

            return (
              <div
                key={i}
                className={cn(
                  "rounded-md border px-3 py-2 text-sm my-2",
                  isComplete
                    ? "border-green-500/50 bg-green-500/10"
                    : "border-blue-500/50 bg-blue-500/10",
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <HugeiconsIcon
                      icon={ToolsIcon}
                      className={cn(
                        "size-[16px]",
                        !isComplete && "animate-pulse",
                      )}
                    />
                    <span className="font-medium">{statusMessage}</span>
                  </div>
                  <span
                    className={cn(
                      "text-xs capitalize",
                      isComplete ? "text-green-500" : "text-blue-500",
                    )}
                  >
                    {statusBadge}
                  </span>
                </div>
                {toolText && (
                  <div className="text-xs text-muted-foreground mt-2 italic line-clamp-4">
                    <Markdown className="text-sm">{toolText}</Markdown>
                  </div>
                )}
              </div>
            );
          }

          // 5️⃣ Final text - StreamingMessage with the text
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

function AgentSidebar() {
  const [viewHistory, setViewHistory] = useState(false);
  const { messages, sendMessage, setMessages } = useChat<MyUIMessage>({
    // transport: new DefaultChatTransport({
    //   api: "/api/test",
    // }),
    onError: (error) => {
      console.error("Error sending message:", error);
    },
  });
  const [isThinking, setIsThinking] = useState(false);

  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change - use a ref-based approach
  useEffect(() => {
    // Use requestAnimationFrame to avoid triggering during render
    const timeoutId = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [messages.length]); // Only depend on length, not the entire messages array

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    // if (!inputValue.trim() || isLoading) return;

    try {
      const text = inputValue;
      setInputValue("");

      // Send message to API - useChat will handle adding it to messages
      setIsThinking(true);
      sendMessage({ text, metadata: { userMessage: text } });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };
  // Stop thinking when assistant starts responding - only check when message count changes
  useEffect(() => {
    const lastMessage = messages[messages.length - 1];
    if (lastMessage && lastMessage.role === "assistant") {
      const hasContent = lastMessage.parts.some(
        (part) =>
          part.type === "reasoning" ||
          (part.type === "text" && part.text?.trim()) ||
          part.type === "data-tool-output" ||
          part.type === "data-tool-reasoning",
      );
      if (hasContent) {
        setIsThinking(false);
      }
    }
  }, [messages.length]); // Only depend on length to avoid infinite loops
  console.log(messages);

  // Memoize isLoading to prevent recalculation on every render
  const isLoading = useMemo(
    () =>
      messages.some((message) => {
        if (message.role !== "assistant") return false;
        // Check if any part is still streaming/processing
        return message.parts.some((part) => {
          if (part.type === "reasoning") {
            return false;
          } else if (part.type === "data-tool-output") {
            return false;
          } else if (part.type === "data-tool-reasoning") {
            return false;
          } else if (part.type === "text") {
            return false;
          }

          return true;
        });
      }),
    [messages.length],
  ); // Only recalculate when message count changes

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
            <HistoryIcon size="20" />
          </Button>
          <Button variant={"ghost"} size="icon-sm">
            <MenuIcon size="20" />
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
            {isLoading && (
              <div className="mb-4 flex justify-start">
                <div className="max-w-[85%] rounded-lg p-3 bg-muted text-foreground">
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
                  disabled={isLoading}
                  placeholder="Ask AI anything..."
                  className="flex-1 h-24 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button
                  size="icon"
                  className="self-end"
                  type="submit"
                  disabled={isLoading || !inputValue.trim()}
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
