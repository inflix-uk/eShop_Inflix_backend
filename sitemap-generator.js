import axios from 'axios';
import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import fs from 'fs';

const fetchUrls = async () => {
    try {
        const response = await axios.post(`https://api.zextons.co.uk/create/sitemap`);
        if (response.status !== 200) {
            throw new Error(`Failed to fetch URLs: Status code ${response.status}`);
        }
        return response.data;
    } catch (error) {
        console.error('Error fetching URLs:', error);
        return [];
    }
};

const generateSitemap = async () => {
    const links = await fetchUrls();
    if (links.length === 0) {
        console.error('No URLs to generate sitemap');
        return;
    }

    // Use SitemapStream to create a valid XML format
    const stream = new SitemapStream({ hostname: 'https://zextons.co.uk/' });
    
    try {
        const sitemap = await streamToPromise(Readable.from(links).pipe(stream));
        fs.writeFileSync('./public/sitemap.xml', sitemap.toString());
        console.log('Sitemap generated successfully!');
    } catch (err) {
        console.error('Error generating sitemap:', err);
    }
};

generateSitemap();
