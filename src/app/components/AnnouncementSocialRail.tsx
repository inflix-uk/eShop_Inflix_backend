"use client";

import { DynamicIcon, type IconName } from "lucide-react/dynamic";
import {
  Facebook,
  Github,
  Globe,
  Instagram,
  Linkedin,
  Link as LinkIcon,
  Mail,
  Share2,
  Twitter,
  Youtube,
  type LucideIcon,
} from "lucide-react";
import type { AnnouncementSocialLinkPublic } from "@/app/services/announcementBannerService";

const KIND_ICONS: Record<string, LucideIcon> = {
  facebook: Facebook,
  instagram: Instagram,
  linkedin: Linkedin,
  youtube: Youtube,
  twitter: Twitter,
  github: Github,
  tiktok: Share2,
  mail: Mail,
  globe: Globe,
};

function normalizeLucideName(code: string): IconName | null {
  const t = String(code || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  if (!t || !/^[a-z0-9-]+$/.test(t) || t.length > 64) return null;
  return t as IconName;
}

function SocialIcon({ link }: { link: AnnouncementSocialLinkPublic }) {
  if (link.kind === "custom") {
    const name = normalizeLucideName(link.customIcon);
    if (!name) {
      return <LinkIcon size={20} strokeWidth={2} className="shrink-0" aria-hidden />;
    }
    return (
      <DynamicIcon
        name={name}
        size={20}
        strokeWidth={2}
        className="shrink-0"
        aria-hidden
        fallback={() => <LinkIcon size={20} strokeWidth={2} className="shrink-0" aria-hidden />}
      />
    );
  }
  const Icon = KIND_ICONS[link.kind] || Globe;
  return <Icon size={20} strokeWidth={2} className="shrink-0" aria-hidden />;
}

type Props = {
  links: AnnouncementSocialLinkPublic[];
  /** Match announcement text colour when possible */
  iconClassName?: string;
  /** Inside announcement slide (inherits slide background) */
  embedded?: boolean;
};

/**
 * Left column of social links (Lucide icons). Use inside a flex row (e.g. announcement slide).
 */
export default function AnnouncementSocialRail({
  links,
  iconClassName,
  embedded = false,
}: Props) {
  if (!links.length) return null;

  return (
    <div
      className={`flex shrink-0 items-center gap-2 border-r border-white/15 px-2 py-2 sm:gap-2.5 sm:px-3 ${
        embedded ? "bg-black/20" : "bg-black/30"
      }`}
      aria-label="Social links"
    >
      {links.map((link) => {
        const href = link.url.trim();
        const isMail = link.kind === "mail" || href.startsWith("mailto:");
        const external = href.startsWith("http") && !href.startsWith("/");
        return (
          <a
            key={link.id}
            href={isMail && !href.startsWith("mailto:") ? `mailto:${href}` : href}
            target={external ? "_blank" : undefined}
            rel={external ? "noopener noreferrer" : undefined}
            className={
              iconClassName ??
              "rounded-md p-1 text-white/95 transition hover:bg-white/15 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
            }
            aria-label={link.kind === "custom" ? "Social link" : `${link.kind} profile`}
          >
            <SocialIcon link={link} />
          </a>
        );
      })}
    </div>
  );
}
