"use client";

import Link from "next/link";
import type { HomeNavLink } from "@/app/services/homeNavLinksService";

/** Desktop primary bar — same structure as CategoryItem (no submenu). */
export function NavbarCustomLinkItem({
  link,
  index,
}: {
  link: HomeNavLink;
  index: number;
}) {
  const external = /^https?:\/\//i.test(link.path.trim());
  return (
    <li
      className="relative dropdown flex items-center"
      key={`nav-custom-${index}-${link.path}`}
    >
      <div className="flex items-center">
        {external ? (
          <a
            href={link.path.trim()}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-200"
          >
            <p className="hover:text-gray-200">{link.label}</p>
          </a>
        ) : (
          <Link href={link.path.trim()}>
            <p className="hover:text-gray-200">{link.label}</p>
          </Link>
        )}
      </div>
    </li>
  );
}

/** Mobile drawer row */
export function NavbarCustomLinkDrawerRow({
  link,
  index,
  onNavigate,
}: {
  link: HomeNavLink;
  index: number;
  onNavigate?: () => void;
}) {
  const external = /^https?:\/\//i.test(link.path.trim());
  const className =
    "block w-full p-2 text-base text-gray-900 rounded-lg hover:bg-gray-100 text-left";

  if (external) {
    return (
      <li key={`drawer-custom-${index}`}>
        <a
          href={link.path.trim()}
          target="_blank"
          rel="noopener noreferrer"
          className={className}
          onClick={onNavigate}
        >
          {link.label}
        </a>
      </li>
    );
  }

  return (
    <li key={`drawer-custom-${index}`}>
      <Link
        href={link.path.trim()}
        className={className}
        onClick={onNavigate}
      >
        {link.label}
      </Link>
    </li>
  );
}
