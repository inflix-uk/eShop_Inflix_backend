import { ChevronDownIcon } from "@heroicons/react/24/outline";
import React from "react";
import { SortOptions } from "@/app/components/SortOptions";
import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";

export default function SortMenu({
  selectedSort,
  setSelectedSort,
}: {
  selectedSort: { name: string };
  setSelectedSort: React.Dispatch<React.SetStateAction<{ name: string }>>;
}) {
  return (
    <>
      <Menu as="div" className="relative inline-block text-left">
        <MenuButton className="inline-flex justify-center w-full rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-100 focus:ring-green-500">
          Sort: {selectedSort.name}
          <ChevronDownIcon className="-mr-1 ml-2 h-5 w-5" aria-hidden="true" />
        </MenuButton>
        <MenuItems className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 focus:outline-none">
          {SortOptions.map((option) => (
            <MenuItem key={option.key}>
              {({ active }) => (
                <button
                  onClick={() => setSelectedSort(option)}
                  className={`${
                    active ? "bg-gray-100 text-gray-900" : "text-gray-700"
                  } block px-4 py-2 text-sm w-full text-left`}
                >
                  {option.name}
                </button>
              )}
            </MenuItem>
          ))}
        </MenuItems>
      </Menu>
    </>
  );
}
