"use client";

import Link from "next/link";
import type { HomeNavLink } from "@/app/services/homeNavLinksService";

export default function HomepageQuickNav({ links }: { links: HomeNavLink[] }) {
  if (!links.length) return null;

  return (
    <nav
      className="py-4 mb-2 border-b border-gray-200"
      aria-label="Homepage quick links"
    >
      <ul className="flex flex-wrap items-center gap-2 sm:gap-3">
        {links.map((item, i) => {
          const external = /^https?:\/\//i.test(item.path);
          return (
            <li key={`${item.path}-${i}`}>
              {external ? (
                <a
                  href={item.path}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-gray-50 transition-colors"
                >
                  {item.label}
                </a>
              ) : (
                <Link
                  href={item.path}
                  className="inline-flex items-center rounded-full border border-gray-200 bg-white px-3 py-1.5 text-sm font-medium text-primary hover:bg-gray-50 transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
