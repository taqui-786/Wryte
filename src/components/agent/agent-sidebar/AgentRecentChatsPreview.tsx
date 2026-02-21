import { HugeiconsIcon } from "@hugeicons/react";
import { formatRelativeTime } from "./time";
import type { AgentChatSummary } from "./types";
import { Loading03Icon } from "@hugeicons/core-free-icons";

type AgentRecentChatsPreviewProps = {
  chats: AgentChatSummary[];
  onSelectChat: (chatId: string) => void;
  loadingChatId?: string | null;
};

export default function AgentRecentChatsPreview({
  chats,
  onSelectChat,
  loadingChatId,
}: AgentRecentChatsPreviewProps) {
  const isChatLoading = !!loadingChatId;

  return (
    <>
      <p className="text-sm">Recent Agent Chats</p>
      <div className="w-full max-w-[280px] flex flex-col gap-1">
        {chats.map((chat) => {
          const isThisLoading = loadingChatId === chat.id;
          return (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelectChat(chat.id)}
              disabled={isChatLoading}
              className="w-full text-left px-3 py-2 rounded-md text-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <p className="truncate text-foreground">
                {chat.title || "New Chat"}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  {formatRelativeTime(chat.updatedAt)}
                </p>
                {isThisLoading && (
                  <span className="flex w-fit gap-1 text-xs items-center justify-center text-muted-foreground">
                    <HugeiconsIcon
                      icon={Loading03Icon}
                      className="size-4 animate-spin"
                    />
                    Loading...
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </>
  );
}
