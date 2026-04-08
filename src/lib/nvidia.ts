// 'use server'
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { ToolLoopAgent, generateText, tool } from "ai";
import z from "zod";
export const nim = createOpenAICompatible({
  name: "nim",
  baseURL: "https://integrate.api.nvidia.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
  },
});

export const mainModel = nim.chatModel("nvidia/nemotron-3-super-120b-a12b"); // working ✅ fast - reasoning
export const toolModel = nim.chatModel("nvidia/nemotron-3-super-120b-a12b"); // working ✅ fast

