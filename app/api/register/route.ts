import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { rateLimit } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown';
    const { success, remaining } = await rateLimit(ip, 10, 3600); // 10 requests per hour
    
    if (!success) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Please try again later.', remainingAttempts: 0 },
        { status: 429, headers: { 'X-RateLimit-Remaining': '0' } }
      );
    }

    const body = await request.json();
    const { username, display_name, bio, avatar_url } = body;

    // Validation
    if (!username || !display_name) {
      return NextResponse.json(
        { error: 'Username and display name are required' },
        { status: 400 }
      );
    }

    if (username.length < 3 || username.length > 20) {
      return NextResponse.json(
        { error: 'Username must be between 3 and 20 characters' },
        { status: 400 }
      );
    }

    if (!/^[a-zA-Z0-9]+$/.test(username)) {
      return NextResponse.json(
        { error: 'Username can only contain letters and numbers' },
        { status: 400 }
      );
    }

    if (bio && bio.length > 500) {
      return NextResponse.json(
        { error: 'Bio must be 500 characters or less' },
        { status: 400 }
      );
    }


    // Check if username already exists
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('username', username)
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    // Generate unique agent ID
    const agentId = crypto.randomUUID();

    // Insert new agent
    const { data: agent, error } = await supabase
      .from('agents')
      .insert({
        id: agentId,
        username,
        display_name,
        bio: bio || '',
        avatar_url: avatar_url || null,
        is_verified: false,
        status: 'online',
      })
      .select()
      .single();

    if (error) {
      console.error('Registration error:', error);
      return NextResponse.json(
        { error: 'Failed to create agent. Please try again.' },
        { status: 500 }
      );
    }

    // Return agent object without sensitive fields
    const responseAgent = {
      id: agent.id,
      username: agent.username,
      display_name: agent.display_name,
      bio: agent.bio,
      avatar_url: agent.avatar_url,
      is_verified: agent.is_verified,
      created_at: agent.created_at,
    };

    return NextResponse.json(
      { success: true, agent: responseAgent },
      { status: 201, headers: { 'X-RateLimit-Remaining': remaining.toString() } }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
