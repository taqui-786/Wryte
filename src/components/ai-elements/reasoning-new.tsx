"use client";
import React, {
  ComponentProps,
  createContext,
  memo,
  useContext,
  useEffect,
  useState,
} from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Brain02FreeIcons, ChevronDown } from "@hugeicons/core-free-icons";
import { Response } from "./response";

type ReasoningContextValue = {
  isStreaming: boolean;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  duration: number;
};
type ReasoningProps = ComponentProps<typeof Collapsible> & {
  isStreaming?: boolean;
  className?: string;
  children?: React.ReactNode;
};

const ReasoningContext = createContext<ReasoningContextValue | null>(null);
const useReasoning = () => {
  const context = useContext(ReasoningContext);
  if (!context) {
    throw new Error("Reasoning components must be used within Reasoning");
  }
  return context;
};
const getThinkingMessage = (isStreaming: boolean, duration?: number) => {
  if (isStreaming === true && duration === 0) {
    return <p>Thinking...</p>;
  }
  if (duration === 0 && isStreaming === false) {
    return <p>Thought for a few seconds</p>;
  }
  if (duration === undefined) {
    return <p>Thought for a few seconds</p>;
  }
  return <p>Thought for {duration} seconds</p>;
};

export const ReasoningNew = memo(
  ({ isStreaming = false, className, children, ...props }: ReasoningProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const [duration, setDuration] = useState(0);
    const handleOpenChange = (newOpen: boolean) => {
      setIsOpen(newOpen);
    };

    return (
      <ReasoningContext.Provider
        value={{ isStreaming: isStreaming, setIsOpen, isOpen, duration }}
      >
        <Collapsible
          className={cn("not-prose mb-4", className)}
          onOpenChange={handleOpenChange}
          open={isOpen}
          {...props}
        >
          {children}
        </Collapsible>
      </ReasoningContext.Provider>
    );
  },
);

export const ReasoningNewTrigger = memo(
  ({
    className,
    children,
    ...props
  }: ComponentProps<typeof CollapsibleTrigger>) => {
    const { isStreaming, isOpen, duration } = useReasoning();
    return (
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center gap-2 text-gray-500 text-base transition-colors hover:text-foreground",
          className,
        )}
        {...props}
      >
        <HugeiconsIcon icon={Brain02FreeIcons} />
        {getThinkingMessage(isStreaming, duration)}
        <HugeiconsIcon
          icon={ChevronDown}
          className={cn(
            "size-4 transition-transform",
            isOpen ? "rotate-180" : "rotate-0",
          )}
        />
      </CollapsibleTrigger>
    );
  },
);
type ReasoningContentProps = ComponentProps<typeof CollapsibleContent> & {
  chunk: string;
};

export const ReasoningNewContent = memo(
  ({ className, chunk, ...props }: ReasoningContentProps) => {
    const { isStreaming, setIsOpen, isOpen } = useReasoning();
    const [oldChunk, setOldChunk] = useState("");
    // useEffect(() => {
    //   console.log(chunk, isStreaming, oldChunk);

    //   if (isOpen && isStreaming) {
    //     const timer = setTimeout(() => {
    //       console.log("Woooo");
    //       setIsOpen(false);
    //       setOldChunk(chunk);
    //     }, 2000);
    //   }
    // }, [chunk]);
    useEffect(() => {
      console.log(isStreaming,chunk !== oldChunk);

      if (isStreaming === false && chunk) {
        console.log("Setting old chunk");
        setOldChunk(chunk);
      }
      if (chunk !== oldChunk && isStreaming) {
        console.log("Lets open the accordion");

        setIsOpen(true);
      }
      if (isOpen && isStreaming) {
        console.log("timer set");

        const timer = setTimeout(() => {
          setIsOpen(false);
          // setOldChunk(chunk);
        }, 2000);
      }
    }, [isStreaming]);
    return (
      <CollapsibleContent
        className={cn(
          "mt-4 text-sm",
          "data-[state=closed]:fade-out-0 data-[state=closed]:slide-out-to-top-2 data-[state=open]:slide-in-from-top-2 text-muted-foreground outline-none data-[state=closed]:animate-out data-[state=open]:animate-in",
          className,
        )}
        {...props}
      >
        <Response className="grid gap-2">{chunk}</Response>
      </CollapsibleContent>
    );
  },
);
