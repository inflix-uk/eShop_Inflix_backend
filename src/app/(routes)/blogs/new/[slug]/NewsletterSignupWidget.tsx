"use client";

import { useState, useCallback, useId, useRef } from "react";
import { useAuth } from "@/app/context/Auth";
import { getFullImageUrl } from "./blogUtils";

const DEFAULT_EMAIL_PLACEHOLDER = "Enter your email";
/** Placeholders that must never be shown (e.g. mistaken personal emails saved as CMS text). */
const BLOCKED_NEWSLETTER_PLACEHOLDERS = new Set([
  "malikoffical32@gmail.com",
]);

function resolveNewsletterPlaceholder(raw?: string): string {
  const s = (raw ?? "").trim();
  if (!s) return DEFAULT_EMAIL_PLACEHOLDER;
  if (BLOCKED_NEWSLETTER_PLACEHOLDERS.has(s.toLowerCase())) {
    return DEFAULT_EMAIL_PLACEHOLDER;
  }
  return s;
}

export type NewsletterWidgetProps = {
  heading?: string;
  description?: string;
  placeholder?: string;
  buttonLabel?: string;
  imageUrl?: string;
  subscribeMode?: string;
};

export default function NewsletterSignupWidget({
  heading = "Subscribe to our newsletter",
  description = "",
  placeholder: placeholderProp = DEFAULT_EMAIL_PLACEHOLDER,
  buttonLabel = "Subscribe",
  imageUrl = "",
  subscribeMode = "content_widget",
}: NewsletterWidgetProps) {
  const isFooterEmbed = subscribeMode === "footer_cms";
  const placeholder = resolveNewsletterPlaceholder(placeholderProp);
  const auth = useAuth();
  const emailFieldId = useId();

  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const submitLockRef = useRef(false);

  const src = imageUrl ? getFullImageUrl(imageUrl) : "";

  const onSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const trimmed = email.trim();
      if (!trimmed) {
        setMessage("Please enter your email.");
        setStatus("error");
        return;
      }

      if (submitLockRef.current) return;
      submitLockRef.current = true;

      setStatus("loading");
      setMessage("");

      const fullName = auth?.user
        ? `${auth?.user?.firstname ?? ""} ${auth?.user?.lastname ?? ""}`.trim() || null
        : null;

      const baseRaw =
        auth?.ip?.trim() ||
        `${(process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "")}/`;
      const base = baseRaw.endsWith("/") ? baseRaw : `${baseRaw}/`;
      const url = `${base}newsletter/subscribers`;

      type Outcome = "success" | "duplicate" | "bad" | "network";
      let outcome: Outcome = "bad";
      let errMsg = "Something went wrong. Try again.";

      try {
        const res = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            fullName,
            email: trimmed,
            mode: subscribeMode,
          }),
        });

        const text = await res.text();
        let data: { message?: string; status?: number | string } = {};
        if (text) {
          try {
            data = JSON.parse(text) as typeof data;
          } catch {
            data = {};
          }
        }

        const bodyStatus = Number(data.status);
        const msg =
          typeof data.message === "string" ? data.message.trim() : "";

        const subscribedByBody =
          bodyStatus === 201 ||
          msg.toLowerCase() === "newsletter subscribed successfully" ||
          /subscribed successfully/i.test(msg);

        if (res.ok || subscribedByBody) {
          outcome = "success";
        } else if (res.status === 400) {
          outcome = "duplicate";
          errMsg = msg || "This email is already subscribed.";
        }
      } catch {
        outcome = "network";
      } finally {
        submitLockRef.current = false;
      }

      if (outcome === "success") {
        setEmail("");
        setStatus("success");
        setMessage("Thanks — you're subscribed!");
        return;
      }
      if (outcome === "duplicate") {
        setStatus("error");
        setMessage(errMsg);
        return;
      }
      setStatus("error");
      setMessage(errMsg);
    },
    [auth?.ip, auth?.user, email, subscribeMode]
  );

  return (
<div
  className={
    isFooterEmbed
      ? "w-full max-w-full rounded-md border border-gray-700 p-2"
      : "my-2 w-full max-w-full rounded-lg border border-gray-700 p-2 shadow-sm sm:p-3"
  }
>
  {/* Image on top */}
  {src && (
    <div className="relative w-full overflow-hidden rounded-md bg-gray-800">
      <img
        src={src}
        alt="Newsletter"
        className={
          isFooterEmbed
            ? "h-14 w-full object-cover"
            : "h-24 w-full object-cover"
        }
      />
    </div>
  )}

  {/* Content */}
  <div
    className={
      isFooterEmbed
        ? "mt-1.5 flex w-full flex-col gap-1"
        : "mt-2 flex w-full flex-col gap-1"
    }
  >
    <h3
      id={isFooterEmbed ? "footer-newsletter-heading" : undefined}
      className={
        isFooterEmbed
          ? "m-0 text-base font-medium leading-tight text-white"
          : "text-sm font-semibold text-white sm:text-base"
      }
    >
      {heading}
    </h3>

    {description && (
      <p
        className={
          isFooterEmbed
            ? "text-xs leading-snug text-gray-300"
            : "text-xs text-gray-300 sm:text-sm"
        }
      >
        {description}
      </p>
    )}

    {/* Form */}
    <form
      onSubmit={onSubmit}
      className={isFooterEmbed ? "mt-0 flex w-full flex-col gap-1" : "mt-1 flex w-full flex-col gap-1"}
    >
      <label htmlFor={emailFieldId} className="sr-only">
        Email
      </label>

      <input
        id={emailFieldId}
        type="email"
        name="email"
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder={placeholder}
        disabled={status === "loading"}
        className="h-8 w-full rounded-md border border-gray-600 bg-gray-900 px-2 text-xs text-white placeholder-gray-400 outline-none focus:border-green-500 focus:ring-1 focus:ring-green-400"
      />

      <button
        type="submit"
        disabled={status === "loading"}
        className="h-8 w-full rounded-md bg-green-600 px-3 text-xs font-medium text-white transition hover:opacity-90 disabled:opacity-60"
      >
        {status === "loading" ? "Please wait…" : buttonLabel}
      </button>
    </form>

    {/* Message */}
    {message && (
      <p
        className={`mt-1 text-xs ${
          status === "success" ? "text-green-400" : "text-red-500"
        }`}
      >
        {message}
      </p>
    )}
  </div>
</div>
  );
}