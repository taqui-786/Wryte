"use client";
import {
  ReasoningNew,
  ReasoningNewContent,
  ReasoningNewTrigger,
} from "@/components/ai-elements/reasoning-new";
import React from "react";

const test = () => {
  const [value, setValue] = React.useState<string[]>([]);
  const [isStreaming, setIsStreaming] = React.useState(false);
  function afterTesting() {
    setIsStreaming(true);
    const texts = [
      "this",
      "is NEXT-LEVEL",
      "thinking",
      "So this in insane",
      "Gotacc ??",
      "Buddy",
      "Okay then",
      "Bye",
      "Taqui",
      "...",
    ];
    let index = 0;
    const interval = setInterval(() => {
      setValue((prev: string) => [...prev, texts[index]]);
      index++;
      if (index >= texts.length) {
        clearInterval(interval);
      }
    }, 500);
    setTimeout(() => {
      setIsStreaming(false);
    }, 5000);
  }
  function testing() {
    setIsStreaming(true);
    const texts = [
      "Let's start thinking",
      "more and more",
      "and then more and more",
      "Yess, more and more",
      "No worries, this is a chunk",
      "Just for testing you know",
      "okey",
      "Finally ",
      "done",
    ];

    let index = 0;

    const interval = setInterval(() => {
      setValue((prev) => [...prev, texts[index]]);

      index++;

      if (index >= texts.length) {
        clearInterval(interval);
      }
    }, 500);
    
      //   clearTimeout(newTimer);
      // stop fully after 3 sec
      setTimeout(() => {
        clearInterval(interval);
        setIsStreaming(false);
        setTimeout(() => {
          afterTesting()
        }, 3000);
  
    }, 4500);
  }
  return (
    <div className="flex h-full items-center justify-center">
      <div className="max-w-lg">
        <ReasoningNew isStreaming={isStreaming}>
          <ReasoningNewTrigger />
          <ReasoningNewContent chunk={value.join(" ")}/>
        </ReasoningNew>
        <button onClick={testing}>Test</button>
      </div>
    </div>
  );
};

export default test;
