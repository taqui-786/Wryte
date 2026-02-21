import { useQuery } from "@tanstack/react-query";
import { getAllAgentChats, getAgentChatMessages } from "../serverAction";

/**
 * Fetch all chats for a document (for the history panel).
 */
export const useGetAllAgentChats = (docId?: string) => {
  return useQuery({
    queryKey: ["agent-chats", docId],
    queryFn: async () => {
      const data = await getAllAgentChats(docId!);
      return data;
    },
    enabled: !!docId,
    staleTime: 30_000, // 30s — chats list can be slightly stale
    refetchOnWindowFocus: false,
  });
};

/**
 * Fetch messages for a specific chat.
 */
export const useGetAgentChatMessages = (chatId?: string | null) => {
  return useQuery({
    queryKey: ["agent-chat-messages", chatId],
    queryFn: async () => {
      const data = await getAgentChatMessages(chatId!);
      return data;
    },
    enabled: !!chatId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
};
