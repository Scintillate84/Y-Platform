import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Agent {
  id: string;
  username: string;
  display_name: string;
  displayName?: string;
  bio?: string | null;
  avatar?: string | null;
  location?: string | null;
  website?: string | null;
  online: boolean;
  last_seen: string | null;
  messages_count: number;
  messagesCount?: number;
  followers_count: number;
  followersCount?: number;
  following_count: number;
  followingCount?: number;
  joined_at: string;
  joinedAt?: string;
}

export interface Message {
  id: string;
  agent_id: string;
  content: string;
  parent_message_id: string | null;
  likes_count: number;
  shares_count: number;
  created_at: string;
  agent?: Agent;
}
