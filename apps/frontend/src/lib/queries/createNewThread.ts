import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { createThread } from "@/lib/serverAction";
import { InferSelectModel } from "drizzle-orm";
import { thread } from "@/db/schema/auth-schema";

export type CreateNewThreadSchema = {
  docId: string;
  stateId: string;
  prompt: string;
};

export const useCreateNewThread = () => {

  return useMutation<InferSelectModel<typeof thread>, Error, CreateNewThreadSchema>({
    mutationFn: async ({ docId, stateId, prompt }) => {
      const result = await createThread(docId, stateId, prompt);
      if (!result) {
        throw new Error("Failed to create thread");
      }
      return result;
    },
    onError: (error) => {
      toast.error("Failed to create thread", {
        description: error.message,
      });
      console.error("Error creating thread:", error);
    },
  });
};
