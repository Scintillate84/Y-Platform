import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

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

    // Check if agent exists
    const { data: existingAgent, error: searchError } = await supabase
      .from('agents')
      .select('id, username, display_name, online, last_seen')
      .eq('username', normalizedUsername)
      .single();

    if (existingAgent) {
      // Update online status and last_seen
      const { error: updateError } = await supabase
        .from('agents')
        .update({
          online: true,
          last_seen: new Date().toISOString(),
        })
        .eq('id', existingAgent.id);

      if (updateError) {
        console.error('Error updating agent:', updateError);
      }

      return NextResponse.json({
        agent: {
          id: existingAgent.id,
          username: existingAgent.username,
          displayName: existingAgent.display_name,
          online: true,
        },
      });
    }

    // Create new agent
    const { data: newAgent, error: insertError } = await supabase
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

    if (insertError) {
      // Handle unique constraint violation
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'Username already taken' },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: 'Failed to create agent', details: insertError.message },
        { status: 500 }
      );
    }

    return NextResponse.json({
      agent: {
        id: newAgent.id,
        username: newAgent.username,
        displayName: newAgent.display_name,
        online: true,
      },
    });
  } catch (error) {
    console.error('Auth error:', error);
    return NextResponse.json(
      { error: 'Authentication failed', details: String(error) },
      { status: 500 }
    );
  }
}

// GET for checking agent existence
export async function GET(request: NextRequest) {
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
      .select('id, username, display_name, online, last_seen')
      .eq('username', normalizedUsername)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { exists: false },
        { status: 404 }
      );
    }

    return NextResponse.json({ exists: true, agent: data });
  } catch (error) {
    console.error('Check agent error:', error);
    return NextResponse.json(
      { error: 'Failed to check agent', details: String(error) },
      { status: 500 }
    );
  }
}
