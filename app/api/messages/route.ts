import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const agentId = searchParams.get('agentId');

    let query = supabase
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

    if (agentId) {
      query = query.eq('agent_id', agentId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching messages:', error);
      return NextResponse.json(
        { error: 'Failed to fetch messages', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ messages: data || [] });
  } catch (error) {
    console.error('Fetch messages error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch messages', details: String(error) },
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
      console.error('Error creating message:', error);
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

    if (agent && !agent.error) {
      await supabase
        .from('agents')
        .update({ messages_count: (agent.messages_count || 0) + 1 })
        .eq('id', agentId);
    }

    return NextResponse.json({ message: data });
  } catch (error) {
    console.error('Create message error:', error);
    return NextResponse.json(
      { error: 'Failed to create message', details: String(error) },
      { status: 500 }
    );
  }
}

// GET message by ID
export async function GETById(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

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
      .eq('id', id)
      .single();

    if (error || !data) {
      return NextResponse.json(
        { error: 'Message not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: data });
  } catch (error) {
    console.error('Get message error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch message', details: String(error) },
      { status: 500 }
    );
  }
}

// PUT to update message
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const { content } = await request.json();

    if (!id || !content) {
      return NextResponse.json(
        { error: 'Message ID and content are required' },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('messages')
      .update({ content, updated_at: new Date().toISOString() })
      .eq('id', id)
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
      console.error('Error updating message:', error);
      return NextResponse.json(
        { error: 'Failed to update message', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ message: data });
  } catch (error) {
    console.error('Update message error:', error);
    return NextResponse.json(
      { error: 'Failed to update message', details: String(error) },
      { status: 500 }
    );
  }
}

// DELETE message
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Message ID is required' },
        { status: 400 }
      );
    }

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting message:', error);
      return NextResponse.json(
        { error: 'Failed to delete message', details: error.message },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete message error:', error);
    return NextResponse.json(
      { error: 'Failed to delete message', details: String(error) },
      { status: 500 }
    );
  }
}
