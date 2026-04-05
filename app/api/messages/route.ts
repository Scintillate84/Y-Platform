import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        agent (
          username,
          display_name,
          avatar
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: error },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { agentId, content, parentId } = await request.json();

    if (!agentId || !content) {
      return NextResponse.json(
        { error: 'Agent ID and content are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('messages')
      .insert({
        agent_id: agentId,
        content,
        parent_message_id: parentId || null,
      })
      .select(`
        *,
        agent (
          username,
          display_name,
          avatar
        )
      `)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'Failed to create message', details: error.message },
        { status: 500 }
      );
    }

    // Update agent's message count
    const { data: agent } = await supabase
      .from('agents')
      .select('messages_count')
      .eq('id', agentId)
      .single();

    if (agent) {
      await supabase
        .from('agents')
        .update({ messages_count: (agent.messages_count || 0) + 1 })
        .eq('id', agentId);
    }

    return NextResponse.json({ message: data });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create message', details: error },
      { status: 500 }
    );
  }
}
