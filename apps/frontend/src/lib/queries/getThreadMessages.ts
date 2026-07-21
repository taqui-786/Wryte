import { useQuery } from "@tanstack/react-query";
import { getThreadMessages } from "@/lib/serverAction";
import { AIMessageResponse } from "@/components/agent/agent-sidebar/types";

export const useGetThreadMessages = (threadId?: string) => {
  return useQuery<AIMessageResponse, Error>({
    queryKey: ["thread-messages", threadId],
    queryFn: async () => {
      const result = await getThreadMessages(threadId!);
      if (!result) throw new Error("Failed to fetch thread messages");
      return result;
    },
    enabled: threadId !== undefined,
  });
};
