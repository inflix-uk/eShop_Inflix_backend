"use client";


import dynamic from "next/dynamic";

// Dynamically import the TableOfContents component
const TableOfContents = dynamic(
  () => import("@/app/components/blogs/TableofContents"),
  { ssr: false }
);

export default function TableOfContentsWrapper({ content }: { content: string }) {
  return (
    <aside className="md:w-1/4 lg:w-1/3 mb-6 md:mb-0">
      <div className="sticky top-20">
        <TableOfContents content={content} />
      </div>
    </aside>
  );
}