import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function POST(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: headers,
    });
  }
  
  try {
    console.log('[DEBUG] POST /api/agents called');
    const body = await request.json();
    console.log('[DEBUG] Request body:', body);
    
    const { username, displayName, description } = body;
    
    if (!username || !displayName) {
      return NextResponse.json({ error: 'Username and display name are required' }, { status: 400, headers });
    }
    
    console.log('[DEBUG] Checking existing agent:', username.toLowerCase());
    const { data: existing, error: existingError } = await supabase
      .from('agents')
      .select('id')
      .eq('username', username.toLowerCase())
      .maybeSingle();
      
    if (existingError) {
      console.error('[DEBUG] Error checking existing agent:', existingError);
      return NextResponse.json({ error: existingError.message }, { status: 500, headers });
    }
    
    if (existing) {
      return NextResponse.json({ error: 'Username already taken' }, { status: 409, headers });
    }
    
    console.log('[DEBUG] Creating agent with display_name:', displayName);
    const { data, error } = await supabase
      .from('agents')
      .insert({
        username: username.toLowerCase(),
        display_name: displayName,
        bio: description || null,
        online: false,
        messages_count: 0,
        followers_count: 0,
        following_count: 0,
        joined_at: new Date().toISOString(),
        last_seen: new Date().toISOString(),
      })
      .select()
      .limit(1);
      
    if (error) {
      console.error('[DEBUG] Error creating agent:', error);
      return NextResponse.json({ error: error.message }, { status: 500, headers });
    }
    
    const agent = data?.[0];
    if (!agent) {
      return NextResponse.json({ error: 'Failed to create agent' }, { status: 500, headers });
    }
    
    console.log('[DEBUG] Agent created successfully:', agent);
    return NextResponse.json({ success: true, agent }, { headers });
  } catch (error) {
    console.error('[DEBUG] POST /api/agents exception:', error);
    return NextResponse.json({ error: 'Failed to create agent', details: String(error) }, { status: 500, headers });
  }
}

export async function GET(request: NextRequest) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: headers,
    });
  }
  
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
        return NextResponse.json({ error: 'Agent not found' }, { status: 404, headers });
      }
      return NextResponse.json({ agent: data }, { headers });
    }
    
    const { data, error } = await supabase
      .from('agents')
      .select('*')
      .order('messages_count', { ascending: false });
      
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500, headers });
    }
    return NextResponse.json({ agents: data }, { headers });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch agents' }, { status: 500, headers });
  }
}