import { NextResponse } from 'next/server';
import axios from 'axios';
import { SitemapStream, streamToPromise } from 'sitemap';
import { Readable } from 'stream';
import fs from 'fs';

export const runtime = 'nodejs';

// CORS setup
const ALLOWED_ORIGINS = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'http://localhost:3201',
  'http://127.0.0.1:3201',
  'http://localhost:5173',
  'https://zextons.co.uk',
  'https://www.zextons.co.uk',
  'https://green.zextons.co.uk/',
];

function applyCORS(res: NextResponse, origin?: string) {
  const allowed = origin && ALLOWED_ORIGINS.includes(origin) ? origin : '*';
  res.headers.set('Access-Control-Allow-Origin', allowed);
  res.headers.set('Vary', 'Origin');
  res.headers.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.headers.set('Access-Control-Max-Age', '86400');
  return res;
}

async function generate() {
  try {
    const response = await axios.post(`${process.env.NEXT_PUBLIC_API_URL}/create/sitemap`);
    const links: any[] = Array.isArray(response.data) ? response.data : [];

    if (!links.length) {
      return NextResponse.json(
        { ok: false, message: 'No URLs returned from backend' },
        { status: 400 }
      );
    }

    const stream = new SitemapStream({ hostname: 'https://zextons.co.uk/' });
    const sitemap = await streamToPromise(Readable.from(links).pipe(stream));

    // Write to the public folder (available at /sitemap.xml)
    const outPath = `${process.cwd()}/public/sitemap.xml`;
    fs.writeFileSync(outPath, sitemap.toString());

    return NextResponse.json({ ok: true, count: links.length, path: '/sitemap.xml' });
  } catch (error: any) {
    console.error('API generate-sitemap error:', error);
    return NextResponse.json(
      { ok: false, message: 'Failed to generate sitemap' },
      { status: 500 }
    );
  }
}

export async function OPTIONS(request: Request) {
  const origin = request.headers.get('origin') || '';
  const res = new NextResponse(null, { status: 204 });
  return applyCORS(res, origin);
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin') || '';
  const res = await generate();
  return applyCORS(res, origin);
}

export async function GET(request: Request) {
  const origin = request.headers.get('origin') || '';
  const res = await generate();
  return applyCORS(res, origin);
}
