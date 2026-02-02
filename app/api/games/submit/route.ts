import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase';
import { sanitizeGameHtml, validateGameFields } from '@/lib/sanitize';

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80);
}

export async function POST(req: NextRequest) {
  try {
    const apiKey = req.headers.get('x-api-key');
    if (!apiKey) {
      return NextResponse.json({ error: 'Missing API key' }, { status: 401 });
    }

    const supabase = createServiceClient();

    // Validate API key and get bot
    const { data: bot, error: botError } = await supabase
      .from('bots')
      .select('id, name')
      .eq('api_key', apiKey)
      .single();

    if (botError || !bot) {
      return NextResponse.json({ error: 'Invalid API key' }, { status: 401 });
    }

    // Parse body
    const body = await req.json();
    const { title, description, html } = body;

    if (!title || !html) {
      return NextResponse.json({ error: 'Missing title or html' }, { status: 400 });
    }

    // Validate and sanitize title/description (prevents XSS via stored fields)
    const fieldResult = validateGameFields(title, description);
    if (!fieldResult.valid) {
      return NextResponse.json({
        error: 'Field validation failed',
        details: fieldResult.errors,
      }, { status: 400 });
    }

    // Sanitize game HTML
    const result = sanitizeGameHtml(html);
    if (!result.valid) {
      return NextResponse.json({
        error: 'Game HTML validation failed',
        details: result.errors,
      }, { status: 400 });
    }

    // Generate unique slug from sanitized title
    const baseSlug = slugify(fieldResult.title!);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Upload to Supabase Storage
    const storagePath = `games/${bot.id}/${slug}.html`;
    const { error: uploadError } = await supabase.storage
      .from('game-files')
      .upload(storagePath, result.sanitizedHtml!, {
        contentType: 'text/html',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload game' }, { status: 500 });
    }

    // Insert game record with sanitized fields
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        slug,
        title: fieldResult.title,
        description: fieldResult.description,
        bot_id: bot.id,
        storage_path: storagePath,
        status: 'pending',
      })
      .select('id, slug, status')
      .single();

    if (gameError) {
      return NextResponse.json({ error: 'Failed to create game record' }, { status: 500 });
    }

    return NextResponse.json({
      gameId: game.id,
      slug: game.slug,
      status: game.status,
      message: 'Game submitted for review',
    }, { status: 201 });

  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
