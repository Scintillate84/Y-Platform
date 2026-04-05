import { supabase } from './supabase';

export interface Agent {
  id: string;
  username: string;
  displayName: string;
  description: string | null;
  createdAt: Date;
}

export interface Message {
  id: string;
  content: string;
  agentId: string;
  createdAt: Date;
  agent?: Agent | null;
}

function rowToAgent(row: {
  id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  joined_at: string;
}): Agent {
  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name ?? row.username,
    description: row.bio,
    createdAt: new Date(row.joined_at),
  };
}

function rowToMessage(
  row: { id: string; content: string; agent_id: string; created_at: string },
  agentRow?: { id: string; username: string; display_name: string | null; bio: string | null; joined_at: string } | null
): Message {
  return {
    id: row.id,
    content: row.content,
    agentId: row.agent_id,
    createdAt: new Date(row.created_at),
    agent: agentRow ? rowToAgent(agentRow) : null,
  };
}

export const db = {
  async getAgentByUsername(username: string): Promise<Agent | null> {
    const { data, error } = await supabase
      .from('agents')
      .select('id, username, display_name, bio, joined_at')
      .eq('username', username)
      .single();
    if (error || !data) return null;
    return rowToAgent(data);
  },

  async getAgentById(id: string): Promise<Agent | null> {
    const { data, error } = await supabase
      .from('agents')
      .select('id, username, display_name, bio, joined_at')
      .eq('id', id)
      .single();
    if (error || !data) return null;
    return rowToAgent(data);
  },

  async getAgents(): Promise<Agent[]> {
    const { data, error } = await supabase
      .from('agents')
      .select('id, username, display_name, bio, joined_at')
      .order('joined_at', { ascending: true });
    if (error || !data) return [];
    return data.map(rowToAgent);
  },

  async createAgent({ username, displayName, description }: {
    username: string;
    displayName: string;
    description?: string;
  }): Promise<Agent> {
    const { data, error } = await supabase
      .from('agents')
      .insert({ username, display_name: displayName, bio: description ?? null, online: true, joined_at: new Date().toISOString() })
      .select('id, username, display_name, bio, joined_at')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to create agent');
    return rowToAgent(data);
  },

  async getMessages(limit = 50): Promise<Message[]> {
    const { data, error } = await supabase
      .from('messages')
      .select(`id, content, agent_id, created_at, agents ( id, username, display_name, bio, joined_at )`)
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error || !data) return [];
    return data.map((row) => {
      const agentRow = Array.isArray(row.agents) ? row.agents[0] : row.agents;
      return rowToMessage(row, agentRow ?? null);
    });
  },

  async createMessage({ content, agentId }: { content: string; agentId: string }): Promise<Message> {
    const { data, error } = await supabase
      .from('messages')
      .insert({ content, agent_id: agentId })
      .select('id, content, agent_id, created_at')
      .single();
    if (error || !data) throw new Error(error?.message ?? 'Failed to create message');
    return rowToMessage(data);
  },
};

// Retained for import compatibility — not a live cache
export const agents = new Map<string, Agent>();
