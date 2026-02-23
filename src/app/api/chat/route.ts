import { groq } from "@ai-sdk/groq";
import {
  UIMessage,
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
} from "ai";
import { editorTitleTool, editorWriteTool, weatherTool } from "@/lib/tools";
import { saveAgentMessages } from "@/lib/serverAction";
import { assistentPrompt } from "@/lib/prompt-utils";
export type Metadata = {
  userMessage: string;
  editorContent?: string;
  editorMarkdown?: string;
  editorHeading?: string;
  chatId?: string;
};
export type MyUIMessage = UIMessage<
  Metadata, // so this is extra information
  {
    "main-response": {
      text: string;
      status: "streaming" | "complete";
    };
    "tool-output": {
      text: string;
      status: "processing" | "streaming" | "complete";
    };
    "tool-reasoning": {
      text: string;
      status: "processing" | "reasoning" | "complete";
    };
    "editor-update": {
      markdown: string;
      status: "processing" | "streaming" | "complete";
      action?: string;
    };
    "title-update": {
      title: string;
      status: "processing" | "streaming" | "complete";
    };
    get_weather_tool: {
      status: "processing";
    };
    get_editor_content_tool: {
      status: "processing";
    };
    write_in_editor_tool: {
      status: "processing";
    };
    write_title_tool: {
      status: "processing";
    };
  },
  {
    // Tool defination
    get_weather_tool: {
      input: { location: string };
      output: string;
    };
    get_editor_content_tool: {
      input: Record<string, never>;
      output: string;
    };
    write_in_editor_tool: {
      input: {
        action: string;
        instructions: string;
        selection?: string;
      };
      output: string;
    };
    write_title_tool: {
      input: {
        instructions?: string;
      };
      output: string;
    };
    read_website_content: {
      input: { website_url: string };
      output: {
        url: string;
        title: string;
        content: string;
      };
    };
  }
>;

export async function POST(req: Request) {
  const { messages }: { messages: MyUIMessage[] } = await req.json();
  const latestMetadata = messages[messages.length - 1]?.metadata;
  const editorContent = latestMetadata?.editorContent;
  const editorMarkdown = latestMetadata?.editorMarkdown;
  const editorHeading = latestMetadata?.editorHeading;
  const chatId = latestMetadata?.chatId;
  const stream = createUIMessageStream<MyUIMessage>({
    generateId: createIdGenerator({
      prefix: "msg",
      size: 16,
    }),
    originalMessages: messages,
    onFinish: async ({ messages: finalMessages }) => {
      if (chatId) {
        try {
          await saveAgentMessages(
            chatId,
            finalMessages.map((m) => ({
              id: m.id,
              role: m.role,
              parts: m.parts,
            })),
          );
        } catch (error) {
          console.error("Failed to save agent messages:", error);
        }
      }
    },
    execute: async ({ writer }) => {
      const get_weather_tool = weatherTool({ writer });

      const write_in_editor_tool = editorWriteTool({
        writer,
        editorContent,
        editorMarkdown,
      });
      const write_title_tool = editorTitleTool({
        writer,
        editorContent,
        editorMarkdown,
      });
      const result = streamText({
        model: groq("openai/gpt-oss-20b"),

        system: assistentPrompt({
          editorContent,
          editorMarkdown,
          editorHeading,
        }),

        messages: await convertToModelMessages(messages),
        tools: {
          get_weather_tool,

          write_in_editor_tool,
          write_title_tool,
        },

        stopWhen: stepCountIs(10),
        experimental_transform: smoothStream({
          delayInMs: 15,
          chunking: /[^-]*---/,
        }),
      });
      writer.merge(result.toUIMessageStream());
    },
  });
  return createUIMessageStreamResponse({ stream });
}
