import { NextResponse } from 'next/server';

export const runtime = 'edge';

// Simple in-memory cache for images (in production, you'd want to use Redis or similar)
const imageCache = new Map<string, { data: ArrayBuffer; contentType: string; timestamp: number }>();
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const imageUrl = searchParams.get('url');
  const doubanId = searchParams.get('doubanId');

  if (!imageUrl) {
    return NextResponse.json({ error: 'Missing image URL' }, { status: 400 });
  }

  // Check cache first
  const cacheKey = doubanId || imageUrl;
  const cached = imageCache.get(cacheKey);
  
  if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
    return new Response(cached.data, {
      status: 200,
      headers: {
        'Content-Type': cached.contentType,
        'Cache-Control': 'public, max-age=86400', // 24 hours
        'X-Cache': 'HIT',
      },
    });
  }

  try {
    // Try multiple approaches to fetch the image
    const fetchAttempts = [
      // Attempt 1: Direct fetch with Douban headers
      async () => {
        const response = await fetch(imageUrl, {
          headers: {
            'Referer': 'https://movie.douban.com/',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
          },
        });
        return response;
      },
      // Attempt 2: Try with different User-Agent
      async () => {
        const response = await fetch(imageUrl, {
          headers: {
            'Referer': 'https://movie.douban.com/',
            'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          },
        });
        return response;
      },
      // Attempt 3: Try without Referer
      async () => {
        const response = await fetch(imageUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
            'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8',
          },
        });
        return response;
      }
    ];

    let imageResponse: Response | null = null;
    let lastError: Error | null = null;

    // Try each fetch attempt
    for (const attempt of fetchAttempts) {
      try {
        imageResponse = await attempt();
        if (imageResponse.ok) {
          break; // Success, exit the loop
        }
      } catch (error) {
        lastError = error as Error;
        continue; // Try next attempt
      }
    }

    if (!imageResponse || !imageResponse.ok) {
      // All attempts failed, return a fallback image
      console.log(`Failed to fetch image: ${imageUrl}, error: ${lastError?.message}`);
      
      // Return a simple fallback image (1x1 transparent PNG)
      const fallbackImage = new Uint8Array([
        0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00, 0x00, 0x00, 0x0D,
        0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
        0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4, 0x89, 0x00, 0x00, 0x00,
        0x0A, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9C, 0x63, 0x00, 0x01, 0x00, 0x00,
        0x05, 0x00, 0x01, 0x0D, 0x0A, 0x2D, 0xB4, 0x00, 0x00, 0x00, 0x00, 0x49,
        0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82
      ]);

      return new Response(fallbackImage, {
        status: 200,
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600', // 1 hour for fallback
          'X-Cache': 'FALLBACK',
        },
      });
    }

    const contentType = imageResponse.headers.get('content-type') || 'image/jpeg';
    const imageData = await imageResponse.arrayBuffer();

    // Cache the successful image
    imageCache.set(cacheKey, {
      data: imageData,
      contentType,
      timestamp: Date.now(),
    });

    // Clean up old cache entries (keep only last 1000 entries)
    if (imageCache.size > 1000) {
      const entries = Array.from(imageCache.entries());
      entries.sort((a, b) => b[1].timestamp - a[1].timestamp);
      const toDelete = entries.slice(1000);
      toDelete.forEach(([key]) => imageCache.delete(key));
    }

    return new Response(imageData, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400', // 24 hours
        'X-Cache': 'MISS',
      },
    });

  } catch (error) {
    console.error('Error in image cache API:', error);
    return NextResponse.json(
      { error: 'Error fetching image' },
      { status: 500 }
    );
  }
} 