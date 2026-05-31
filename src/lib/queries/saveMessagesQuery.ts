import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { saveAgentMessages } from "@/lib/serverAction";
import { AIMessageResponse } from "@/components/agent/agent-sidebar/types";

export type SaveMessagesSchema = {
  threadId: string;
  messages: AIMessageResponse;
};

export const useSaveAgentMessages = () => {
  return useMutation<void, Error, SaveMessagesSchema>({
    mutationFn: async ({ threadId, messages }) => {
      await saveAgentMessages(threadId, messages);
    },
    onError: (error) => {
      toast.error("Failed to save messages", {
        description: error.message,
      });
      console.error("Error saving agent messages:", error);
    },
  });
};
