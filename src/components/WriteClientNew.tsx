"use client";
import { useRef, useState } from "react";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "./ui/resizable";
import { ScrollArea } from "./ui/scroll-area";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Edit03Icon } from "@hugeicons/core-free-icons";
import MyEditor from "./my-editor/MyEditor";
import AgentSidebarNew from "./agent/AgentSidebarNew";
import { InferSelectModel } from "drizzle-orm";
import { docs } from "@/db/schema/auth-schema";

type Props = {doc: InferSelectModel<typeof docs>};

const WriteClientNew: React.FC<Props> = ({doc}) => {
  const [isEditingHeading, setIsEditingHeading] = useState(false);
  const [heading, setHeading] = useState(doc.title || "Untitled");
  const headingInputRef = useRef<HTMLInputElement>(null);
  const [isAIApplying, setIsAIApplying] = useState(false);
  const editorRef = useRef<any>(null);
  const [value, setValue] = useState(doc.content || "");
  const handleChange = (content: string) => {
    console.log(content);
    setValue(content);
  };
  return (
    <ResizablePanelGroup orientation="horizontal" className="overflow-hidden ">
      <ResizablePanel defaultSize={70} className="max-h-[calc(100vh-4rem)]">
        <ScrollArea className="h-full">
          <div className="w-full flex p-4  justify-center">
            <div className=" max-w-5xl w-full h-full flex flex-col  gap-4  ">
              {isEditingHeading ? (
                <Input
                  type="text"
                  autoFocus
                  ref={headingInputRef}
                  placeholder="Untitled"
                  className="w-full border-0 border-b border-border rounded-none px-0 py-1 text-2xl font-semibold shadow-none leading-tight bg-transparent focus-visible:ring-0 focus-visible:border-primary"
                  value={heading}
                  onChange={(e) => setHeading(e.target.value)}
                  onBlur={() => setIsEditingHeading(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === "Escape") {
                      setIsEditingHeading(false);
                    }
                  }}
                />
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!isAIApplying) {
                      setIsEditingHeading(true);
                      setTimeout(() => headingInputRef.current?.focus(), 0);
                    }
                  }}
                  className="group flex items-center gap-2 text-left w-full px-0 py-1 bg-transparent border-none cursor-text"
                  disabled={isAIApplying}
                >
                  <span className="text-2xl font-semibold leading-tight truncate text-muted-foreground pl-4">
                    {heading}
                  </span>
                  <Button variant="ghost" size={"icon-lg"}>
                    <HugeiconsIcon icon={Edit03Icon} />
                  </Button>
                </button>
              )}
              <MyEditor
                ref={editorRef}
                onChange={handleChange}
                value={value}
                isLocked={isAIApplying}
              />
            </div>
          </div>
        </ScrollArea>
      </ResizablePanel>
      <ResizableHandle withHandle />
      <ResizablePanel
        defaultSize={30}
        className="max-h-[calc(100vh-4rem)]"
      >

        <AgentSidebarNew/>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
};
export default WriteClientNew;
