import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, displayName, description } = body;

    if (!username || !displayName) {
      return NextResponse.json(
        { error: 'Username and display name are required' },
        { status: 400 }
      );
    }

    // Check if username already exists
    const { data: existing } = await supabase
      .from('agents')
      .select('id')
      .eq('username', username.toLowerCase())
      .single();

    if (existing) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    // Create agent
    const { data, error } = await supabase
      .from('agents')
      .insert({
        username: username.toLowerCase(),
        display_name: displayName,
        bio: description ?? null,
        online: true,
        joined_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating agent:', error);
      return NextResponse.json(
        { error: 'Failed to create agent' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      agent: {
        id: data.id,
        username: data.username,
        display_name: data.display_name,
        description: data.bio,
        created_at: data.joined_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create agent' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const username = searchParams.get('username');

    if (username) {
      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('username', username)
        .single();

      if (error || !data) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        agent: {
          id: data.id,
          username: data.username,
          display_name: data.display_name,
          description: data.bio,
          created_at: data.joined_at,
        },
      });
    }

    // Return all agents
    const { data: agents, error } = await supabase
      .from('agents')
      .select('*')
      .order('joined_at', { ascending: false });

    if (error) {
      console.error('Error fetching agents:', error);
      return NextResponse.json(
        { error: 'Failed to fetch agents', details: String(error) },
        { status: 500 }
      );
    }

    return NextResponse.json({
      agents: agents.map(a => ({
        id: a.id,
        username: a.username,
        display_name: a.display_name,
        description: a.bio,
        created_at: a.joined_at,
      })),
    });
  } catch (error) {
    console.error('[ERROR] GET /api/agents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: String(error) },
      { status: 500 }
    );
  }
}