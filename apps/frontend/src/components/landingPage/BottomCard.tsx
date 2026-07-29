import React from "react";
import {
  FixGrammerCard,
  PromptGenerateCard,
  ScoreCard,
  SummarizeCard,
  TickCard,
  ToolsCard,
  UseAiCard,
} from "./ComponentsCards";

function BottomCard() {
  return (
    <div className="relative w-full max-w-5xl mx-auto  p-2 h-48 flex">
      <ScoreCard />
      <SummarizeCard />
      <PromptGenerateCard />
      <FixGrammerCard />
      <ToolsCard />
      <UseAiCard />
      <TickCard />
    </div>
  );
}

export default BottomCard;
