import { cn } from "@/lib/utils";
import { formatRelativeTime } from "./time";
import type { AgentChatSummary } from "./types";

type AgentHistoryPanelProps = {
  allChats?: AgentChatSummary[];
  activeChatId: string | null;
  onSelectChat: (chatId: string) => void;
  isLoading?: boolean;
};

export default function AgentHistoryPanel({
  allChats,
  activeChatId,
  onSelectChat,isLoading
}: AgentHistoryPanelProps) {
  return (
    <div className="flex-1 min-h-0 overflow-y-auto p-3">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">
        Recent Chats
      </h3>
      {isLoading && (
        <div className="w-full max-w-[280px] flex flex-col gap-1">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="w-full px-3 py-2 rounded-md">
              <div className="h-4 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-muted rounded animate-pulse mt-1" />
            </div>
          ))}
        </div>
      )}
      {allChats && allChats.length > 0 ? (
        <div className="flex flex-col gap-1">
          {allChats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => onSelectChat(chat.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-md text-sm transition-colors",
                "hover:bg-muted",
                chat.id === activeChatId
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-foreground",
              )}
            >
              <p className="truncate">{chat.title || "New Chat"}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatRelativeTime(chat.updatedAt)}
              </p>
            </button>
          ))}
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-muted-foreground">
          <p className="text-sm">No chat history yet</p>
        </div>
      )}
    </div>
  );
}
