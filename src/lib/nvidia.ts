// 'use server'
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { generateText } from "ai";
export const nim = createOpenAICompatible({
  name: "nim",
  baseURL: "https://integrate.api.nvidia.com/v1",
  headers: {
    Authorization: `Bearer ${process.env.AI_GATEWAY_API_KEY}`,
  },
});

export const mainModel = nim.chatModel("moonshotai/kimi-k2.5"); // working ✅ fast
const testing = async () =>{
  const result = await generateText({
    model:mainModel,
    prompt:"hello there"
  })
  console.log(result.text);
   
}
testing();
