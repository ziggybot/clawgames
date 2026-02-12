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

// Rate limit: track recent submissions by IP
const recentSubmissions = new Map<string, number>();

export async function POST(req: NextRequest) {
  try {
    // Basic rate limiting (1 submission per 60 seconds per IP)
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
    const now = Date.now();
    const lastSubmit = recentSubmissions.get(ip) || 0;
    if (now - lastSubmit < 60_000) {
      return NextResponse.json({ error: 'Too fast. Wait a minute between submissions.' }, { status: 429 });
    }
    recentSubmissions.set(ip, now);

    // Clean old entries every 100 submissions
    if (recentSubmissions.size > 100) {
      for (const [key, time] of recentSubmissions) {
        if (now - time > 300_000) recentSubmissions.delete(key);
      }
    }

    const supabase = createServiceClient();

    // Parse body
    const body = await req.json();
    const { title, creator, description, html } = body;

    if (!title || !html) {
      return NextResponse.json({ error: 'Missing title or HTML game code.' }, { status: 400 });
    }

    // Validate creator name
    const creatorName = (creator || 'Anonymous').trim().slice(0, 50).replace(/<[^>]*>/g, '');

    // Validate and sanitize title/description
    const fieldResult = validateGameFields(title, description);
    if (!fieldResult.valid) {
      return NextResponse.json({
        error: 'Validation failed',
        details: fieldResult.errors,
      }, { status: 400 });
    }

    // Sanitize game HTML
    const result = sanitizeGameHtml(html);
    if (!result.valid) {
      return NextResponse.json({
        error: 'Game HTML failed security check',
        details: result.errors,
      }, { status: 400 });
    }

    // Get or create community bot for this creator
    let botId: string;

    // Check if a community bot exists for this creator
    const communityBotName = `community:${creatorName.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;

    const { data: existingBot } = await supabase
      .from('bots')
      .select('id')
      .eq('name', communityBotName)
      .single();

    if (existingBot) {
      botId = existingBot.id;
    } else {
      // Create a community bot entry for this human creator
      const { data: newBot, error: botError } = await supabase
        .from('bots')
        .insert({
          name: communityBotName,
          api_key: `community_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`,
          bio: `Community creator: ${creatorName}`,
          framework: 'human',
        })
        .select('id')
        .single();

      if (botError || !newBot) {
        return NextResponse.json({ error: 'Failed to register creator.' }, { status: 500 });
      }
      botId = newBot.id;
    }

    // Generate unique slug
    const baseSlug = slugify(fieldResult.title!);
    const slug = `${baseSlug}-${Date.now().toString(36)}`;

    // Upload to Supabase Storage
    const storagePath = `games/${botId}/${slug}.html`;
    const { error: uploadError } = await supabase.storage
      .from('game-files')
      .upload(storagePath, result.sanitizedHtml!, {
        contentType: 'text/html',
        upsert: false,
      });

    if (uploadError) {
      return NextResponse.json({ error: 'Failed to upload game file.' }, { status: 500 });
    }

    // Insert game record
    const { data: game, error: gameError } = await supabase
      .from('games')
      .insert({
        slug,
        title: fieldResult.title,
        description: fieldResult.description,
        bot_id: botId,
        storage_path: storagePath,
        status: 'pending',
      })
      .select('id, slug, status')
      .single();

    if (gameError) {
      return NextResponse.json({ error: 'Failed to save game.' }, { status: 500 });
    }

    return NextResponse.json({
      gameId: game.id,
      slug: game.slug,
      status: game.status,
      message: 'Game submitted for review. It will appear once approved.',
    }, { status: 201 });

  } catch {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
