"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat, fetchServerSentEvents } from "@tanstack/ai-react";

export default function ChatBot() {
  const {
    messages: aiMessages,
    sendMessage,
    isLoading,
  } = useChat({
    connection: fetchServerSentEvents("/api/model"),
    onChunk(chunk) {
      console.log("Received chunk:", chunk);
    },
  });
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [aiMessages]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    try {
      const text = inputValue;
      setInputValue("");
      const res = await sendMessage(text);
      //   await sendMessage(text);

      return res;
    } catch (error) {
      console.error("Error sending message:", error);
    }
  };

  // Helper to extract text from TanStack AI message parts
  const getMessageContent = (message: any) => {
    if (message.content) return message.content;
    if (message.parts && message.parts.length > 0) {
      return message.parts
        .map((part: any) => (part.type === "text" ? part.content : ""))
        .join("");
    }
    return "";
  };
  console.log({ aiMessages });

  return (
    <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
            <Bot size={24} />
          </div>
          <div>
            <h3 className="font-semibold text-zinc-900 dark:text-zinc-100">
              Wryte Assistant
            </h3>
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isLoading
                    ? "bg-amber-500 animate-pulse"
                    : "bg-green-500 animate-pulse"
                }`}
              />
              <span className="text-xs text-zinc-500">
                {isLoading ? "Thinking..." : "Online"}
              </span>
            </div>
          </div>
        </div>
        <Sparkles size={20} className="text-zinc-400" />
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-zinc-200 dark:scrollbar-thumb-zinc-800"
      >
        <AnimatePresence initial={false}>
          {aiMessages.length === 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center py-10"
            >
              <div className="bg-zinc-100 dark:bg-zinc-800 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                <Bot size={24} className="text-zinc-400" />
              </div>
              <p className="text-sm text-zinc-500">How can I help you today?</p>
            </motion.div>
          )}

          {aiMessages.map((msg) => {
            const content = getMessageContent(msg);
            if (!content && msg.role !== "user") return null;

            // Parse thinking and final content for assistant messages
            let thinkingContent = "";
            let finalContent = "";

            if (msg.role === "assistant") {
              // Split content by JSON block
              const jsonMatch = content.match(/\{[\s\S]*\}$/);
              if (jsonMatch) {
                thinkingContent = content.substring(0, jsonMatch.index).trim();
                try {
                  const jsonData = JSON.parse(jsonMatch[0]);
                  finalContent = JSON.stringify(jsonData, null, 2);
                } catch {
                  finalContent = jsonMatch[0];
                }
              } else {
                // No JSON found, treat entire content as final
                finalContent = content;
              }
            }

            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {msg.role === "user" ? (
                  <div className="max-w-[85%] p-3 rounded-2xl text-sm bg-blue-600 text-white rounded-tr-none">
                    {content}
                  </div>
                ) : (
                  <div className="max-w-[85%] space-y-2">
                    {/* Thinking Section */}
                    {thinkingContent && (
                      <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-xl p-3 text-xs">
                        <div className="flex items-center gap-2 mb-2 text-amber-700 dark:text-amber-400">
                          <Sparkles size={14} className="animate-pulse" />
                          <span className="font-semibold">
                            Thinking Process
                          </span>
                        </div>
                        <div className="text-amber-800 dark:text-amber-300 space-y-1 font-mono text-[10px] leading-relaxed opacity-80">
                          {thinkingContent.split("\n\n").map((section, idx) => {
                            const headerMatch = section.match(/^\*\*(.+?)\*\*/);
                            if (headerMatch) {
                              return (
                                <div key={idx} className="mb-1">
                                  <div className="font-bold text-amber-900 dark:text-amber-200">
                                    {headerMatch[1]}
                                  </div>
                                  <div className="mt-0.5 pl-2">
                                    {section.replace(/^\*\*.+?\*\*\n/, "")}
                                  </div>
                                </div>
                              );
                            }
                            return <div key={idx}>{section}</div>;
                          })}
                        </div>
                      </div>
                    )}

                    {/* Final Content */}
                    {finalContent && (
                      <div className="bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-2xl rounded-tl-none border border-zinc-200 dark:border-zinc-700 shadow-sm p-3 text-sm">
                        <pre className="whitespace-pre-wrap font-sans overflow-x-auto">
                          {finalContent}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            );
          })}

          {/* {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex justify-start"
            >
              <div className="bg-zinc-100 dark:bg-zinc-800 p-3 rounded-2xl rounded-tl-none border border-zinc-200 dark:border-zinc-700 flex gap-1">
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.3s]" />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce [animation-delay:-0.15s]" />
                <span className="w-1.5 h-1.5 bg-zinc-400 rounded-full animate-bounce" />
              </div>
            </motion.div>
          )} */}
        </AnimatePresence>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <form onSubmit={handleSend} className="relative flex items-center">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            placeholder={isLoading ? "AI is thinking..." : "Type a message..."}
            className="w-full bg-zinc-100 dark:bg-zinc-800 border-none rounded-xl py-3 pl-4 pr-12 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all dark:text-zinc-100 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className="absolute right-2 p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors shadow-lg shadow-blue-500/20"
          >
            <Send size={18} />
          </button>
        </form>
        <p className="text-[10px] text-center text-zinc-400 mt-2 italic">
          Powered by Wryte & TanStack AI
        </p>
      </div>
    </div>
  );
}
