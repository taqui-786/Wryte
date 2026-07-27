"use client";

import { Comment01Icon, SentIcon, UserIcon } from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

type PublicUser = {
  name: string;
  email: string;
  image: string | null;
};

type Comment = {
  id: string;
  content: string;
  author: {
    name: string;
    image: string | null;
  };
  createdAt: Date;
};

type CommentSectionProps = {
  user: PublicUser | null;
  docId: string;
};

const initialComments: Comment[] = [
  {
    id: "comment-mira-patel",
    content:
      "The structure here is unusually clear. I found the middle section on constraints especially useful for thinking through my own drafts.",
    author: { name: "Mira Patel", image: null },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 3),
  },
  {
    id: "comment-jonas-weiden",
    content:
      "A follow-up on how this connects to longer pieces would be valuable. Still, this stands on its own.",
    author: { name: "Jonas Weiden", image: null },
    createdAt: new Date(Date.now() - 1000 * 60 * 60 * 26),
  },
];

function formatRelativeTime(date: Date): string {
  const elapsed = Math.floor((Date.now() - date.getTime()) / 1000);
  if (elapsed < 60) return "just now";
  const minutes = Math.floor(elapsed / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

export function CommentSection({ user, docId }: CommentSectionProps) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [draft, setDraft] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = draft.trim();
    if (!text || !user) return;

    setIsSubmitting(true);

    // Mock network delay to simulate persistence
    await new Promise((resolve) => setTimeout(resolve, 600));

    const newComment: Comment = {
      id: `comment-${docId}-${Date.now()}`,
      content: text,
      author: {
        name: user.name,
        image: user.image,
      },
      createdAt: new Date(),
    };

    setComments((prev) => [newComment, ...prev]);
    setDraft("");
    setIsSubmitting(false);
    toast.success("Comment posted");
  };

  return (
    <section
      className="mt-16 border-t border-border pt-12"
      aria-labelledby="comments-heading"
    >
      <div className="mb-8 flex items-center gap-3">
        <h2
          id="comments-heading"
          className="text-xl font-bold tracking-tight text-foreground sm:text-2xl"
        >
          Responses
        </h2>
        <span className="inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">
          {comments.length}
        </span>
      </div>

      {/* Response Input Form */}
      <form onSubmit={handleSubmit} className="mb-10">
        <div className="flex gap-4">
          <Avatar className="h-10 w-10 border border-border shrink-0">
            {user ? (
              <>
                <AvatarImage src={user.image ?? undefined} alt={user.name} />
                <AvatarFallback className="bg-muted text-sm font-medium text-muted-foreground">
                  {getInitials(user.name)}
                </AvatarFallback>
              </>
            ) : (
              <AvatarFallback className="bg-muted text-muted-foreground">
                <HugeiconsIcon icon={UserIcon} className="h-4 w-4" />
              </AvatarFallback>
            )}
          </Avatar>

          <div className="flex flex-1 flex-col gap-3">
            <label htmlFor="comment" className="sr-only">
              Write a response
            </label>
            <textarea
              id="comment"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={
                user ? "Share a thought..." : "Sign in to leave a response..."
              }
              rows={3}
              className="w-full resize-y rounded-xl border border-border bg-background px-4 py-3 text-sm leading-relaxed text-foreground placeholder:text-muted-foreground/60 focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-75"
              disabled={!user || isSubmitting}
            />

            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                Responses are visible to all readers of this document.
              </p>

              {user ? (
                <Button
                  type="submit"
                  disabled={isSubmitting || draft.trim().length === 0}
                  size="sm"
                  className="gap-2 font-medium"
                >
                  {isSubmitting ? (
                    <>
                      <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      <span>Posting...</span>
                    </>
                  ) : (
                    <>
                      <HugeiconsIcon icon={SentIcon} className="h-3.5 w-3.5" />
                      <span>Post response</span>
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  asChild
                  size="sm"
                  variant="secondary"
                  className="font-medium"
                >
                  <Link href="/signin">Sign in to respond</Link>
                </Button>
              )}
            </div>
          </div>
        </div>
      </form>

      {/* Responses List */}
      <div className="flex flex-col gap-0">
        {comments.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
            <HugeiconsIcon
              icon={Comment01Icon}
              className="mb-3 h-6 w-6 text-muted-foreground"
            />
            <p className="text-sm font-medium text-foreground">
              No responses yet
            </p>
            <p className="mt-1 max-w-xs text-xs text-muted-foreground">
              Be the first to share a thought on this document.
            </p>
          </div>
        ) : (
          comments.map((comment) => (
            <article
              key={comment.id}
              className="border-b border-border/60 py-5 first:pt-0 last:border-b-0"
            >
              <div className="flex items-start gap-3.5">
                <Avatar className="h-9 w-9 border border-border shrink-0">
                  <AvatarImage
                    src={comment.author.image ?? undefined}
                    alt={comment.author.name}
                  />
                  <AvatarFallback className="bg-muted text-xs font-medium text-muted-foreground">
                    {getInitials(comment.author.name)}
                  </AvatarFallback>
                </Avatar>

                <div className="flex-1">
                  <div className="mb-1 flex flex-wrap items-center gap-2">
                    <span className="text-sm font-medium text-foreground">
                      {comment.author.name}
                    </span>
                    <span className="text-xs text-muted-foreground/60">•</span>
                    <span className="text-xs text-muted-foreground">
                      {formatRelativeTime(comment.createdAt)}
                    </span>
                  </div>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                    {comment.content}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}
