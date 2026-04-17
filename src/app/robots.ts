import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  // Use the current domain or environment variable
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL;
  
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/search',
        '/checkout',
        '/admin/',
        '/login',
        '/cgi-bin',
        '/revieworder',
        '/register',
        '/account',
        '/reset-password/',
        '/log-out',
        '/Support/Your-payments',
        '/customer/',
      ],
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}