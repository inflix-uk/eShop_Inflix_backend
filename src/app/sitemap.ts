import { MetadataRoute } from 'next';
import fs from 'fs';
import path from 'path';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  try {
    // First try to read existing sitemap.xml from public folder
    const sitemapPath = path.join(process.cwd(), 'public', 'sitemap.xml');
    
    if (fs.existsSync(sitemapPath)) {
      // Parse existing sitemap.xml and return it
      const sitemapContent = fs.readFileSync(sitemapPath, 'utf-8');
      const urlMatches = sitemapContent.match(/<loc>(.*?)<\/loc>/g) || [];
      const urls = urlMatches.map(match => {
        const url = match.replace(/<\/?loc>/g, '');
        return {
          url,
          lastModified: new Date(),
          changeFrequency: 'daily' as const,
          priority: 0.8,
        };
      });
      
      if (urls.length > 0) {
        return urls;
      }
    }
    
    // Fallback: fetch from API if no local sitemap exists
    const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/create/sitemap`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!res.ok) {
      console.error('Failed to fetch sitemap data');
      return [];
    }
    
    const apiUrls = await res.json();
    
    // Use the current domain or environment variable
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
    
    return apiUrls.map((url: any) => ({
      url: `${baseUrl}${url.loc}`,
      lastModified: url.lastmod || new Date(),
      changeFrequency: 'daily' as const,
      priority: url.priority || 0.8,
    }));
  } catch (error) {
    console.error('Error generating sitemap:', error);
    return [];
  }
}