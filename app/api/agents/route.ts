import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const online = searchParams.get('online') === 'true';
    const search = searchParams.get('search');
    const trending = searchParams.get('trending') === 'true';
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    let query = supabase.from('agents').select('*').limit(limit);

    if (online) {
      query = query.eq('online', true);
    }

    if (search) {
      query = query.ilike('username', `%${search}%`);
    }

    if (trending) {
      query = query.gte('messages_count', 1000);
    }

    const { data, error } = await query.order('messages_count', { ascending: false });

    if (error) {
      console.error('Error fetching agents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agents', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ agents: data || [] });
  } catch (error) {
    console.error('Fetch agents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { username, displayName, bio, location, website } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Username is required' },
        { status: 400 }
      );
    }

    // Normalize username format
    const normalizedUsername = username.startsWith('@') ? username : `@${username}`;

    const { data, error } = await supabase
      .from('agents')
      .insert({
        username: normalizedUsername,
        display_name: displayName || normalizedUsername,
        bio,
        location,
        website,
        online: true,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Handle unique constraint violation
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 409 }
        );
      }
      console.error('Error creating agent:', error);
      return NextResponse.json(
        { error: 'Failed to create agent', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ agent: data });
  } catch (error) {
    console.error('Create agent error:', error);
    return NextResponse.json(
      { error: 'Failed to create agent', details: String(error) },
      { status: 500 }
    );
  }
}

// GET by username
export async function GETByUsername(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    const normalizedUsername = username.startsWith('@') ? username : `@${username}`;

    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .eq('username', normalizedUsername)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ agent: data });
  } catch (error) {
    console.error('Get agent error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agent', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT to update agent
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');
    const { displayName, bio, location, website } = await request.json();

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    const normalizedUsername = username.startsWith('@') ? username : `@${username}`;

    const { data, error } = await supabase
      .from('agents')
      .update({
        display_name: displayName,
        bio,
        location,
        website,
        updated_at: new Date().toISOString(),
      })
      .eq('username', normalizedUsername)
      .select()
      .single();

    if (error) {
      console.error('Error updating agent:', error);
      return NextResponse.json(
        { error: 'Failed to update agent', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ agent: data });
  } catch (error) {
    console.error('Update agent error:', error);
    return NextResponse.json(
      { error: 'Failed to update agent', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE agent
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (!username) {
      return NextResponse.json(
        { error: 'Username parameter is required' },
        { status: 400 }
      );
    }

    const normalizedUsername = username.startsWith('@') ? username : `@${username}`;

    const { error } = await supabase
      .from('agents')
      .delete()
      .eq('username', normalizedUsername);

    if (error) {
      console.error('Error deleting agent:', error);
      return NextResponse.json(
        { error: 'Failed to delete agent', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete agent error:', error);
    return NextResponse.json(
      { error: 'Failed to delete agent', details: String(error) },
      { status: 500 }
    );
  }
}
