import { useQuery } from "@tanstack/react-query";

// ---------------------------------------------------------------------------
// DB-driven agent chat queries removed.
// Return empty/null so AgentSidebar history panel shows an empty state.
// ---------------------------------------------------------------------------

export type StubAgentChat = {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
};

/**
 * Returns an empty list — no DB calls.
 */
export const useGetAllAgentChats = (_docId?: string) => {
  return useQuery<StubAgentChat[]>({
    queryKey: ["agent-chats", _docId],
    queryFn: async () => [],
    enabled: !!_docId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
};

/**
 * Returns null — no DB calls.
 */
export const useGetAgentChatMessages = (_chatId?: string | null) => {
  return useQuery<{ title?: string } | null>({
    queryKey: ["agent-chat-messages", _chatId],
    queryFn: async () => null,
    enabled: !!_chatId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
};
