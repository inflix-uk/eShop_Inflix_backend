"use client";

import { useEffect, useState } from 'react';

interface TocItem {
  id: string;
  text: string;
  level: number;
}

export default function TableOfContents({ content }: { content: string }) {
  const [toc, setToc] = useState<TocItem[]>([]);
  const [activeId, setActiveId] = useState<string>('');

  // Extract headings from content
  useEffect(() => {
    if (!content) return;

    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = content;
    
    // Find all heading elements
    const headings = tempDiv.querySelectorAll('h1, h2, h3, h4, h5, h6');
    
    const tocItems: TocItem[] = [];
    
    headings.forEach((heading) => {
      const id = heading.id || '';
      const text = heading.textContent || '';
      const level = parseInt(heading.tagName.substring(1), 10);
      
      if (id && text) {
        tocItems.push({ id, text, level });
      } else if (text) {
        // If heading doesn't have an ID, we'll need to add one
        const generatedId = text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');
        
        tocItems.push({ id: generatedId, text, level });
        
        // Note: In a real implementation, you'd need to modify the actual DOM
        // to add these IDs to the headings if they don't exist
      }
    });
    
    setToc(tocItems);
  }, [content]);

  // Set up intersection observer to highlight active section
  useEffect(() => {
    if (typeof window === 'undefined' || !toc.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveId(entry.target.id);
          }
        });
      },
      {
        rootMargin: '-100px 0px -80% 0px',
        threshold: 0
      }
    );

    // Observe all heading elements
    toc.forEach(({ id }) => {
      const element = document.getElementById(id);
      if (element) {
        observer.observe(element);
      }
    });

    return () => {
      toc.forEach(({ id }) => {
        const element = document.getElementById(id);
        if (element) {
          observer.unobserve(element);
        }
      });
    };
  }, [toc]);

  if (toc.length === 0) {
    return null;
  }

  return (
    <nav className="p-4 bg-white shadow-md rounded-lg">
      <h2 className="text-xl font-semibold mb-4">Table of Contents</h2>
      <ul className="space-y-2">
        {toc.map((item) => (
          <li 
            key={item.id} 
            className={`pl-${(item.level - 1) * 4} ${activeId === item.id ? 'font-semibold text-blue-600' : 'text-gray-700'}`}
          >
            <a 
              href={`#${item.id}`} 
              className="hover:text-blue-700 transition-colors"
              onClick={(e) => {
                e.preventDefault();
                document.getElementById(item.id)?.scrollIntoView({
                  behavior: 'smooth'
                });
              }}
            >
              {item.text}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}