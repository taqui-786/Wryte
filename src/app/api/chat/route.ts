import { groq } from "@ai-sdk/groq";
import {
  UIMessage,
  UIMessageStreamWriter,
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  smoothStream,
  stepCountIs,
  streamText,
  tool,
} from "ai";
import z from "zod";
import { nanoid } from "nanoid";
import { getCoordinates, getWeather } from "@/lib/serverAction";
export type Metadata = {
  userMessage: string;
  // attachments: Array<TAttachment>
  // tweets: PayloadTweet[]
  isRegenerated?: boolean;
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
    get_weather_tool: {
      status: "processing";
    };
  },
  {
    // Tool defination
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
const weatherTool = ({ writer }: { writer: UIMessageStreamWriter }) => {
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

export async function POST(req: Request) {
  const { messages }: { messages: MyUIMessage[] } = await req.json();
  const stream = createUIMessageStream<MyUIMessage>({
    generateId: createIdGenerator({
      prefix: "msg",
      size: 16,
    }),
    execute: async ({ writer }) => {
      // const generationId = nanoid();
      // writer.write({
      //   type: "data-main-response",
      //   id: generationId,
      //   data: {
      //     text: "",
      //     status: "streaming",
      //   },
      // });
      // console.log("Ready to send message");
      const get_weather_tool = weatherTool({ writer });
      const result = streamText({
        model: groq("openai/gpt-oss-20b"),

        system: `You are Wryte, a helpful AI assistant. Provide clear, accurate, and well-structured responses.  Be concise but comprehensive when answering questions.
          <available_tools note="You have the following tools at your disposal to assist you in your tasks.
          " >
            <tool>
    <name>get_weather_tool</name>
    <when_to_use>Only use this tool when the user asks about the weather or temperature.
</when_to_use>
    <description>Get the weather in a location</description>
</tool>
   
</available_tools>
          `,
        messages: await convertToModelMessages(messages),
        tools: {
          get_weather_tool,
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
