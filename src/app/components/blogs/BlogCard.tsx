import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/app/context/Auth";
import { Blog } from "../../../../types";

function plainExcerpt(raw: string | undefined): string {
  if (!raw) return "";
  return raw
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export default function BlogCard(
  props: (Blog | any) & { carouselSlide?: boolean }
) {
  const { carouselSlide = false, ...blog } = props;
  const auth = useAuth();

  const title = blog.title || blog.name || "";
  const slug = blog.slug || blog.permalink || "";

  if (!slug || slug.trim() === "") {
    console.warn("BlogCard: Missing slug for blog", blog._id || blog.id);
    return null;
  }

  const image = (() => {
    const apiBase = (process.env.NEXT_PUBLIC_API_URL || "").replace(/\/$/, "");

    if (blog.isNewBlog) {
      const fi: string = blog.featuredImage || "";
      if (!fi) return "";
      if (/^https?:\/\//i.test(fi)) return fi;
      const path = fi.startsWith("/") ? fi : `/${fi}`;
      return `${apiBase}/uploads${path}`;
    }

    const thumb: string = blog.thumbnailImage || "";
    if (!thumb) return "";
    if (/^https?:\/\//i.test(thumb)) return thumb;
    const ip = (auth.ip || "").replace(/\/$/, "");
    const path = thumb.startsWith("/") ? thumb : `/${thumb}`;
    return `${ip}${path}`;
  })();

  const alt = blog.featuredImageAlt || blog.blogthumbnailImageAlt || blog.title || blog.name || "Blog Image";
  const imageDescription = blog.featuredImageDescription || undefined;

  let category = blog.blogCategory || "";

  if (blog.categories && Array.isArray(blog.categories) && blog.categories.length > 0) {
    const cat = blog.categories[0];
    if (cat && typeof cat === "object" && cat.name) {
      category = cat.name;
    } else if (typeof cat === "string") {
      category = cat;
    }
  }

  const publishDate = blog.publishDate || blog.blogpublisheddate || blog.createdAt;
  const dateLabel = publishDate
    ? new Date(publishDate).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "";

  const excerptSource =
    blog.blogShortDescription ||
    blog.excerpt ||
    blog.shortDescription ||
    blog.description ||
    "";
  const excerpt = plainExcerpt(
    typeof excerptSource === "string" ? excerptSource : String(excerptSource || "")
  );

  const categoryLabel = (category && String(category).trim()) || "Blog";

  const slideClass = carouselSlide
    ? "embla__slide mr-3 flex min-w-0 shrink-0 flex-[0_0_calc((100%-0.75rem)/2)] sm:flex-[0_0_calc((100%-1rem)/2)] lg:flex-[0_0_calc((100%-3rem)/3)] px-1"
    : "embla__slide flex-[0_0_100%] md:flex-[0_0_33.33%] px-1.5";

  return (
    <div key={blog._id} className={slideClass}>
      <Link
        href={`/blogs/${slug}`}
        className="block h-full min-w-0 w-full max-w-full"
      >
        <div className="w-full min-w-0 max-w-full py-1.5 sm:py-5">
          <div className="bg-white rounded-lg shadow-xl sm:p-5 p-1.5 md:mb-0 mb-2 sm:mb-5 transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-card-shadow group cursor-pointer flex flex-col justify-between h-full min-w-0">
            <div className="mb-1 sm:mb-2 flex justify-between items-start gap-1 sm:gap-2">
              <div className="min-w-0">
                <span className="bg-gray-200 text-black px-1 sm:px-2 py-0.5 sm:py-1 rounded-lg text-[10px] sm:text-sm inline-block max-w-full truncate">
                  {categoryLabel}
                </span>
              </div>
              {dateLabel ? (
                <div className="text-[8px] sm:text-sm bg-primary px-1 sm:px-2 py-0.5 sm:py-1 text-white rounded-lg flex flex-col items-center justify-center shrink-0 text-nowrap">
                  <span>{dateLabel}</span>
                </div>
              ) : null}
            </div>

            <div className="text-xs sm:text-lg mb-1 sm:mb-2 min-h-0 sm:min-h-[4rem] flex items-start">
              <span className="line-clamp-2 font-medium text-gray-900 transition-colors duration-300 group-hover:text-primary">
                {title}
              </span>
            </div>

            <div className="relative w-full h-32 sm:h-56 min-h-0 sm:min-h-[14rem] shrink-0 overflow-hidden flex items-center justify-center bg-gray-50">
              <Image
                className="object-contain transform transition-transform duration-1500 ease-in-out scale-105 group-hover:scale-110"
                src={image || "/default-image.jpg"}
                alt={alt}
                title={imageDescription}
                loading="lazy"
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              />
            </div>

            <div className="flex flex-row justify-between items-end gap-1 sm:gap-2 md:mt-5 mt-auto w-full min-h-0 sm:min-h-[2.75rem]">
              <div className="min-w-0 flex-1 hidden sm:block">
                {excerpt ? (
                  <p className="text-sm text-gray-500 line-clamp-2 leading-snug">
                    {excerpt}
                  </p>
                ) : (
                  <p className="text-sm text-gray-400 italic">Read the full article</p>
                )}
              </div>
              <span className="text-[10px] sm:text-sm font-medium text-primary shrink-0 self-end pb-0.5">
                Read more
              </span>
            </div>
          </div>
        </div>
      </Link>
    </div>
  );
}
