"use client";

import { useState, FC } from "react";
import { useAuth } from "@/app/context/Auth";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Image from "next/image";

interface TopProps {
  toggleSidebar: () => void;
  isSidebarOpen: boolean;
  selectedPage: string;
  setSelectedPage: (page: string) => void;
}

const generateImageFromInitial = (initial: string) => {
  const canvas = document.createElement("canvas");
  canvas.width = 100;
  canvas.height = 100;
  const ctx = canvas.getContext("2d");

  if (!ctx) return "";

  // Set background color
  ctx.fillStyle = "#f3f4f6"; // Light background color
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Set text properties
  ctx.font = "50px Arial";
  ctx.fillStyle = "#333"; // Dark text color
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  // Draw the initial in the center
  ctx.fillText(initial, canvas.width / 2, canvas.height / 2);

  // Return the data URL of the image
  return canvas.toDataURL();
};

const TopBar: FC<TopProps> = ({
  toggleSidebar,
  isSidebarOpen,
  selectedPage,
  setSelectedPage,
}) => {
  const router = useRouter();
  const auth = useAuth();
  const firstName = auth?.user?.firstname || "";
  const imageUrl = firstName
    ? generateImageFromInitial(firstName.charAt(0).toUpperCase())
    : "";

  const handleLogout = async () => {
    await auth.logout();
    router.push("/");
  };

  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <div className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-x-4 border-b border-gray-200 bg-white px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-gray-700 lg:hidden"
          onClick={toggleSidebar}
        >
          <span className="sr-only">Open sidebar</span>
          <svg
            className="h-6 w-6"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            aria-hidden="true"
          >
            {isSidebarOpen ? (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            ) : (
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M3.75 6.75h16.5m-16.5 5.25h16.5m-16.5 5.25h16.5"
              />
            )}
          </svg>
        </button>

        {/* Separator */}
        <div
          className="h-6 w-px bg-gray-200 lg:hidden"
          aria-hidden="true"
        ></div>

        <div className="flex flex-1 gap-x-4 self-stretch lg:gap-x-6 justify-end">
          <div className="flex items-center gap-x-4 lg:gap-x-6">
            <button
              type="button"
              className="-m-2.5 p-2.5 text-gray-400 hover:text-primary"
            >
              <span className="sr-only">View notifications</span>
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0"
                />
              </svg>
            </button>

            {/* Separator */}
            <div
              className="hidden lg:block lg:h-6 lg:w-px lg:bg-gray-200"
              aria-hidden="true"
            ></div>

            {/* Profile dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="-m-1.5 flex items-center p-1.5"
                id="user-menu-button"
                aria-expanded={isOpen}
                aria-haspopup="true"
              >
                <span className="sr-only">Open user menu</span>
                <Image
                  className="h-8 w-8 rounded-full bg-gray-50"
                  src={imageUrl}
                  alt="Userr photo"
                  width={32}
                  height={32}
                />
                <span className="hidden lg:flex lg:items-center">
                  <span
                    className="ml-4 text-sm font-semibold leading-6 text-gray-900"
                    aria-hidden="true"
                  >
                    {auth?.user?.username}
                  </span>
                  <svg
                    className={`ml-2 h-5 w-5 ${
                      isOpen ? "transform rotate-180" : ""
                    } text-gray-400`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
              </button>

              {isOpen && (
                <div
                  className="absolute right-0 z-10 mt-2.5 w-32 origin-top-right rounded-md bg-white py-2 shadow-lg ring-1 ring-gray-900/5 focus:outline-none"
                  role="menu"
                  aria-orientation="vertical"
                  aria-labelledby="user-menu-button"
                >
                  <Link
                    href="/customer/dashboard"
                    className="block px-3 py-1 text-sm leading-6 text-gray-900 hover:bg-primary hover:text-white hover:text-sm hover:leading-6 hover:font-medium w-full text-left"
                    role="menuitem"
                  >
                    Your Profile
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="block px-3 py-1 text-sm leading-6 text-gray-900 hover:bg-primary hover:text-white hover:text-sm hover:leading-6 hover:font-medium w-full text-left"
                    role="menuitem"
                  >
                    Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        {isSidebarOpen && (
          <Sidebar
            selectedPage={selectedPage}
            setSelectedPage={setSelectedPage}
            isSidebarOpen={isSidebarOpen}
            toggleSidebar={toggleSidebar}
            closeSidebar={() => toggleSidebar()}
          />
        )}
      </div>
    </>
  );
};

export default TopBar;
