import React, { useEffect, useRef, useState } from "react";
import { Button } from "../ui/button";
import { PlusIcon } from "../UserSidebar";
import { HistoryIcon, MenuIcon } from "../customIcons";
// import { fetchServerSentEvents, useChat } from "@tanstack/ai-react";
import { useChat } from "@ai-sdk/react";
import { ChevronDown, ChevronUp, Brain } from "lucide-react";
import { cn } from "@/lib/utils";

// Types for messages
interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  thinking?: string;
  thinkingDuration?: number;
  thinkingStartTime?: number;
  timestamp: Date;
}

// Thinking component that shows collapsible reasoning
function ThinkingMessage({
  thinking,
  duration,
  isStreaming,
  startTime,
}: {
  thinking: string;
  duration?: number;
  isStreaming?: boolean;
  startTime?: number;
}) {
  const [isExpanded, setIsExpanded] = useState(true); // Start expanded by default
  const [realtimeDuration, setRealtimeDuration] = useState(0);
  const [hasAutoCollapsed, setHasAutoCollapsed] = useState(false);

  // Real-time duration tracking
  useEffect(() => {
    if (isStreaming) {
      const interval = setInterval(() => {
        const newSec = realtimeDuration + 1;
        setRealtimeDuration(newSec);
      }, 100); // Update every 100ms for smooth counting

      return () => clearInterval(interval);
    } else if (duration !== undefined) {
      // setRealtimeDuration(duration);
    }
  }, [isStreaming]);

  // Auto-collapse after 1.5 seconds when reasoning is complete
  useEffect(() => {
    if (!isStreaming && !hasAutoCollapsed) {
      const timer = setTimeout(() => {
        setIsExpanded(false);
        setHasAutoCollapsed(true);
      }, 1500);

      return () => clearTimeout(timer);
    }
  }, [isStreaming, hasAutoCollapsed]);

  // Auto-expand when streaming
  const shouldShowContent = isStreaming || isExpanded;

  return (
    <div className="mb-2">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        disabled={isStreaming}
      >
        <Brain className="w-4 h-4" />
        <span className={cn({ "animate-pulse": isStreaming })}>
          {isStreaming
            ? `Thinking ${realtimeDuration} seconds`
            : `Thought for ${realtimeDuration} seconds`}
        </span>
        {!isStreaming && (
          <>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </>
        )}
      </button>
      {shouldShowContent && thinking && (
        <div className="mt-2 p-3 bg-muted/50 rounded-lg text-sm text-muted-foreground space-y-2 border border-border/50">
          {thinking.split("\n").map((line, idx) => (
            <p key={idx}>{line}</p>
          ))}
          {/* Show streaming cursor during thinking */}
          {isStreaming && (
            <span className="inline-block w-1 h-4 ml-1 bg-muted-foreground animate-pulse" />
          )}
        </div>
      )}
    </div>
  );
}

// Message bubble component
function MessageBubble({
  message,
  isStreaming,
  isThinkingStreaming,
}: {
  message: ChatMessage;
  isStreaming?: boolean;
  isThinkingStreaming?: boolean;
}) {
  const isUser = message.role === "user";

  return (
    <div className={`mb-4 flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-lg p-3 ${
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-muted text-foreground"
        }`}
      >
        {!isUser && message.thinking && (
          <ThinkingMessage
            thinking={message.thinking}
            duration={message.thinkingDuration}
            isStreaming={isThinkingStreaming}
            startTime={message.thinkingStartTime}
          />
        )}
        <div className="text-sm whitespace-pre-wrap">
          {message.content}
          {/* Show streaming cursor for messages being generated */}
          {isStreaming && !isUser && (
            <span className="inline-block w-1 h-4 ml-1 bg-foreground animate-pulse" />
          )}
        </div>
      </div>
    </div>
  );
}

function AgentSidebar() {
  const [viewHistory, setViewHistory] = useState(false);
  const { messages, sendMessage, setMessages } = useChat();
  const [myMessages, setMyMessages] = useState<ChatMessage[]>([]);
  const isLoading = false;
  // const {
  //   messages: aiMessages,
  //   sendMessage,
  //   isLoading,
  // } = useChat({
  //   connection: fetchServerSentEvents("/api/model"),
  // });
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: "smooth",
      });
    }
  }, [messages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    // if (!inputValue.trim() || isLoading) return;

    try {
      const text = inputValue;
      setInputValue("");

      // Send message to API - useChat will handle adding it to messages
      sendMessage({ text });
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  console.log(messages);

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
              setMyMessages([]);
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
            className="flex-1 min-h-0 overflow-y-auto p-4 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent"
          >
            {messages.length === 0 ? (
              <div className="h-full flex items-center justify-center text-muted-foreground">
                <p>Start a conversation with AI agent...</p>
              </div>
            ) : (
              messages.map((message, index) => {
                // Determine if this is the last assistant message and is currently streaming
                const isLastMessage = index === messages.length - 1;
                const isAssistantMessage = message.role === "assistant";
                const isCurrentlyLoading =
                  isLastMessage && isAssistantMessage && isLoading;

                // Parse parts array efficiently in a single iteration
                let textContent = "";
                let reasoningText = "";
                let thinkingStartTime: number | undefined;
                let thinkingEndTime: number | undefined;

                for (const part of message.parts) {
                  if (part.type === "text" && part.text) {
                    textContent = part.text;
                  } else if (part.type === "reasoning" && part.text) {
                    reasoningText = part.text;
                    // Mark when reasoning starts if not already set
                    if (!thinkingStartTime) {
                      thinkingStartTime = Date.now();
                    }
                  } else if (part.type === "step-start") {
                    console.log("render assistent message");

                    thinkingStartTime = Date.now();
                  }
                }

                // Use text content directly (no JSON parsing needed)
                const parsedContent = textContent;

                // Calculate thinking duration if we have timing info
                if (thinkingStartTime && reasoningText) {
                  thinkingEndTime = Date.now();
                }

                const thinkingDuration =
                  thinkingStartTime && thinkingEndTime
                    ? (thinkingEndTime - thinkingStartTime) / 1000
                    : undefined;

                const messageObject: ChatMessage = {
                  id: message.id,
                  content: parsedContent || "",
                  role: message.role,
                  timestamp: new Date(),
                  thinking: reasoningText || undefined,
                  thinkingDuration,
                  thinkingStartTime,
                };

                // Message content is streaming when loading but NOT in thinking phase
                const isMessageStreaming = isCurrentlyLoading;
                const reasoningPart = message.parts.find(
                  (part) => part.type === "reasoning"
                );
                const isThinkingStreaming =
                  message.role === "assistant" &&
                  reasoningPart &&
                  "state" in reasoningPart &&
                  reasoningPart.state === "streaming";

                return (
                  <MessageBubble
                    key={message.id}
                    message={messageObject}
                    isStreaming={isMessageStreaming}
                    isThinkingStreaming={isThinkingStreaming}
                  />
                );
              })
            )}
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

[
  {
    parts: [
      {
        type: "text",
        text: "hey there",
      },
    ],
    id: "DDmtyHoT0vpBOflg",
    role: "user",
  },
  {
    id: "XnZQA6vHgRQki3iQ",
    role: "assistant",
    parts: [
      {
        type: "step-start",
      },
      {
        type: "reasoning",
        text: 'We need to output a JSON object with fields "message" and "reasoning". The user says "hey there". We should respond with a friendly greeting. Need to include reasoning explaining the answer. Ensure JSON is valid, compact, no extra whitespace. So final output is JSON with message and reasoning.',
        state: "done",
      },
      {
        type: "text",
        text: '{"reasoning":"The user greeted the assistant. The assistant should respond with a friendly greeting, and provide a brief explanation in the reasoning field.","message":"Hello! How can I help you today?"}',
        state: "done",
      },
    ],
  },
];
