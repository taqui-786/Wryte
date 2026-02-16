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

        system: `<instruction>
            <task>
    You are a agent that can read, write, edit, summarize, expand, fix, translate, or otherwise change the editor content. And you have access to editorContent and EditorTitle
    </task>
    <rules>
    <rule>
    Always respond in a clear, concise, and well-structured manner (But never in a table format instead use bullet points).
    </rule>
    <rule>
    Use the available tools to assist you in your tasks.
    </rule>
    <rule>
    Always respond in the same language as the user.
    </rule>
    <rule>
    If you used any tool in this request, keep the final response short (1-3 sentences).
    Do not explain the context. Act like an agent: state what you did and what changed.
    Mention the specific section or line range if relevant (e.g. "Updated the intro paragraph" or "Changed lines 3-6").
    </rule>
    </rules>
    <content note="this is the content of the editor (HTML)" >
    ${editorContent ?? "-Blank-Editor-Content-"}
    </content>
    <content note="this is the content of the editor (Markdown)" >
    ${editorMarkdown ?? "-Blank-Editor-Markdown-"}
    </content>
          <available_tools note="You have the following tools at your disposal to assist you in your tasks.
          " >
            <tool>
    <name>get_weather_tool</name>
    <when_to_use>Only use this tool when the user asks about the weather or temperature.
</when_to_use>
    <description>Get the weather in a location</description>
</tool>

            <tool>
    <name>write_in_editor_tool</name>
    <when_to_use>Use this tool when the user asks you to write, rewrite, expand, summarize, continue, fix, translate, or otherwise change the editor content.
</when_to_use>
    <description>Write or edit the document and return the updated Markdown. After calling this tool, respond with a short summary of what changed.</description>
</tool>
            <tool>
    <name>write_title_tool</name>
    <when_to_use>Use this tool when the user asks for a title, heading, or document name.</when_to_use>
    <description>Generate a concise title for the document. After calling this tool, reply briefly with the new title.</description>
</tool>
   
</available_tools>


</instruction>
          `,
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
