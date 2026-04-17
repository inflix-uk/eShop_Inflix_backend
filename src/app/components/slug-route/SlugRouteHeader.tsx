"use client";

import { usePathname } from "next/navigation";
import Nav from "@/app/components/navbar/Nav";
import TopBar from "@/app/topbar/page";
import { pathnameHidesTopBarForSlugRoute } from "@/app/lib/slugPagesWithoutTopBar";

export default function SlugRouteHeader() {
  const pathname = usePathname();
  const hideTopBar = pathnameHidesTopBarForSlugRoute(pathname);

  return (
    <header className="relative">
      {!hideTopBar && <TopBar />}
      <Nav />
    </header>
  );
}
