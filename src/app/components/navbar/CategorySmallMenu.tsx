import { useState } from "react";
import { Dialog, DialogTitle } from "@headlessui/react";

import Link from "next/link";
import type { NavbarItem } from "@/app/lib/features/navbarcategories/navbarTypes";
import { isNavbarCustom } from "@/app/lib/features/navbarcategories/navbarTypes";
import { NavbarCustomLinkDrawerRow } from "./NavbarCustomLinkItem";

interface CategorySmallMenuProps {
  isOpen: boolean;
  toggleDrawer: () => void;
  navItems: NavbarItem[];
}

const CategorySmallMenu: React.FC<CategorySmallMenuProps> = ({
  isOpen,
  toggleDrawer,
  navItems,
}) => {
  const [expandedCategory, setExpandedCategory] = useState<string | null>(null);

  const toggleAccordion = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? null : categoryId);
  };

  return (
    <Dialog open={isOpen} onClose={toggleDrawer} className="fixed inset-0 z-40">
      <div className="fixed inset-0 bg-black opacity-50" aria-hidden="true" />
      <div className="fixed inset-y-0 left-0 max-w-xs w-full bg-white p-4 overflow-y-auto scrollbar-thin scrollbar-webkit">
        <DialogTitle className="text-lg font-semibold text-gray-800">
          Menu
        </DialogTitle>
        <button
          type="button"
          onClick={toggleDrawer}
          className="text-gray-900 bg-transparent hover:bg-gray-200 hover:text-gray-900 rounded-lg text-sm w-8 h-8 absolute top-2.5 right-2.5 inline-flex items-center justify-center"
        >
          <svg
            className="w-3 h-3"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 14 14"
          >
            <path
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6"
            />
          </svg>
          <span className="sr-only">Close menu</span>
        </button>

        <div className="py-4 overflow-y-auto">
          <ul className="space-y-2 font-medium">
            {navItems.length === 0 && (
              <li className="px-2 text-sm text-gray-500">No menu items.</li>
            )}
            {navItems.map((item, index) => {
              if (isNavbarCustom(item)) {
                return (
                  <NavbarCustomLinkDrawerRow
                    key={item._id}
                    link={{ label: item.label, path: item.path }}
                    index={index}
                    onNavigate={toggleDrawer}
                  />
                );
              }

              const validSubCategories = item.subCategory.filter(
                (subCat) => subCat.trim() !== ""
              );
              return (
                <li key={item._id} className="relative dropdown">
                  <button
                    type="button"
                    onClick={() => toggleAccordion(item._id)}
                    className="flex items-center w-full p-2 text-base text-gray-900 transition duration-75 rounded-lg hover:bg-gray-100"
                  >
                    <Link
                      href={`/categories/${encodeURIComponent(item.name.toLowerCase())}`}
                    >
                      <p className="flex-1 text-left hover:text-gray-900">
                        {item.name.replace(/-/g, " ")}
                      </p>
                    </Link>
                    {validSubCategories.length > 0 && (
                      <svg
                        style={{ height: "30px", width: "30px" }}
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <path
                          fill="currentColor"
                          d="m12 15l-4.243-4.242l1.415-1.414L12 12.172l2.828-2.828l1.415 1.414z"
                        />
                      </svg>
                    )}
                  </button>

                  {expandedCategory === item._id &&
                    validSubCategories.length > 0 && (
                      <ul className="border-y border-gray-300 mt-2 space-y-2">
                        {validSubCategories.map((subCat, subIndex) => (
                          <li key={subIndex}>
                            <Link
                              href={`/categories/${encodeURIComponent(item.name.toLowerCase())}/${encodeURIComponent(
                                subCat.toLowerCase()
                              )}`}
                            >
                              <p className="block px-4 py-2 hover:bg-gray-200 rounded-md">
                                {subCat.replace(/-/g, " ")}
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Dialog>
  );
};

export default CategorySmallMenu;
