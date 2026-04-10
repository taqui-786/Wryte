import type { UIMessageStreamWriter } from "ai";
import { Output, streamText, tool } from "ai";
import { nanoid } from "nanoid";
import z from "zod";
import { recordAiUsage } from "@/lib/ai-rate-limiter";
import type { UsageFeature, UsageModel } from "@/lib/ai-usage-limits";
import { getCoordinates, getWeather } from "@/lib/serverAction";
import { toolModel } from "./nvidia";

// Shared mutable state so the title tool can see content written by the editor tool
export type SharedEditorState = {
  lastWrittenContent: string | null;
};

export function createSharedEditorState(): SharedEditorState {
  return { lastWrittenContent: null };
}

type UsageTrackingContext = {
  userId: string;
  feature: UsageFeature;
  model: UsageModel;
  agentChatId?: string;
  docId?: string;
};

const recordToolUsage = async (
  usageTracking: UsageTrackingContext | undefined,
  usage: unknown,
) => {
  if (!usageTracking) return;

  try {
    await recordAiUsage({
      userId: usageTracking.userId,
      feature: usageTracking.feature,
      model: usageTracking.model,
      agentChatId: usageTracking.agentChatId,
      docId: usageTracking.docId,
      usage: usage as {
        inputTokens?: number;
        outputTokens?: number;
        totalTokens?: number;
      },
    });
  } catch (error) {
    console.error("Failed to record tool usage:", error);
  }
};

const EditorLineChangeSchema = z.object({
  line: z.number().int().positive(),
  type: z.enum(["replace", "delete", "insert"]),
  content: z.string(),
});

type EditorLineChange = z.infer<typeof EditorLineChangeSchema>;

const EditorLineChangeLooseSchema = z
  .object({
    line: z.number().int().positive().optional(),
    lineNumber: z.number().int().positive().optional(),
    type: z
      .enum([
        "replace",
        "delete",
        "insert",
        "add",
        "remove",
        "update",
        "create",
      ])
      .optional(),
    action: z
      .enum([
        "replace",
        "delete",
        "insert",
        "add",
        "remove",
        "update",
        "create",
      ])
      .optional(),
    content: z.string().optional(),
    text: z.string().optional(),
  })
  .passthrough();

const EditorToolOutputSchema = z
  .object({
    elements: z.array(EditorLineChangeLooseSchema).optional(),
    updates: z.array(EditorLineChangeLooseSchema).optional(),
    changes: z.array(EditorLineChangeLooseSchema).optional(),
  })
  .passthrough();

const normalizeChangeType = (
  value: string | undefined,
): EditorLineChange["type"] | null => {
  if (!value) return null;

  const normalized = value.toLowerCase();
  if (normalized === "replace" || normalized === "update") return "replace";
  if (normalized === "delete" || normalized === "remove") return "delete";
  if (
    normalized === "insert" ||
    normalized === "add" ||
    normalized === "create"
  )
    return "insert";

  return null;
};

const normalizeEditorLineChanges = (input: unknown): EditorLineChange[] => {
  let parsedInput: unknown = input;

  if (typeof parsedInput === "string") {
    try {
      parsedInput = JSON.parse(parsedInput);
    } catch {
      return [];
    }
  }

  const fromWrapped = EditorToolOutputSchema.safeParse(parsedInput);

  const rawItems: unknown[] = Array.isArray(parsedInput)
    ? parsedInput
    : fromWrapped.success
      ? [
          ...(fromWrapped.data.elements ?? []),
          ...(fromWrapped.data.updates ?? []),
          ...(fromWrapped.data.changes ?? []),
        ]
      : [];

  if (rawItems.length === 0) return [];

  const normalized: EditorLineChange[] = [];

  for (let index = 0; index < rawItems.length; index += 1) {
    const loose = EditorLineChangeLooseSchema.safeParse(rawItems[index]);
    if (!loose.success) continue;

    const line = loose.data.line ?? loose.data.lineNumber ?? index + 1;
    const type = normalizeChangeType(loose.data.type ?? loose.data.action);
    const content = (loose.data.content ?? loose.data.text ?? "").toString();

    if (!type) continue;

    const strict = EditorLineChangeSchema.safeParse({
      line,
      type,
      content,
    });

    if (strict.success) {
      normalized.push(strict.data);
    }
  }

  return normalized;
};

const serializeEditorLineChanges = (changes: EditorLineChange[]): string =>
  JSON.stringify({ elements: changes });

const getReadableContentFromChanges = (changes: EditorLineChange[]): string =>
  [...changes]
    .sort((a, b) => a.line - b.line)
    .map((change) => change.content.trim())
    .filter(Boolean)
    .join("\n\n");

export const weatherTool = ({
  writer,
  usageTracking,
}: {
  writer: UIMessageStreamWriter;
  usageTracking?: UsageTrackingContext;
}) => {
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
        model: toolModel,
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
        onFinish: async ({ totalUsage }) => {
          await recordToolUsage(usageTracking, totalUsage);
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
  sharedState,
  usageTracking,
}: {
  writer: UIMessageStreamWriter;
  editorContent?: string;
  editorMarkdown?: string;
  sharedState: SharedEditorState;
  usageTracking?: UsageTrackingContext;
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
      const editorSystemPrompt = `
You are an expert writing assistant.
Your job is to modify the document based on the user's instructions.
Return ONLY the lines that changed.
INFO: Each top-level block corresponds to a line using its data-line attribute in the HTML.
Use the data-line numbers from the HTML context.
INFO: Never start with content Title/Heading or Subheading always start with a paragraph intro, no need to add title or heading (STRICTLY FOLLOW THIS RULE).
Rules:
- Only include lines that were modified.
- Do not return unchanged lines.
- If a selection is provided, only modify that selection.
- If the document is empty, start inserting from line 1 and continue sequentially.
- Return a JSON object with this exact top-level key: "elements".
- Each item in "elements" must use keys: "line", "type", "content".
- Do not use other keys such as "updates" or "action" unless strictly necessary.
- Use:
  - "replace" when updating a line,
  - "delete" when removing a line,
  - "insert" when adding a new line.
- The "content" field must contain the updated Markdown for that line (no wrapper tags).
      `.trim();

      const editorPrompt = `
Action: ${action}
Instructions: ${instructions}

${contextBlocks.join("\n\n")}
      `.trim();

      let finalChanges: EditorLineChange[] = [];
      let finalPayload = "";

      try {
        const result = streamText({
          model: toolModel,
          maxRetries: 1,
          output: Output.object({
            schema: EditorToolOutputSchema,
          }),
          system: editorSystemPrompt,
          prompt: editorPrompt,
          onFinish: async ({ totalUsage }) => {
            await recordToolUsage(usageTracking, totalUsage);
          },
        });

        for await (const partial of result.partialOutputStream) {
          const partialChanges = normalizeEditorLineChanges(partial);
          const payload = serializeEditorLineChanges(partialChanges);
          writer.write({
            type: "data-editor-update",
            id: generationId,
            data: {
              markdown: payload,
              status: "streaming",
              action,
            },
          });
        }

        finalChanges = normalizeEditorLineChanges(await result.output);
        finalPayload = serializeEditorLineChanges(finalChanges);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error";
        console.warn(
          `Structured editor output failed, using fallback: ${errorMessage}`,
        );

        const fallbackResult = streamText({
          model: toolModel,
          maxRetries: 1,
          system: `
${editorSystemPrompt}
Return valid JSON in exactly this format:
{"elements":[{"line":1,"type":"insert","content":"..."}]}
Do not include markdown fences.
          `.trim(),
          prompt: editorPrompt,
          onFinish: async ({ totalUsage }) => {
            await recordToolUsage(usageTracking, totalUsage);
          },
        });

        let fallbackText = "";
        for await (const textPart of fallbackResult.textStream) {
          fallbackText += textPart;
          writer.write({
            type: "data-editor-update",
            id: generationId,
            data: {
              markdown: fallbackText,
              status: "streaming",
              action,
            },
          });
        }

        finalChanges = normalizeEditorLineChanges(fallbackText);
        finalPayload =
          finalChanges.length > 0
            ? serializeEditorLineChanges(finalChanges)
            : fallbackText.trim();
      }

      const finalText =
        finalPayload.trim() ||
        serializeEditorLineChanges(finalChanges.length > 0 ? finalChanges : []);

      // Store written content so the title tool can use it
      const readableContent = getReadableContentFromChanges(finalChanges);
      sharedState.lastWrittenContent = readableContent || finalText;

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
  sharedState,
  usageTracking,
}: {
  writer: UIMessageStreamWriter;
  editorContent?: string;
  editorMarkdown?: string;
  sharedState: SharedEditorState;
  usageTracking?: UsageTrackingContext;
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

      // Prefer freshly written content from the editor tool (same request)
      if (sharedState.lastWrittenContent) {
        contextBlocks.push(
          `Current document (just written):\n${sharedState.lastWrittenContent}`,
        );
      } else if (editorMarkdown?.trim()) {
        contextBlocks.push(
          `Current document (Markdown):\n${editorMarkdown.trim()}`,
        );
      } else if (editorContent?.trim()) {
        contextBlocks.push(`Current document (HTML):\n${editorContent.trim()}`);
      } else {
        contextBlocks.push("Current document is empty.");
      }

      const result = streamText({
        model: toolModel,
        maxRetries: 1,
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
        onFinish: async ({ totalUsage }) => {
          await recordToolUsage(usageTracking, totalUsage);
        },
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
