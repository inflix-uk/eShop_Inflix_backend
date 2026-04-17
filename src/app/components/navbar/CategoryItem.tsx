import Link from 'next/link';
import { useState } from 'react';

interface CategoryItemProps {
  category: {
    _id: string;
    name: string;
    subCategory: string[];
  };
}

const CategoryItem: React.FC<CategoryItemProps> = ({ category }) => {
  const [isOpen, setIsOpen] = useState(false);
  const validSubCategories = category.subCategory.filter(
    (subCat) => subCat.trim() !== ''
  );

  return (
    <li
      className="relative dropdown flex items-center"
      key={category._id}
      onMouseEnter={() => setIsOpen(true)}
      onMouseLeave={() => setIsOpen(false)}
    >
      <div className="flex items-center" key={category._id}>
        <Link
          href={`/categories/${encodeURIComponent(
            category.name.toLowerCase()
          )}`}
          passHref
        >
          <p className="hover:text-gray-200">{category.name.replace(/-/g, ' ')}</p>
        </Link>
        {validSubCategories.length > 0 && (
          <svg
            style={{ height: "30px", width: "30px" }}
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
          >
            <path
              fill="currentColor"
              d="m12 15l-4.243-4.242l1.415-1.414L12 12.172l2.828-2.828l1.415 1.414z"
            />
          </svg>
        )}
      </div>
      {isOpen && validSubCategories.length > 0 && (
        <ul className="absolute dropdown-menu bg-white text-black mt-0 space-y-2 py-2 rounded shadow-lg z-10 min-w-48 top-8 left-0">
          {validSubCategories.map((subCat, index) => (
            <li key={index}>
              <Link
                href={`/categories/${encodeURIComponent(category.name.toLowerCase())}/${encodeURIComponent(
                  subCat.toLowerCase()
                )}`}
                passHref
              >
                <p className="block px-4 py-2 hover:bg-gray-200">{subCat.replace(/-/g, ' ')}</p>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
};

export default CategoryItem;
