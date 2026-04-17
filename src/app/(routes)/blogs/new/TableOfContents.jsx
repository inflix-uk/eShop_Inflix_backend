import{ useEffect, useState } from "react";

// Heading extraction logic (JS version)
function extractHeadings() {
  const blogElement = document.getElementById("blog-content");
  if (!blogElement) return [];
  const headingElements = blogElement.querySelectorAll("h1, h2, h3, h4, h5, h6");
  const headingNumbers = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };

  const headingData = Array.from(headingElements).map((heading) => {
    const level = parseInt(heading.tagName.replace("H", ""), 10);
    for (let i = level + 1; i <= 6; i++) headingNumbers[i] = 0;
    headingNumbers[level] += 1;
    const numberPrefix = Object.keys(headingNumbers)
      .slice(0, level)
      .map((key) => headingNumbers[Number(key)])
      .filter((n) => n > 0)
      .join(".");
    const id =
      heading.id ||
      (heading.textContent || "").replace(/\s+/g, "-").toLowerCase();
    return {
      text: heading.textContent || "",
      id,
      level,
      number: numberPrefix,
    };
  });

  headingElements.forEach((heading, idx) => {
    if (!heading.id) heading.id = headingData[idx].id;
  });

  return headingData;
}

const TableOfContents = () => {
  const [headings, setHeadings] = useState([]);
  const [isTocVisible, setIsTocVisible] = useState(false);

  useEffect(() => {
    setHeadings(extractHeadings());
  }, []);

  if (headings.length === 0) return null;

  return (
    <>
      {/* Icon button for small screens */}
      <div className="md:hidden flex justify-start mb-4">
        <button
          onClick={() => setIsTocVisible(!isTocVisible)}
          className="p-2 bg-gray-200 rounded-lg focus:outline-none"
        >
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="size-6">
            <path fillRule="evenodd" d="M2.25 4.5A.75.75 0 0 1 3 3.75h14.25a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75Zm0 4.5A.75.75 0 0 1 3 8.25h9.75a.75.75 0 0 1 0 1.5H3A.75.75 0 0 1 2.25 9Zm15-.75A.75.75 0 0 1 18 9v10.19l2.47-2.47a.75.75 0 1 1 1.06 1.06l-3.75 3.75a.75.75 0 0 1-1.06 0l-3.75-3.75a.75.75 0 1 1 1.06-1.06l2.47 2.47V9a.75.75 0 0 1 .75-.75Zm-15 5.25a.75.75 0 0 1 .75-.75h9.75a.75.75 0 0 1 0 1.5H3a.75.75 0 0 1-.75-.75Z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      {/* Table of Contents for medium and above screens */}
      <div
        className={`${isTocVisible ? "block" : "hidden"} md:block bg-white shadow-lg p-4 mb-6 rounded-lg border border-gray-200`}
      >
        <h2 className="font-bold text-xl mb-4">Table of Contents</h2>
        <ul className="space-y-2">
          {headings.map((heading, index) => (
            <li key={index} className={`pl-${(heading.level - 1) * 3} text-xs`}>
              <a
                href={`#${heading.id}`}
                className="text-gray-400 hover:underline"
                onClick={e => {
                  e.preventDefault();
                  document.getElementById(heading.id)?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                {heading.number} {heading.text}
              </a>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default TableOfContents;
