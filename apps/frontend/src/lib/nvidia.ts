// 'use server'
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
export const nim = createOpenAICompatible({
  name: "nim",
  baseURL: "https://integrate.api.nvidia.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
  },
});

export const mainModel = nim.chatModel("google/gemma-4-31b-it"); // working ✅ fast - reasoning
export const toolModel = nim.chatModel("moonshotai/kimi-k2-instruct-0905"); // working ✅ fast
