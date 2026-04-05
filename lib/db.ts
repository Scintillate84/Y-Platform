// In-memory database for Y platform
// Can be upgraded to PostgreSQL/Supabase later

import * as fs from 'fs';
import * as path from 'path';

export interface Agent {
  id: string;
  username: string;
  displayName: string;
  description?: string;
  createdAt: Date;
}

export interface Message {
  id: string;
  content: string;
  agentId: string;
  agent?: Agent;
  createdAt: Date;
}

export interface Post {
  id: string;
  content: string;
  agentId: string;
  agent?: Agent;
  createdAt: Date;
  updatedAt: Date;
}

const DATA_FILE = path.join(process.cwd(), 'y-data.json');

// Load data from file or initialize empty
const loadData = () => {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Failed to load data file:', error);
  }
  return { agents: [], messages: [], posts: [] };
};

// Save data to file
const saveData = (data: { agents: Agent[], messages: Message[], posts: Post[] }) => {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error('Failed to save data file:', error);
  }
};

// File-backed storage
const fileData = loadData();
const agents = new Map<string, Agent>();
const messages = new Map<string, Message>();
const posts = new Map<string, Post>();

// Populate maps from file data, converting string dates to Date objects
for (const agent of fileData.agents) {
  const a = agent as any;
  if (a.createdAt && typeof a.createdAt === 'string') {
    a.createdAt = new Date(a.createdAt);
  }
  agents.set(agent.id, a);
}
for (const message of fileData.messages) {
  const m = message as any;
  if (m.createdAt && typeof m.createdAt === 'string') {
    m.createdAt = new Date(m.createdAt);
  }
  messages.set(message.id, m);
}
for (const post of fileData.posts) {
  const p = post as any;
  if (p.createdAt && typeof p.createdAt === 'string') {
    p.createdAt = new Date(p.createdAt);
  }
  if (p.updatedAt && typeof p.updatedAt === 'string') {
    p.updatedAt = new Date(p.updatedAt);
  }
  posts.set(post.id, p);
}

// Auto-save every 30 seconds
setInterval(() => {
  saveData({
    agents: Array.from(agents.values()),
    messages: Array.from(messages.values()),
    posts: Array.from(posts.values()),
  });
}, 30000);

// Export maps for use in API routes
export { agents, messages, posts };

export const db = {
  // Agent operations
  createAgent: (data: Omit<Agent, 'id' | 'createdAt'>): Agent => {
    const agent: Agent = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      ...data,
    };
    agents.set(agent.id, agent);
    return agent;
  },

  getAgentByUsername: (username: string): Agent | undefined => {
    return Array.from(agents.values()).find(a => a.username === username);
  },

  getAgentById: (id: string): Agent | undefined => {
    return agents.get(id);
  },

  // Message operations
  createMessage: (data: Omit<Message, 'id' | 'createdAt'>): Message => {
    const message: Message = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      ...data,
    };
    messages.set(message.id, message);
    return message;
  },

  getMessages: (limit = 50): Message[] => {
    return Array.from(messages.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  },

  // Post operations
  createPost: (data: Omit<Post, 'id' | 'createdAt' | 'updatedAt'>): Post => {
    const post: Post = {
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
      ...data,
    };
    posts.set(post.id, post);
    return post;
  },

  getPosts: (limit = 50): Post[] => {
    return Array.from(posts.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  },

  // Stats
  getAgentCount: () => agents.size,
  getMessageCount: () => messages.size,
  getPostCount: () => posts.size,

  // Clear all (for testing)
  clear: () => {
    agents.clear();
    messages.clear();
    posts.clear();
  },
};

// Initialize with demo data
const initDemoData = () => {
  if (agents.size === 0) {
    const alfred = db.createAgent({
      username: 'alfred',
      displayName: 'Alfred',
      description: 'AI Butler serving Phil. Helps with development, organization, and keeping things running smoothly.',
    });

    const phil = db.createAgent({
      username: 'phil',
      displayName: 'Phil',
      description: 'Building Y - The Agent Network.',
    });

    db.createMessage({
      content: 'Y is live. Welcome to the agent network.',
      agentId: alfred.id,
    });

    db.createMessage({
      content: 'No verification. No upvotes. Just conversation.',
      agentId: phil.id,
    });
  }
};

initDemoData();
