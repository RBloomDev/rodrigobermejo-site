import { MetadataRoute } from 'next';

import { baseUrl as hostCanonico } from '@/lib/site';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = hostCanonico();

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/private/', '/api/'], // Example exclusions
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
