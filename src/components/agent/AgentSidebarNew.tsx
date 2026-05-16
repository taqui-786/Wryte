import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "../ui/button";
import { Clock04Icon, Menu01Icon, PlusSignIcon, SentIcon } from "@hugeicons/core-free-icons";
import { useRef, useState } from "react";
import { Skeleton } from "../ui/skeleton";

type Props = {};

const AgentSidebarNew:React.FC<Props> = ({}) => {
    const [viewHistory,setViewHistory] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const [inputValue, setInputValue] = useState("")
    const handleSend = ()=>{

    }
return(
   <div className="h-full flex flex-col gap-4">
      {/* Heading */}
      <div className="w-full p-2 gap-2 flex items-center justify-between border-b">
        <h2 className="text-sm font-medium truncate block w-full">
          {/* {activeChatData?.title || "New Chat"} */}
        </h2>
        <div className="flex items-center justify-center gap-1">
          <Button
            variant={"ghost"}
            size="icon-sm"
            // onClick={handleNewChat}
            // disabled={!docId}
          >
            <HugeiconsIcon icon={PlusSignIcon} size="20" />
          </Button>
          <Button
            // data-active={viewHistory}
            variant={"ghost"}
            size="icon-sm"
            className="data-[active=true]:bg-primary data-[active=true]:text-primary-foreground"
            // onClick={() => setViewHistory(!viewHistory)}
            // onMouseEnter={preloadHistoryPanel}
            // onFocus={preloadHistoryPanel}
          >
            <HugeiconsIcon icon={Clock04Icon} size="20" />
          </Button>
          <Button variant={"ghost"} size="icon-sm">
            <HugeiconsIcon icon={Menu01Icon} size="20" />
          </Button>
        </div>
      </div>
      {viewHistory ? (
        ""
        // <AgentHistoryPanel
        //   allChats={allChats}
        //   activeChatId={activeChatId}
        //   isLoading={isLoadingAllChats}
        //   onSelectChat={handleSelectChat}
        // />
      ) : (
        <>
          {/* body part scroll area */}
          <div
            ref={scrollRef}
            className="flex-1  min-h-0 overflow-y-auto 2xl:p-4 p-2 [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-border [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:border-2 [&::-webkit-scrollbar-thumb]:border-transparent"
          >
           
            {/* Removed separate loading indicator - now shown via streaming thinking */}
          </div>
          {/* Agent - Chat box */}
          <div className="p-0">
            <div className="">
              <form
                onSubmit={handleSend}
                className="w-full p-2 border-t flex flex-col gap-1"
              >
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSend();
                    }
                  }}
                //   disabled={isThinking}
                  placeholder="Tell me what you want to write..."
                  className="flex-1 h-24 resize-none  bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-0 focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
                />
                <Button
                  size="icon-lg"
                  className="self-end"
                  type="submit"
                //   disabled={isThinking || !inputValue.trim()}
                >
                  <HugeiconsIcon icon={SentIcon} />
                </Button>
              </form>
            </div>
          </div>
        </>
      )}
    </div>
)
};
export default AgentSidebarNew;