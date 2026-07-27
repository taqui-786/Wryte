"use client";

import { ArrowUp01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";

export function PublicFooter() {
  const scrollToTop = () => {
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <footer className="mt-20">
      <Separator className="my-8" />
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
        <p className="text-xs sm:text-sm">Published on Wryte</p>
        <Button
          variant="ghost"
          size="sm"
          onClick={scrollToTop}
          className="h-8 gap-1.5 text-xs font-medium"
        >
          <span>Back to top</span>
          <HugeiconsIcon icon={ArrowUp01Icon} className="h-3.5 w-3.5" />
        </Button>
      </div>
    </footer>
  );
}
