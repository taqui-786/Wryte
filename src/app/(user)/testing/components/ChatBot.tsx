"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useChat, fetchServerSentEvents } from "@tanstack/ai-react";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { ToolsIcon } from "@hugeicons/core-free-icons";
import { Markdown } from "@/components/ui/markdown";
const dummyData = [
  {
    type: "step-start",
  },
  {
    type: "reasoning",
    text: 'The user asked: "what is the weather of london". According to the instructions, we must use get_weather_tool. Let\'s call it.',
    state: "done",
  },
  {
    type: "tool-get_weather_tool",
    toolCallId: "fc_455aff5e-5caf-4aa6-b075-0888c04f81a4",
    state: "output-available",
    input: {
      location: "London",
    },
    output:
      "**London Weather Report – 2026‑02‑04 15:30**\n\n**Location**  \nLondon, United Kingdom  \n\n**Current Conditions**  \n- Temperature: 9.6 °C  \n- Wind: 16 km/h from 82° (East)  \n\n**Short Summary**  \nThe weather in London feels cool, with mild breezes coming from the east. Temperatures hover around 9.6 °C and wind speeds are moderate at 16 km/h.",
  },
  {
    type: "data-tool-reasoning",
    id: "t7orgyKn2cGfmOuIxN3ce",
    data: {
      text: 'We have to produce a weather report. The format:\n\n- Title\n- Location\n- Current Conditions\n- Short summary at the end\n\nUse only data provided. Title: maybe "Weather Report" or "London Weather Update" or something. The data: location: London, United Kingdom. Temperature 9.6°C. Wind Speed 16 km/h, Wind Direction 82 degrees. Last Updated: 2026-02-04T15:30. The wind direction in degrees: 82°, which is roughly East by North? Actually 82° is slightly east of due east. So we can note "E" or "ENE" direction. 90° is due east. 82° is slightly north of east, maybe ENE (east-northeast). We might mention "East (82°)" or "E (82°)". The wind direction 82°, the wind speed 16 km/h. Temperature 9.6°C. We can mention "Current Conditions: Temperature 9.6°C, Wind 16 km/h from 82° (East)".\n\nAlso mention the last updated time. Format: Title, Location, Current Conditions, Short summary at the end.\n\nWe might add the last updated. Title: "London Weather Report - 2026-02-04". Then Location: "London, United Kingdom". Current Conditions: Temperature 9.6°C; Wind 16 km/h from 82° (East). Maybe "Wind direction: 82° (East)". Then summary: "The weather in London is cool with mild breezes. Temperatures are around 9.6°C and winds are moderate at 16 km/h from the east."\n\nWe need to keep simple, readable, well structured. Use bullet points? The instructions: "Format: - Title - Location - Current Conditions - Short summary at the end". So we might just list these lines.\n\nLet\'s produce:\n\nTitle: London Weather Report – 2026-02-04 15:30 UTC\n\nLocation: London, United Kingdom\n\nCurrent Conditions: Temperature: 9.6 °C; Wind: 16 km/h from 82° (East).\n\nShort summary: The city feels cool with light breezes from the east. Temperatures around 9.6°C and wind speeds of 16 km/h.\n\nWe should ensure we only use provided data. The last updated: 2026-02-04T15:30. Might mention "Updated: 2026-02-04 15:30". The time is in ISO 8601. Use same format.\n\nOk. Let\'s produce.',
      status: "complete",
    },
  },
  {
    type: "data-tool-output",
    id: "t7orgyKn2cGfmOuIxN3ce",
    data: {
      text: "**London Weather Report – 2026‑02‑04 15:30**\n\n**Location**  \nLondon, United Kingdom  \n\n**Current Conditions**  \n- Temperature: 9.6 °C  \n- Wind: 16 km/h from 82° (East)  \n\n**Short Summary**  \nThe weather in London feels cool, with mild breezes coming from the east. Temperatures hover around 9.6 °C and wind speeds are moderate at 16 km/h.",
      status: "complete",
    },
  },
  {
    type: "step-start",
  },
  {
    type: "text",
    text: "**London Weather Report – 2026‑02‑04 15:30**\n\n| Item | Value |\n|------|-------|\n| **Location** | London, United Kingdom |\n| **Temperature** | 9.6 °C |\n| **Wind** | 16 km/h from 82° (East) |\n\n**Short Summary**  \nThe weather in London feels cool, with mild breezes coming from the east. Temperatures hover around 9.6 °C and wind speeds are moderate at 16 km/h.",
    state: "done",
  },
];
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
      {dummyData.map((item, index) => {
        let statusMessage = "";
        let statusBadge = "";
        let isComplete = false;
        let toolText = "";

        if (item.type === "data-tool-reasoning") {
          const reasoningStatus = item.data?.status;
          statusBadge = reasoningStatus || "processing";
          toolText = item.data?.text || "";
          if (reasoningStatus === "processing") {
            statusMessage = "Running Weather Tool";
          } else if (reasoningStatus === "streaming") {
            statusMessage = "Processing Weather Data";
          } else if (reasoningStatus === "complete") {
            statusMessage = "Processing Complete";
          }
       
        }
           if (
            item.type === "data-tool-output" &&
            item.data?.status === "complete"
          ) {
            statusMessage = "Weather Job Completed";
            isComplete = true;
          }
        return (
          <>
            {(item.type === "data-tool-reasoning" && item.data.status !== 'complete') || (item.type === "data-tool-output" && item.data.status === 'complete') ? (
              <div
                key={index}
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
            ) : (
              ""
            )}
            <div key={index}>
              <p>{item.text}</p>
            </div>
          </>
        );
      })}
    </div>
  );
}
