import type { Metadata } from "next";
import { notFound } from "next/navigation";
import WriteClientNew from "@/components/WriteClientNew";
import { getDocById } from "@/lib/serverAction";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const doc = await getDocById(id);

  if (!doc) {
    return {
      title: "Document Not Found",
    };
  }

  return {
    title: doc.title || "Untitled Document",
    description: doc.content?.slice(0, 160) || "Edit your document",
  };
}

const page = async ({ params }: Props) => {
  const { id } = await params;
  const doc = await getDocById(id);

  if (!doc) {
    notFound();
  }

  return (
    <div className="h-full w-full flex items-center justify-center">
      <div className="max-w-full h-full w-full gap-5">
        <WriteClientNew doc={doc} />
      </div>
    </div>
  );
};

export default page;