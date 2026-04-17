// Utility functions for blog components

export function getFullImageUrl(imagePath) {
  if (!imagePath) return "/placeholder-blog.jpg";
  if (imagePath.startsWith("http")) return imagePath;
  return `${process.env.NEXT_PUBLIC_API_URL}/uploads/${imagePath.replace("/uploads/", "")}`;
}
