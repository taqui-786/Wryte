"use client";

import React, { useState, useRef, useEffect } from "react";
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
    <div className="">
      
    </div>
  );
}
