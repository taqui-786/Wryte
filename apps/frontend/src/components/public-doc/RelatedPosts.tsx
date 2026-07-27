import {
  ArrowRight01Icon,
  Calendar03Icon,
  File02Icon,
} from "@hugeicons/core-free-icons";
import { HugeiconsIcon } from "@hugeicons/react";
import Link from "next/link";

type RelatedPost = {
  id: string;
  title: string;
  excerpt: string;
  createdAt: Date;
};

type RelatedPostsProps = {
  posts?: RelatedPost[];
};

const defaultRelatedPosts: RelatedPost[] = [
  {
    id: "dear-indian-students",
    title: "Dear Indian Students",
    excerpt:
      "Why most Indian students stay average despite wanting extraordinary results.",
    createdAt: new Date("2026-06-06"),
  },
  {
    id: "the-faq",
    title: "The FAQ",
    excerpt: "Covering the most frequently asked question.",
    createdAt: new Date("2026-05-28"),
  },
  {
    id: "the-internet-romanticized-exhaustion",
    title: "The Internet Romanticized Exhaustion",
    excerpt:
      "How hustle culture slowly destroys ambition, health, peace, and your identity.",
    createdAt: new Date("2026-05-28"),
  },
];

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function RelatedPosts({
  posts = defaultRelatedPosts,
}: RelatedPostsProps) {
  const displayPosts = posts.length > 0 ? posts : defaultRelatedPosts;

  return (
    <section
      className="mt-16 border-t border-border pt-12"
      aria-labelledby="related-heading"
    >
      <h2
        id="related-heading"
        className="mb-8 text-xl font-bold tracking-tight text-foreground sm:text-2xl"
      >
        Related Posts
      </h2>

      {displayPosts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center">
          <HugeiconsIcon
            icon={File02Icon}
            className="mb-3 h-6 w-6 text-muted-foreground"
          />
          <p className="text-sm font-medium text-foreground">
            No related posts found
          </p>
          <p className="mt-1 max-w-xs text-xs text-muted-foreground">
            We couldn&apos;t find any documents related to this one yet.
          </p>
        </div>
      ) : (
        <div className="flex flex-col divide-y divide-border/60">
          {displayPosts.map((post) => (
            <Link
              key={post.id}
              href={`/p/${post.id}`}
              className="group flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-5 transition-colors hover:bg-muted/40 rounded-lg px-3 -mx-3"
            >
              <div className="flex-1">
                <h3 className="text-base sm:text-lg font-bold tracking-tight text-foreground group-hover:text-primary transition-colors">
                  {post.title}
                </h3>
                <p className="mt-1 line-clamp-2 text-sm text-muted-foreground leading-relaxed">
                  {post.excerpt}
                </p>
                <div className="mt-2.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <HugeiconsIcon
                    icon={Calendar03Icon}
                    className="h-3.5 w-3.5 shrink-0"
                  />
                  <time dateTime={new Date(post.createdAt).toISOString()}>
                    {formatDate(post.createdAt)}
                  </time>
                </div>
              </div>

              <div className="flex items-center gap-1 text-sm font-medium text-muted-foreground group-hover:text-foreground shrink-0 self-start sm:self-center">
                <span>Read more</span>
                <HugeiconsIcon
                  icon={ArrowRight01Icon}
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                />
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
