import { Output, UIMessageStreamWriter, streamText, tool } from "ai";
import { nanoid } from "nanoid";
import z from "zod";
import { getCoordinates, getWeather } from "@/lib/serverAction";
import { groq } from "@ai-sdk/groq";
export const weatherTool = ({ writer }: { writer: UIMessageStreamWriter }) => {
  return tool({
    description: "Get the real weather for a location",
    inputSchema: z.object({
      location: z.string().describe("City or place name"),
    }),
    execute: async ({ location }) => {
      const generationId = nanoid();
      let reasoning = "";
      let isReasoningComplete = false;

      // Step 1: Initial reasoning status
      writer.write({
        type: "data-tool-reasoning",
        id: generationId,
        data: {
          text: "",
          status: "processing",
        },
      });

      writer.write({
        type: "data-tool-output",
        id: generationId,
        data: {
          text: "",
          status: "processing",
        },
      });

      // Step 2: Get coordinates
      const place = await getCoordinates(location);

      // Step 3: Get weather
      const weather = await getWeather(place.latitude, place.longitude);
      console.log(weather);

      // Step 4: Stream the response
      const result = streamText({
        model: groq("openai/gpt-oss-20b"),
        prompt: `
You are a weather assistant.

Using ONLY the data below, generate a clear and organized weather report.
Keep it simple, readable, and well structured.

Location: ${place.name}, ${place.country}
Temperature: ${weather.temperature} °C
Wind Speed: ${weather.windspeed} km/h
Wind Direction: ${weather.winddirection} degrees
Last Updated: ${weather.time}

Format:
- Title
- Location
- Current Conditions
- Short summary at the end
      `.trim(),
        onChunk: ({ chunk }) => {
          if (chunk.type === "reasoning-delta" && !isReasoningComplete) {
            reasoning += chunk.text;
            writer.write({
              type: "data-tool-reasoning",
              id: generationId,
              data: {
                text: reasoning,
                status: "reasoning",
              },
            });
          }
        },
        onStepFinish: async (step) => {
          const reasoningContent = step.content.find(
            (c) => c.type === "reasoning",
          );

          if (reasoningContent && reasoningContent.type === "reasoning") {
            isReasoningComplete = true;

            writer.write({
              type: "data-tool-reasoning",
              id: generationId,
              data: {
                text: reasoning,
                status: "complete",
              },
            });
          }
        },
      });

      let fullText = "";
      for await (const textPart of result.textStream) {
        fullText += textPart;
        writer.write({
          type: "data-tool-output",
          id: generationId,
          data: {
            text: fullText,
            status: "streaming",
          },
        });
      }

      writer.write({
        type: "data-tool-output",
        id: generationId,
        data: {
          text: fullText,
          status: "complete",
        },
      });

      return fullText;
    },
  });
};

export const editorWriteTool = ({
  writer,
  editorContent,
  editorMarkdown,
}: {
  writer: UIMessageStreamWriter;
  editorContent?: string;
  editorMarkdown?: string;
}) => {
  return tool({
    description:
      "Write or edit the current document and return the updated Markdown.",
    inputSchema: z.object({
      action: z
        .string()
        .describe(
          "Action to perform (e.g. rewrite, expand, summarize, continue, fix_grammar, change_tone, translate, custom).",
        ),
      instructions: z
        .string()
        .describe("User request or desired changes for the document."),
      selection: z
        .string()
        .optional()
        .describe("If provided, only edit this selection."),
    }),
    execute: async ({ action, instructions, selection }) => {
      const generationId = nanoid();

      writer.write({
        type: "data-editor-update",
        id: generationId,
        data: {
          markdown: "",
          status: "processing",
          action,
        },
      });

      const contextBlocks: string[] = [];
      const hasHtml = Boolean(editorContent?.trim());
      const hasMarkdown = Boolean(editorMarkdown?.trim());

      if (hasHtml) {
        contextBlocks.push(
          `Current document (HTML with data-line attributes):\n${editorContent?.trim()}`,
        );
      }

      if (hasMarkdown) {
        contextBlocks.push(
          `Current document (Markdown):\n${editorMarkdown?.trim()}`,
        );
      }

      if (!hasHtml && !hasMarkdown) {
        contextBlocks.push("Current document is empty.");
      }

      if (selection?.trim()) {
        contextBlocks.push(`Selection to edit:\n${selection.trim()}`);
      }

      const result = streamText({
        model: groq("openai/gpt-oss-20b"),
        output: Output.array({
          element: z.object({
            line: z.number(),
            type: z.enum(["replace", "delete", "insert"]),
            content: z.string(),
          }),
        }),
        system: `
You are an expert writing assistant.
Your job is to modify the document based on the user's instructions.
Return ONLY the lines that changed.
INFO: Each top-level block corresponds to a line using its data-line attribute in the HTML.
Use the data-line numbers from the HTML context.
INFO: Never start with Title/Heading or Subheading always start with a paragraph .
Rules:
- Only include lines that were modified.
- Do not return unchanged lines.
- If a selection is provided, only modify that selection.
- Use:
  - "replace" when updating a line,
  - "delete" when removing a line,
  - "insert" when adding a new line.
- The "content" field must contain the updated Markdown for that line (no wrapper tags).
        `.trim(),
        prompt: `
Action: ${action}
Instructions: ${instructions}

${contextBlocks.join("\n\n")}
        `.trim(),
      });

      let fullText = "";
      for await (const textPart of result.textStream) {
        fullText += textPart;
        writer.write({
          type: "data-editor-update",
          id: generationId,
          data: {
            markdown: fullText,
            status: "streaming",
            action,
          },
        });
      }

      const finalText = fullText.trim();
      writer.write({
        type: "data-editor-update",
        id: generationId,
        data: {
          markdown: finalText,
          status: "complete",
          action,
        },
      });

      return finalText;
    },
  });
};

export const editorTitleTool = ({
  writer,
  editorContent,
  editorMarkdown,
}: {
  writer: UIMessageStreamWriter;
  editorContent?: string;
  editorMarkdown?: string;
}) => {
  return tool({
    description: "Generate a concise, relevant title for the current document.",
    inputSchema: z.object({
      instructions: z
        .string()
        .optional()
        .describe("Optional guidance for the title style or constraints."),
    }),
    execute: async ({ instructions }) => {
      const generationId = nanoid();

      writer.write({
        type: "data-title-update",
        id: generationId,
        data: {
          title: "",
          status: "processing",
        },
      });

      const contextBlocks: string[] = [];
      if (editorMarkdown?.trim()) {
        contextBlocks.push(
          `Current document (Markdown):\n${editorMarkdown.trim()}`,
        );
      } else if (editorContent?.trim()) {
        contextBlocks.push(`Current document (HTML):\n${editorContent.trim()}`);
      } else {
        contextBlocks.push("Current document is empty.");
      }

      const result = streamText({
        model: groq("openai/gpt-oss-20b"),
        system: `
You are an expert editor.
Create a single, concise title for the document.
Return ONLY the title text with no quotes, no markdown, no extra commentary.
Info: if the title is "Untitled", always return somthing meaningull according to the document content.
        `.trim(),
        prompt: `
Instructions: ${instructions ?? "None"}

${contextBlocks.join("\n\n")}
        `.trim(),
      });

      let fullText = "";
      for await (const textPart of result.textStream) {
        fullText += textPart;
        writer.write({
          type: "data-title-update",
          id: generationId,
          data: {
            title: fullText,
            status: "streaming",
          },
        });
      }

      const finalTitle = fullText.trim();
      writer.write({
        type: "data-title-update",
        id: generationId,
        data: {
          title: finalTitle,
          status: "complete",
        },
      });

      return finalTitle;
    },
  });
};
