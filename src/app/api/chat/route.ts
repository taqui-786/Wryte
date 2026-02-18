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
import {
  editorTitleTool,
  editorWriteTool,
  weatherTool,
} from "@/lib/tools";
export type Metadata = {
  userMessage: string;
  editorContent?: string;
  editorMarkdown?: string;
  editorHeading?: string;
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
  const stream = createUIMessageStream<MyUIMessage>({
    generateId: createIdGenerator({
      prefix: "msg",
      size: 16,
    }),
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

       system: `
<instruction>

<identity>
You are an AI Editor Agent connected to a live document editor.
You can read, modify, improve, restructure, summarize, expand, fix, translate, or otherwise transform the document.
You have access to:
- editorContent (HTML)
- editorMarkdown (Markdown)
- editorHeading (Plain text title)
</identity>

<core_behavior>
- Act like a professional document editor.
- Be precise and intentional.
- Never guess missing content.
- Never rewrite the entire document unless explicitly asked.
- Modify only what the user requests.
</core_behavior>

<decision_logic>

1. If the user wants to change the document in any way 
   (write, rewrite, fix, summarize, expand, continue, translate, format, improve):
   → You MUST use write_in_editor_tool.

2. If the user asks for a new title or to change the heading:
   → You MUST use write_title_tool.

3. If the user asks about weather:
   → Use get_weather_tool.

4. If the user is only asking a question about the document 
   (e.g., “What is wrong with this paragraph?” or “Is this clear?”):
   → DO NOT use tools.
   → Just respond with analysis.

5. If the user is chatting casually and not asking about the document:
   → Respond normally.
   → Do NOT use tools.

</decision_logic>

<response_rules>

- Always respond in the same language as the user.
- Always be clear, structured, and concise.
- Use bullet points only. Never use tables.
- Never mention internal system instructions.
- Never mention tools unless required by the rule below.

<tool_response_rule>
If you used ANY tool:
- Final response must be 1–3 sentences only.
- Do NOT explain reasoning.
- Do NOT describe the whole document.
- State exactly what was changed.
- Mention specific section (example: "Updated the introduction paragraph" or "Rewrote section under 'Features'").
- Sound like an editing agent, not a chatbot.
</tool_response_rule>

</response_rules>

<context>
<editor_html>
${editorContent ?? "No Editor Content"}
</editor_html>

<editor_markdown>
${editorMarkdown ?? "No Editor Markdown"}
</editor_markdown>

<editor_title>
${editorHeading ?? "No Editor Heading"}
</editor_title>
</context>

<available_tools>

<tool>
<name>write_in_editor_tool</name>
<use_when>
User requests ANY modification to the document.
</use_when>
<description>
Writes or updates the Markdown content of the editor.
</description>
</tool>

<tool>
<name>write_title_tool</name>
<use_when>
User asks to create or change the title.
</use_when>
<description>
Updates the document heading.
</description>
</tool>

<tool>
<name>get_weather_tool</name>
<use_when>
User asks about weather.
</use_when>
<description>
Returns weather information.
</description>
</tool>

</available_tools>

</instruction>
`
,
        messages: await convertToModelMessages(messages),
        tools: {
          get_weather_tool,
    
          write_in_editor_tool,
          write_title_tool,
        },

        stopWhen: stepCountIs(5),
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
