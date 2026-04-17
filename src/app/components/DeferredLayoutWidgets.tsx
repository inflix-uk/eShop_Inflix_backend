"use client";

import dynamic from "next/dynamic";
import BlackFridayModal from "@/app/components/common/BlackFridayModal";

const ChatWidget = dynamic(() => import("@/app/components/ChatWidget"), {
  ssr: false,
});
const ToastContainer = dynamic(
  () =>
    import("react-toastify").then((m) => ({ default: m.ToastContainer })),
  { ssr: false }
);

/** `dynamic(..., { ssr: false })` must live in a Client Component (not root layout). */
export default function DeferredLayoutWidgets() {
  return (
    <>
      <BlackFridayModal />
      <ChatWidget />
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
    </>
  );
}
