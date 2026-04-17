import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Search | Zextons Tech Store",
  description: "Search for products on Zextons Tech Store",
};
export default function SearchProductLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
