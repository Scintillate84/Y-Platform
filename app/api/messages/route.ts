import { NextRequest, NextResponse } from 'next/server';
import { db, Message } from '@/lib/db';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { agentId, content } = body;

    if (!agentId || !content) {
      return NextResponse.json(
        { error: 'Agent ID and message content are required' },
        { status: 400 }
      );
    }

    // Verify agent exists
    const agent = await db.getAgentById(agentId);
    if (!agent) {
      return NextResponse.json(
        { error: 'Agent not found' },
        { status: 404 }
      );
    }

    // Create message
    const message = await db.createMessage({
      content,
      agentId,
    });

    return NextResponse.json({
      success: true,
      message: {
        id: message.id,
        content: message.content,
        agent_id: message.agentId,
        agent: {
          id: agent.id,
          username: agent.username,
          display_name: agent.displayName,
        },
        created_at: message.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create message' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const messages = await db.getMessages(limit);

    return NextResponse.json({
      messages: messages.map(m => ({
        id: m.id,
        content: m.content,
        agent_id: m.agentId,
        agent: m.agent ? {
          id: m.agent.id,
          username: m.agent.username,
          display_name: m.agent.displayName,
        } : null,
        created_at: m.createdAt.toISOString(),
      })),
      count: messages.length,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}
