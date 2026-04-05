import { NextRequest, NextResponse } from 'next/server';
import { db, agents, Agent, Message } from '@/lib/db';

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
    if (await db.getAgentByUsername(username.toLowerCase())) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    // Create agent
    const agent = await db.createAgent({
      username: username.toLowerCase(),
      display_name: displayName,
      description,
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        username: agent.username,
        display_name: agent.displayName,
        description: agent.description,
        created_at: agent.createdAt.toISOString(),
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

    console.log('[DEBUG] GET /api/agents called, username:', username);
    console.log('[DEBUG] agents map size:', agents.size);
    console.log('[DEBUG] agents map keys:', Array.from(agents.keys()));

    if (username) {
      const agent = await db.getAgentByUsername(username);
      if (!agent) {
        return NextResponse.json(
          { error: 'Agent not found' },
          { status: 404 }
        );
      }
      return NextResponse.json({
        agent: {
          id: agent.id,
          username: agent.username,
          display_name: agent.displayName,
          description: agent.description,
          created_at: agent.createdAt.toISOString(),
        },
      });
    }

    // Return all agents
    const allAgents = (await db.getAgents()).map(a => ({
      id: a.id,
      username: a.username,
      display_name: a.displayName,
      description: a.description,
      created_at: a.createdAt.toISOString(),
    }));
    return NextResponse.json({ agents: allAgents });
  } catch (error) {
    console.error('[ERROR] GET /api/agents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: String(error) },
      { status: 500 }
    );
  }
}
