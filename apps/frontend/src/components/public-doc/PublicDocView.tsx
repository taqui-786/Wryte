"use client";

import { Calendar03Icon, Share01Icon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import { Check } from "lucide-react";
import { marked } from "marked";
import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import type { PublicDocWithAuthor } from "@/lib/serverAction";

type PublicDoc = PublicDocWithAuthor;

type PublicUser = {
  name: string;
  email: string;
  image: string | null;
};

type PublicDocViewProps = {
  doc: PublicDoc;
  user?: PublicUser | null;
};

const MARKED_PARSE_OPTIONS = {
  gfm: true,
  breaks: false,
} as const;

function formatDate(date: Date | string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

function calculateReadingTime(text: string): number {
  if (!text) return 1;
  const words = text.trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

function extractSubtitle(content: string | null): string | null {
  if (!content) return null;

  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (trimmed.startsWith("#")) continue;
    if (
      trimmed.startsWith(">") ||
      trimmed.startsWith("---") ||
      trimmed.startsWith("***")
    )
      continue;

    const cleanText = trimmed
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/[*_~`]/g, "")
      .trim();

    if (cleanText.length > 10) {
      return cleanText;
    }
  }

  return null;
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

export function PublicDocView({ doc, user }: PublicDocViewProps) {
  const [copied, setCopied] = useState(false);

  const html = useMemo(() => {
    return doc.content
      ? (marked.parse(doc.content, MARKED_PARSE_OPTIONS) as string)
      : "";
  }, [doc.content]);

  const readingTime = useMemo(() => {
    return calculateReadingTime(doc.content || "");
  }, [doc.content]);

  const subtitle = useMemo(() => {
    return extractSubtitle(doc.content || null);
  }, [doc.content]);

  const handleShare = async () => {
    try {
      if (typeof window !== "undefined") {
        await navigator.clipboard.writeText(window.location.href);
        setCopied(true);
        toast.success("Link copied to clipboard");
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {
      toast.error("Failed to copy link");
    }
  };

  // Author details fetched from DB (doc.author) or current session fallback
  const authorName = doc.author?.name || user?.name || "Author";
  const authorImage = doc.author?.image ?? user?.image ?? null;

  return (
    <article className="pt-8 md:pt-12">
      {/* Header section matching reference */}
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight leading-[1.15] text-foreground sm:text-4xl md:text-5xl">
          {doc.title || "Untitled"}
        </h1>

        {subtitle ? (
          <p className="mt-4 text-lg font-normal leading-relaxed text-muted-foreground sm:text-xl">
            {subtitle}
          </p>
        ) : null}

        {/* Timestamp, reading time, share icon & Author info */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4">
          {/* Left side: Date • Reading time • Share icon inline */}
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <HugeiconsIcon
                icon={Calendar03Icon}
                className="h-4 w-4 shrink-0 text-muted-foreground"
              />
              <time dateTime={new Date(doc.createdAt).toISOString()}>
                {formatDate(doc.createdAt)}
              </time>
            </div>
            <span className="text-muted-foreground/60">•</span>
            <span>{readingTime} min read</span>
            <span className="text-muted-foreground/60">•</span>
            <button
              type="button"
              onClick={handleShare}
              className="inline-flex items-center gap-1.5 font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer focus:outline-none"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-500">Copied</span>
                </>
              ) : (
                <>
                  <HugeiconsIcon icon={Share01Icon} className="h-3.5 w-3.5" />
                  <span>Share</span>
                </>
              )}
            </button>
          </div>

          {/* Right side: Author name with Avatar */}
          <div className="flex items-center gap-2.5">
            <Avatar className="h-7 w-7 border border-border/60">
              <AvatarImage src={authorImage ?? undefined} alt={authorName} />
              <AvatarFallback className="bg-muted text-[11px] font-medium text-muted-foreground">
                {getInitials(authorName)}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium text-foreground">
              {authorName}
            </span>
          </div>
        </div>

        <Separator className="mt-4 mb-8" />
      </header>

      {/* Optional Cover Image */}
      {doc.coverImage ? (
        <div className="relative mb-10 aspect-[16/9] w-full overflow-hidden rounded-xl border border-border bg-muted shadow-sm">
          <Image
            src={doc.coverImage}
            alt={doc.title || "Document cover"}
            fill
            sizes="(max-width: 768px) 100vw, 768px"
            className="object-cover"
            priority
          />
        </div>
      ) : null}

      {/* Main Markdown Content */}
      <div
        className="prose prose-neutral dark:prose-invert max-w-none prose-headings:scroll-mt-20 prose-headings:font-bold prose-headings:tracking-tight prose-a:text-primary prose-a:underline-offset-4 hover:prose-a:underline prose-img:rounded-xl prose-pre:border prose-pre:border-border prose-blockquote:border-l-primary prose-blockquote:font-normal prose-blockquote:italic text-foreground/90 leading-relaxed"
        // biome-ignore lint/security/noDangerouslySetInnerHtml: markdown source is the doc owner's own content
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </article>
  );
}
