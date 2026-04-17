"use client";

import Link from "next/link";
import { FC } from "react";
import Image from "next/image";
import { XMarkIcon } from "@heroicons/react/24/outline";
import Zextons from "../../assets/Zextons.png";
interface SidebarProps {
  selectedPage: string;
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  closeSidebar: () => void;
  setSelectedPage: (page: string) => void;
}

const Sidebar: FC<SidebarProps> = ({
  selectedPage,
  isSidebarOpen,
  toggleSidebar,
  closeSidebar,
}) => {
  return (
    <>
      {isSidebarOpen && (
        <div className="fixed inset-0 flex z-50 lg:hidden">
          {/* Background overlay */}
          <div
            className="fixed inset-0 bg-black opacity-50 z-50"
            onClick={toggleSidebar}
          ></div>

          {/* Sidebar itself */}
          <div className="relative flex flex-col max-w-xs w-full bg-white z-50">
            <div className="px-2 w-full relative flex items-start justify-between">
              <Link
                href="/"
                className="flex justify-start items-center w-full h-16"
              >
                <Image
                  className="h-16 w-auto"
                  src={Zextons}
                  alt="Zextons Limited"
                  width={100}
                />
              </Link>
              <button
                onClick={closeSidebar}
                aria-label="Close sidebar"
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 focus:outline-none"
              >
                <XMarkIcon className="w-8 h-8 text-gray-700" />
              </button>
            </div>
            <div className="mt-2 flex-1 h-0 overflow-y-auto">
              <nav className="px-2 space-y-1">
                {/* Sidebar content */}
                <ul
                  role="list"
                  className="flex flex-1 flex-col -mx-2 space-y-1"
                >
                  <li>
                    <Link
                      href="/customer/dashboard"
                      className={`${
                        selectedPage === "Customer-Details"
                          ? "bg-gray-50 text-primary"
                          : "text-gray-700 hover:text-primary hover:bg-gray-50"
                      } group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className={`h-5 w-5 shrink-0 ${
                          selectedPage === "Customer-Details"
                            ? "text-primary"
                            : "text-gray-400 group-hover:text-primary"
                        } my-auto`}
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                        />
                      </svg>
                      Your Details
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/customer/my-orders"
                      className={`${
                        selectedPage === "My-Orders"
                          ? "bg-gray-50 text-primary"
                          : "text-gray-700 hover:text-primary hover:bg-gray-50"
                      } group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full`}
                    >
                      <svg
                        className={`h-5 w-5 shrink-0 ${
                          selectedPage === "My-Orders"
                            ? "text-primary"
                            : "text-gray-400 group-hover:text-primary"
                        } my-auto`}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                        />
                      </svg>
                      My Orders
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/customer/returns"
                      className={`${
                        selectedPage === "Returns"
                          ? "bg-gray-50 text-primary"
                          : "text-gray-700 hover:text-primary hover:bg-gray-50"
                      } group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full`}
                    >
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className={`h-5 w-5 shrink-0 ${
                          selectedPage === "Returns"
                            ? "text-primary"
                            : "text-gray-400 group-hover:text-primary"
                        } my-auto`}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75"
                        />
                      </svg>
                      Returns
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/customer/messages"
                      className={`${
                        selectedPage === "Messages"
                          ? "bg-gray-50 text-primary"
                          : "text-gray-700 hover:text-primary hover:bg-gray-50"
                      } group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full`}
                    >
                      <svg
                        className={`h-5 w-5 shrink-0 ${
                          selectedPage === "Messages"
                            ? "text-primary"
                            : "text-gray-400 group-hover:text-primary"
                        } my-auto`}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                        />
                      </svg>
                      Messages
                    </Link>
                  </li>
                </ul>
              </nav>
            </div>
          </div>
        </div>
      )}
      {/* Static sidebar for desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-30 lg:flex lg:w-72 lg:flex-col">
        {/* Sidebar component */}
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-gray-200 bg-white px-6 pb-4 scrollbar-thin scrollbar-webkit">
          <div className="flex shrink-0 justify-center items-center w-full">
            <Link href="/" className="flex justify-center items-center h-16">
              <Image
                className="w-full h-28 object-contain"
                src={Zextons}
                alt="Zextons Limited"
                width={200}
              />
            </Link>
          </div>
          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col -mx-2 space-y-1">
              <li>
                <Link
                  href="/customer/dashboard"
                  className={`${
                    selectedPage === "Customer-Details"
                      ? "bg-gray-50 text-primary"
                      : "text-gray-700 hover:text-primary hover:bg-gray-50"
                  } group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-5 w-5 shrink-0 ${
                      selectedPage === "Customer-Details"
                        ? "text-primary"
                        : "text-gray-400 group-hover:text-primary"
                    } my-auto`}
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
                    />
                  </svg>
                  Your Details
                </Link>
              </li>
              <li>
                <Link
                  href="/customer/my-orders"
                  className={`${
                    selectedPage === "My-Orders"
                      ? "bg-gray-50 text-primary"
                      : "text-gray-700 hover:text-primary hover:bg-gray-50"
                  } group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full`}
                >
                  <svg
                    className={`h-5 w-5 shrink-0 ${
                      selectedPage === "My-Orders"
                        ? "text-primary"
                        : "text-gray-400 group-hover:text-primary"
                    } my-auto`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                    />
                  </svg>
                  My Orders
                </Link>
              </li>
              <li>
                <Link
                  href="/customer/returns"
                  className={`${
                    selectedPage === "Returns"
                      ? "bg-gray-50 text-primary"
                      : "text-gray-700 hover:text-primary hover:bg-gray-50"
                  } group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                    className={`h-5 w-5 shrink-0 ${
                      selectedPage === "Returns"
                        ? "text-primary"
                        : "text-gray-400 group-hover:text-primary"
                    } my-auto`}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M7.5 7.5h-.75A2.25 2.25 0 0 0 4.5 9.75v7.5a2.25 2.25 0 0 0 2.25 2.25h7.5a2.25 2.25 0 0 0 2.25-2.25v-7.5a2.25 2.25 0 0 0-2.25-2.25h-.75m-6 3.75 3 3m0 0 3-3m-3 3V1.5m6 9h.75a2.25 2.25 0 0 1 2.25 2.25v7.5a2.25 2.25 0 0 1-2.25 2.25h-7.5a2.25 2.25 0 0 1-2.25-2.25v-.75"
                    />
                  </svg>
                  Returns
                </Link>
              </li>
              <li>
                <Link
                  href="/customer/messages"
                  className={`${
                    selectedPage === "Messages"
                      ? "bg-gray-50 text-primary"
                      : "text-gray-700 hover:text-primary hover:bg-gray-50"
                  } group flex gap-x-3 rounded-md p-2 text-sm leading-6 font-semibold w-full`}
                >
                  <svg
                    className={`h-5 w-5 shrink-0 ${
                      selectedPage === "Messages"
                        ? "text-primary"
                        : "text-gray-400 group-hover:text-primary"
                    } my-auto`}
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth={1.5}
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M20.25 8.511c.884.284 1.5 1.128 1.5 2.097v4.286c0 1.136-.847 2.1-1.98 2.193-.34.027-.68.052-1.02.072v3.091l-3-3c-1.354 0-2.694-.055-4.02-.163a2.115 2.115 0 0 1-.825-.242m9.345-8.334a2.126 2.126 0 0 0-.476-.095 48.64 48.64 0 0 0-8.048 0c-1.131.094-1.976 1.057-1.976 2.192v4.286c0 .837.46 1.58 1.155 1.951m9.345-8.334V6.637c0-1.621-1.152-3.026-2.76-3.235A48.455 48.455 0 0 0 11.25 3c-2.115 0-4.198.137-6.24.402-1.608.209-2.76 1.614-2.76 3.235v6.226c0 1.621 1.152 3.026 2.76 3.235.577.075 1.157.14 1.74.194V21l4.155-4.155"
                    />
                  </svg>
                  Messages
                </Link>
              </li>
            </ul>
          </nav>
        </div>
      </div>
    </>
  );
};

export default Sidebar;
