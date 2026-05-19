"use client";

import {
  Brain01FreeIcons,
  Clock04Icon,
  Loading03FreeIcons,
  Menu01Icon,
  PlusSignIcon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import { useCreateNewThread } from "@/lib/queries/createNewThread";
import { InferSelectModel } from "drizzle-orm";
import { thread } from "@/db/schema/auth-schema";
import AgentHistoryPanel from "./agent-sidebar/AgentHistoryPanel";
import { useGetThreadMessages } from "@/lib/queries/getThreadMessages";
import {
  AIMessageResponse,
  HumanMessage,
  AIMessage,
} from "./agent-sidebar/types";
import { MessageBubble } from "./agent-sidebar/messageBubble";
import { normalizeThreadMessages } from "./agent-sidebar/normalizeMessages";

const AgentSidebarNew: React.FC<{
  docId: string;
  allThreads: InferSelectModel<typeof thread>[];
}> = ({ docId, allThreads }) => {
  const [viewHistory, setViewHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<AIMessageResponse>([]);
  const { mutate: createNewThread } = useCreateNewThread();
  const [threads, setThreads] =
    useState<InferSelectModel<typeof thread>[]>(allThreads);
  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(undefined);
  const [threadTitle, setThreadTitle] = useState<string>("New Chat");
  const {
    data: threadMessages,
    isLoading: isThreadMessagesFetching,
    isFetched:isThreadMessagesFetched
  } = useGetThreadMessages(
    activeThreadId
      || undefined
  );
  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text) return;

    setInputValue("");
    setIsThinking(true);

    try {
      const userMsg: HumanMessage = {
        type: "human",
        data: {
          id: crypto.randomUUID(),
          content: text,
          additional_kwargs: {},
          response_metadata: {},
          type: "human",
          name: null,
        },
        parts: [{ type: "text", text }],
      };
      const assistantMsg: AIMessage = {
        type: "ai",
        data: {
          id: crypto.randomUUID(),
          content: "",
          additional_kwargs: {},
          response_metadata: {
            finish_reason: "stop",
            model_name: "gpt-4o",
          },
          type: "ai",
          name: null,
          tool_calls: [],
          invalid_tool_calls: [],
          usage_metadata: {
            input_tokens: 0,
            output_tokens: 0,
            total_tokens: 0,
          },
        },
        parts: [],
      };
      const newThreadId = crypto.randomUUID();
      if (!activeThreadId) {
        setActiveThreadId(newThreadId);
        createNewThread(
          { stateId: newThreadId, docId, prompt: text },
          {
            onSuccess(data) {
              setThreadTitle(data.title);
            },
          },
        );
      }

      setMessages((prev) => [...prev, userMsg, assistantMsg]);

      const res = await fetch("/api/chat-proxy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text,
          thread_id: !activeThreadId ? newThreadId : activeThreadId,
        }),
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
              parts: last?.parts?.map((p: any) =>
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
  }, [inputValue, activeThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });
useEffect(() => {
if(threadMessages && isThreadMessagesFetched){
  setMessages(normalizeThreadMessages(threadMessages))
  setViewHistory(false);
}
},[threadMessages, isThreadMessagesFetched])

  return (
    <div className="h-full flex flex-col gap-4">
      {/* Heading */}
      <div className="w-full p-2 gap-2 flex items-center justify-between border-b">
        <h2 className="text-sm font-medium truncate block w-full">
          {threadTitle}
        </h2>
        <div className="flex items-center justify-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => {
              setMessages([]);
              setActiveThreadId(crypto.randomUUID());
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
      {isThreadMessagesFetching ? (
        <div className="flex items-center justify-center h-full">
          <HugeiconsIcon
            icon={Loading03FreeIcons}
            size="20"
            className="animate-spin"
          />
        </div>
      ) : (
        ""
      )}
      {viewHistory ? (
        <AgentHistoryPanel
          allChats={allThreads}
          activeChatId={activeThreadId as string}
          onSelectChat={(id) => {            
            setActiveThreadId(id);
          }}
        />
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
              messages.map((message) => (
                  <MessageBubble
                    key={message.data.id}
                    message={message}
                  />
              ))
            )}
            {isThinking &&
              messages[messages.length - 1]?.parts?.length === 0 && (
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
