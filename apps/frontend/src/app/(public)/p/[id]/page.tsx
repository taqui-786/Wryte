import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CommentSection } from "@/components/public-doc/CommentSection";
import { PublicDocView } from "@/components/public-doc/PublicDocView";
import { PublicFooter } from "@/components/public-doc/PublicFooter";
import { PublicNavbar } from "@/components/public-doc/PublicNavbar";
import { RelatedPosts } from "@/components/public-doc/RelatedPosts";
import { getPublicDocById, getServerUserSession } from "@/lib/serverAction";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const doc = await getPublicDocById(id);

  if (!doc?.id) {
    return { title: "Document Not Found" };
  }

  return {
    title: doc.title || "Untitled Document",
    description: doc.content?.slice(0, 160) || "Read this document on Wryte",
    openGraph: {
      title: doc.title || "Untitled Document",
      description: doc.content?.slice(0, 160) || "Read this document on Wryte",
      type: "article",
      images: doc.coverImage ? [{ url: doc.coverImage }] : undefined,
    },
  };
}

const Page = async ({ params }: Props) => {
  const { id } = await params;
  const [doc, session] = await Promise.all([
    getPublicDocById(id),
    getServerUserSession(),
  ]);

  if (!doc?.id) {
    notFound();
  }

  const user = session?.user
    ? {
        name: session.user.name,
        email: session.user.email,
        image: session.user.image ?? null,
      }
    : null;
  const isOwner = Boolean(session?.user.id && doc.userId === session.user.id);

  return (
    <>
      <PublicNavbar user={user} isOwner={isOwner} docId={doc.id} />
      <div className="mx-auto max-w-3xl px-4 pb-20 sm:px-6">
        <PublicDocView doc={doc} user={user} />
        <CommentSection user={user} docId={doc.id} />
        <RelatedPosts />
        <PublicFooter />
      </div>
    </>
  );
};

export default Page;
