// Layout Component for SubCategory
export default async function ProductLayout({
  children,
}: {
  children: React.ReactNode;
  params: Promise<{ slug: string[] }>;
}) {
  return <>{children}</>;
}
