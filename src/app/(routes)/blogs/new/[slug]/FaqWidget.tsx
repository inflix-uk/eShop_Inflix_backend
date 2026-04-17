"use client";

import { useState, useRef } from "react";
import { ChevronDown } from "lucide-react";
import {
  bleedStyle,
  useBlogContentFullBleed,
} from "./useBlogContentFullBleed";

export type FaqItem = {
  id?: string;
  question?: string;
  answer?: string;
};

type Props = {
  sectionHeading?: string;
  items?: FaqItem[];
};

export default function FaqWidget({ sectionHeading, items }: Props) {
  const list = (Array.isArray(items) ? items : []).filter(
    (i) =>
      (i.question && String(i.question).trim().length > 0) ||
      (i.answer && String(i.answer).trim().length > 0)
  );

  const [openKey, setOpenKey] = useState<string | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const bleed = useBlogContentFullBleed(rootRef, list.length > 0);

  if (list.length === 0) {
    return null;
  }

  return (
    <section
      ref={rootRef}
      className="min-w-0 max-w-full overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
      style={bleedStyle(bleed)}
      aria-label={sectionHeading?.trim() || "Frequently asked questions"}
    >
      {sectionHeading && sectionHeading.trim().length > 0 ? (
        <h2 className="border-b border-gray-100 bg-gray-50/80 px-4 py-2 text-lg font-semibold text-gray-900 sm:px-5 sm:text-xl">
          {sectionHeading.trim()}
        </h2>
      ) : null}
      <div className="divide-y divide-gray-100">
        {list.map((item, idx) => {
          const key = item.id && String(item.id).length > 0 ? String(item.id) : `faq-${idx}`;
          const open = openKey === key;
          const q =
            item.question && String(item.question).trim().length > 0
              ? String(item.question).trim()
              : "Question";
          return (
            <div key={key}>
              <h3 className="m-0 border-0 p-0 text-base font-semibold leading-snug text-gray-900 sm:text-lg">
                <button
                  type="button"
                  id={`faq-trigger-${key}`}
                  aria-controls={`faq-panel-${key}`}
                  onClick={() => setOpenKey(open ? null : key)}
                  className="flex w-full items-center justify-between gap-3 px-4 py-2 text-left font-semibold transition hover:bg-gray-50 sm:px-5"
                  aria-expanded={open}
                >
                  {q}
                  <ChevronDown
                    className={`h-5 w-5 shrink-0 text-gray-500 transition-transform ${
                      open ? "rotate-180" : ""
                    }`}
                    aria-hidden
                  />
                </button>
              </h3>
              {open ? (
                <div
                  id={`faq-panel-${key}`}
                  role="region"
                  aria-labelledby={`faq-trigger-${key}`}
                  className="border-t border-gray-50 px-4 pb-3 pt-1 sm:px-5"
                >
                  <p
                    className="prose prose-sm max-w-none blog-content m-0 text-sm text-gray-700 sm:text-base [&_a]:break-words"
                    dangerouslySetInnerHTML={{
                      __html: (item.answer || "").trim() || "&nbsp;",
                    }}
                  />
                </div>
              ) : null}
            </div>
          );
        })}
      </div>
    </section>
  );
}
