"use client";

import Link from "next/link";
import { FC } from "react";

interface BreadCrumbItem {
  name: string;
  link: string;
  current?: boolean;
}

export interface BreadCrumbProps {
  breadcrumb: BreadCrumbItem[];
}

const BreadCrumb: FC<BreadCrumbProps> = ({ breadcrumb }) => {
  return (
    <div className="container max-w-screen-xl mx-auto flex md:flex-row mt-10 px-10">
      <nav className="flex mb-4 text-sm text-gray-600" aria-label="Breadcrumb">
        <ol role="list" className="flex items-center">
          <li>
            <div>
              <Link href="/" className="hover:underline">
                Home
                <span className="sr-only">Home</span>
              </Link>
            </div>
          </li>
          <li>
            <span className="mx-2">»</span>
          </li>
          {breadcrumb.map((page) => (
            <li key={page.name}>
              <div className="flex items-center">
                <Link
                  href={page.link}
                  className="text-sm font-medium text-gray-500 hover:text-gray-700 hover:underline"
                  aria-current={page.current ? "page" : undefined}
                >
                  {page.name}
                </Link>
              </div>
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
};

export default BreadCrumb;
