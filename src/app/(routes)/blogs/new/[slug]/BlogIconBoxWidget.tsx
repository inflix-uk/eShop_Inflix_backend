"use client";

import { useMemo } from "react";
import { CircleDashed } from "lucide-react";
import { DynamicIcon, type IconName } from "lucide-react/dynamic";

export type IconBoxItem = {
  id?: string;
  /** Lucide icon id (kebab-case), e.g. phone, truck, shield-check — see lucide.dev/icons */
  iconCode?: string;
  title?: string;
  description?: string;
};

/** Normalize admin input to Lucide `dynamic` icon keys (kebab-case). */
export function normalizeLucideIconCode(code: string): string | null {
  const t = code.trim().replace(/\s+/g, "-");
  if (!t) return null;
  let s = t;
  if (/[A-Z]/.test(t)) {
    s = t.replace(/([a-z0-9])([A-Z])/g, "$1-$2");
  }
  s = s.toLowerCase();
  if (!/^[a-z0-9-]+$/.test(s) || s.length > 64) return null;
  return s;
}

function IconCell({
  code,
  size,
  className,
}: {
  code: string;
  size: number;
  className: string;
}) {
  const name = normalizeLucideIconCode(code);
  if (!name) {
    return (
      <CircleDashed
        className="shrink-0 text-gray-300"
        style={{ width: size, height: size }}
        strokeWidth={1.5}
        aria-hidden
      />
    );
  }
  return (
    <DynamicIcon
      name={name as IconName}
      size={size}
      strokeWidth={2}
      className={`shrink-0 ${className}`}
      fallback={() => (
        <CircleDashed
          className="shrink-0 text-gray-300"
          style={{ width: size, height: size }}
          strokeWidth={1.5}
          aria-hidden
        />
      )}
    />
  );
}

function itemHasTitle(item: IconBoxItem) {
  return Boolean(item.title?.trim());
}

function itemHasDescription(item: IconBoxItem) {
  return Boolean(item.description?.trim());
}

export default function BlogIconBoxWidget({
  items,
  heading,
}: {
  items: IconBoxItem[];
  heading?: string;
}) {
  const list = useMemo(
    () =>
      (Array.isArray(items) ? items : []).filter(
        (it) => it?.iconCode && String(it.iconCode).trim().length > 0
      ),
    [items]
  );

  /** No descriptions anywhere → use horizontal brand-bar layout (icons only, or icon + title below). */
  const useBrandBar = useMemo(
    () => list.length > 0 && list.every((it) => !itemHasDescription(it)),
    [list]
  );

  const iconOnlyBar = useMemo(
    () => useBrandBar && list.every((it) => !itemHasTitle(it)),
    [list, useBrandBar]
  );

  if (list.length === 0) return null;

  const showHeading = Boolean(heading?.trim());

  if (useBrandBar) {
    return (
      <div className="relative m-4 py-2 w-full min-w-0 max-w-full overflow-x-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
        {showHeading ? (
          <h3 className="mb-6 px-4 text-lg font-semibold text-gray-900 sm:mb-8 sm:px-6">
            {heading!.trim()}
          </h3>
        ) : null}

        <ul
          className={`flex flex-wrap px-4 sm:px-6 ${
            iconOnlyBar
              ? "items-end justify-center gap-x-10 gap-y-8 sm:gap-x-14 lg:gap-x-16 lg:gap-y-10"
              : "items-start justify-center gap-x-8 gap-y-10 sm:gap-x-12 lg:gap-x-14"
          }`}
        >
          {list.map((item, index) => (
            <li
              key={item.id || `ib-${index}`}
              className={`flex min-w-[4.5rem] flex-col items-center text-center ${
                iconOnlyBar ? "justify-end" : "gap-2"
              }`}
            >
              <div
                className={`flex items-center justify-center ${iconOnlyBar ? "h-14 w-14 sm:h-16 sm:w-16" : "h-12 w-12 sm:h-14 sm:w-14"}`}
                aria-hidden
              >
                <IconCell
                  code={String(item.iconCode)}
                  size={iconOnlyBar ? 48 : 40}
                  className="text-gray-900"
                />
              </div>
              {item.title?.trim() ? (
                <p className="max-w-[11rem] text-lg font-semibold leading-tight tracking-tight text-gray-900">
                  {item.title.trim()}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    );
  }

  return (
    <div className="relative m-0 w-full min-w-0 max-w-full overflow-x-hidden rounded-xl border border-gray-200 bg-gray-50/80 shadow-sm">
      {showHeading ? (
        <h2 className="mb-2 px-4 pt-2 text-lg font-semibold text-gray-900 sm:px-5">
          {heading!.trim()}
        </h2>
      ) : null}

      <ul
        className={`grid grid-cols-1 gap-3 px-4 sm:grid-cols-2 sm:gap-4 sm:px-5 lg:grid-cols-3 ${showHeading ? "pb-2" : "py-2"}`}
      >
        {list.map((item, index) => (
          <li
            key={item.id || `ib-${index}`}
            className="flex gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm"
          >
            <div
              className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-green-50 ring-1 ring-green-100"
              aria-hidden
            >
              <IconCell code={String(item.iconCode)} size={28} className="text-green-700" />
            </div>
            <div className="min-w-0 flex-1">
              {item.title?.trim() ? (
                <h3 className="text-lg font-semibold text-gray-900">{item.title.trim()}</h3>
              ) : null}
              {item.description?.trim() ? (
                <p className="mt-1 text-base leading-relaxed text-gray-600">{item.description.trim()}</p>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
