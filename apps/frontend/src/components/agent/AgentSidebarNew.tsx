"use client";

import {
  Brain01FreeIcons,
  Clock04Icon,
  Loading02Icon,
  Loading03FreeIcons,
  Menu01Icon,
  PlusSignIcon,
  SentIcon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import type { InferSelectModel } from "drizzle-orm";
import { useCallback, useEffect, useRef, useState } from "react";
import type { messages, thread } from "@/db/schema/auth-schema";
import { readChatStream } from "@/lib/chat-stream";
import { useCreateNewThread } from "@/lib/queries/createNewThread";
import { useSaveAgentMessages } from "@/lib/queries/saveMessagesQuery";
import { updateLastAiMessage } from "@/lib/update-last-message";
import { cn } from "@/lib/utils";
import { Button } from "../ui/button";
import AgentHistoryPanel from "./agent-sidebar/AgentHistoryPanel";
import { MessageBubble } from "./agent-sidebar/messageBubble";
import {
  NodeType,
  type AIMessage,
  type AIMessageResponse,
  type HumanMessage,
} from "./agent-sidebar/types";
import { AIChange } from "../my-editor/MyEditor";

const AgentSidebarNew: React.FC<{
  docId: string;
  userId: string;
  editorValue: string;
  onEditorAppend?: (value: string) => void;
  onEditorReplace?: (value: string) => void;
  allThreads: (InferSelectModel<typeof thread> & {
    messages: InferSelectModel<typeof messages>[];
  })[];
}> = ({
  docId,
  userId,
  editorValue,
  onEditorAppend,
  onEditorReplace,
  allThreads,
}) => {
  const [viewHistory, setViewHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState("");
  const [isThinking, setIsThinking] = useState(false);
  const [messages, setMessages] = useState<AIMessageResponse>([]);

  const [activeThreadId, setActiveThreadId] = useState<string | undefined>(
    undefined,
  );
  const [threadTitle, setThreadTitle] = useState<string>("New Chat");
  const [threadId, setThreadId] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const latestMessagesRef = useRef<AIMessageResponse>([]);
  const [node, setNode] = useState<NodeType[]>(["chat_node"]);
  // My Queries -----------------
  const { mutate: saveAgentMessages, isPending: isSavingMessages } =
    useSaveAgentMessages();
  const { mutate: createNewThread } = useCreateNewThread();

  function handleSaveMessages(
    messagesToSave: Array<HumanMessage | AIMessage>,
    myThreadId: string,
  ) {
    if (!myThreadId) return;
    saveAgentMessages({
      threadId: myThreadId,
      messages: messagesToSave,
    });
  }

  const handleSend = useCallback(async () => {
    const text = inputValue.trim();
    if (!text) return;
    let newThreadId: string | null = threadId;
    setInputValue("");
    setIsThinking(true);

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

    const randThreadId = crypto.randomUUID();

    const thread_id = activeThreadId ?? randThreadId;

    const initialMsgs = [userMsg, assistantMsg] as AIMessageResponse;
    latestMessagesRef.current = initialMsgs;
    setMessages((prev) => [...prev, userMsg, assistantMsg]);

    abortRef.current?.abort();
    const ab = new AbortController();
    abortRef.current = ab;

    const TIMEOUT_MS = 500000;
    const timeoutId = setTimeout(() => ab.abort(), TIMEOUT_MS);

    try {
      await readChatStream(
        {
          message: text,
          thread_id,
          user_id: userId,
          editor_content: editorValue,
        },
        {
          onChunk: (chunk) => {
            setNode((prev) => [...prev, chunk.node]);

            // Handle edit_document tool result artifact (full updated document)
            if (
              chunk.node === "tools" &&
              chunk.message.type === "tool" &&
              chunk.message.name === "edit_document"
            ) {
              const updatedDoc = (chunk.message as any).artifact;
              if (typeof updatedDoc === "string") {
                onEditorReplace?.(updatedDoc);
              }
            }

            // Handle full content from humanize (for initial writes, not edits)
            if (chunk.node === "humanize") {
              const text =
                typeof chunk.message.content === "string"
                  ? chunk.message.content
                  : Array.isArray(chunk.message.content)
                    ? chunk.message.content
                        .filter((b: any) => b.type === "text")
                        .map((b: any) => b.text)
                        .join("")
                    : "";
              if (text) {
                onEditorAppend?.(text);
              }
            }

            // Rest: update message UI and keep ref in sync
            setMessages((prev) => {
              const next = updateLastAiMessage(prev, chunk);
              // Mirror the last two messages (human + ai) into the ref so onDone saves final content
              latestMessagesRef.current = next.slice(-2) as AIMessageResponse;
              return next;
            });
          },
          onDone: () => {
            setIsThinking(false);
            handleSaveMessages(
              latestMessagesRef.current,
              newThreadId as string,
            );
          },
        },
        { signal: ab.signal },
      );
      if (!activeThreadId) {
        setActiveThreadId(randThreadId);
        createNewThread(
          { stateId: randThreadId, docId, prompt: text },
          {
            onSuccess(data) {
              setThreadTitle(data.title);
              setThreadId(data.id);
              newThreadId = data.id;
              handleSaveMessages(latestMessagesRef.current, data.id);
            },
          },
        );
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        console.error("Chat stream failed:", error);
      }
    } finally {
      clearTimeout(timeoutId);

      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [inputValue, activeThreadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  });

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
            disabled={isSavingMessages}
            onClick={() => {
              setMessages([]);
              setActiveThreadId(crypto.randomUUID());
            }}
          >
            {isSavingMessages ? (
              <HugeiconsIcon
                icon={Loading02Icon}
                size="20"
                className="animate-spin text-primary"
              />
            ) : (
              <HugeiconsIcon icon={PlusSignIcon} size="20" />
            )}
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
        <AgentHistoryPanel
          allChats={allThreads}
          activeChatId={activeThreadId as string}
          onSelectChat={(id, title, msgs) => {
            setThreadTitle(title);
            setActiveThreadId(id);
            setThreadId(id);
            setMessages(() => {
              const sorted = msgs.sort((a, b) => Number(a?.createdAt) - Number(b?.createdAt));
              return sorted.map((m) => {
                const rawData = m.data as any;
                if (m.role === "human") {
                  const content: string = rawData?.content ?? "";
                  return {
                    type: "human",
                    data: {
                      ...rawData,
                      type: "human",
                      additional_kwargs: rawData?.additional_kwargs ?? {},
                      response_metadata: rawData?.response_metadata ?? {},
                    },
                    parts: [{ type: "text", text: content }],
                  } as AIMessageResponse[number];
                } else {
                  const content: string = rawData?.content ?? "";
                  // Filter out garbage partial tool calls saved mid-stream (null id or empty name)
                  const validToolCalls: any[] = (
                    rawData?.tool_calls ?? []
                  ).filter((tc: any) => tc?.id && tc?.name);
                  const parts: any[] = [];
                  const reasoning =
                    rawData?.additional_kwargs?.reasoning_content ||
                    rawData?.additional_kwargs?.reasoning;
                  if (reasoning) {
                    parts.push({ type: "reasoning", content: reasoning });
                  }
                  // Add tool calls to parts so MessageBubble renders them
                  for (const tc of validToolCalls) {
                    parts.push({
                      type: "tool_call",
                      toolCall: { ...tc, isRunning: false },
                    });
                  }
                  if (content) {
                    parts.push({ type: "content", content });
                  }
                  return {
                    type: "ai",
                    loaded: true,
                    data: {
                      ...rawData,
                      type: "ai",
                      additional_kwargs: rawData?.additional_kwargs ?? {},
                      response_metadata: rawData?.response_metadata ?? {},
                      tool_calls: validToolCalls,
                      invalid_tool_calls: rawData?.invalid_tool_calls ?? [],
                      usage_metadata: rawData?.usage_metadata ?? null,
                    },
                    parts,
                  } as AIMessageResponse[number];
                }
              });
            });
            setViewHistory(false);
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
              messages.map((message, index) => (
                <MessageBubble
                  node={node}
                  key={message.data?.id || index}
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
