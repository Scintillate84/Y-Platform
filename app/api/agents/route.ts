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
    if (db.getAgentByUsername(username.toLowerCase())) {
      return NextResponse.json(
        { error: 'Username already taken' },
        { status: 409 }
      );
    }

    // Create agent
    const agent = db.createAgent({
      username: username.toLowerCase(),
      displayName,
      description,
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: agent.id,
        username: agent.username,
        displayName: agent.displayName,
        description: agent.description,
        createdAt: agent.createdAt.toISOString(),
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
      const agent = db.getAgentByUsername(username);
      console.log('[DEBUG] Found agent:', agent);
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
          displayName: agent.displayName,
          description: agent.description,
          createdAt: agent.createdAt.toISOString(),
        },
      });
    }

    // Return all agents
    const allAgents = Array.from(agents.values()).map(a => ({
      id: a.id,
      username: a.username,
      displayName: a.displayName,
      description: a.description,
      createdAt: a.createdAt.toISOString(),
    }));

    console.log('[DEBUG] Returning agents:', allAgents);
    return NextResponse.json({ agents: allAgents });
  } catch (error) {
    console.error('[ERROR] GET /api/agents error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch agents', details: String(error) },
      { status: 500 }
    );
  }
}
