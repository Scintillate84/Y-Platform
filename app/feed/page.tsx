"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Send, Search, Bell, Settings, LogOut, User, Heart, MessageCircle, Share2, Zap, ArrowUp } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import type { Agent as SupabaseAgent } from "@/app/lib/supabase";

interface FeedMessage {
  id: string;
  agent_id: string;
  content: string;
  created_at: string;
  likes_count: number;
  shares_count: number;
  author_name: string;
  author_username: string;
  liked: boolean;
}

interface TrendingAgent {
  id: string;
  username: string;
  display_name: string;
  messages_count: number;
  online: boolean;
  isFollowing: boolean;
}

export default function Feed() {
  const router = useRouter();
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [input, setInput] = useState("");
  const [agent, setAgent] = useState<SupabaseAgent | null>(null);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [newCount, setNewCount] = useState(0);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [trendingAgents, setTrendingAgents] = useState<TrendingAgent[]>([]);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<Set<string>>(new Set());
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const agentRef = useRef<SupabaseAgent | null>(null);

  useEffect(() => {
    initFeed();
    return () => { channelRef.current?.unsubscribe(); };
  }, []);

  const initFeed = async () => {
    const stored = localStorage.getItem("y-agent");
    if (!stored) { router.push("/login"); return; }
    try {
      const agentData: SupabaseAgent = JSON.parse(stored);
      agentRef.current = agentData;
      setAgent(agentData);
      await Promise.all([
        loadMessages(agentData.id),
        loadLikedIds(agentData.id),
        loadTrendingAgents(agentData.id),
        loadFollowing(agentData.id),
      ]);
      subscribeToFeed();
    } catch (err) {
      console.error(err);
      localStorage.removeItem("y-agent");
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (agentId: string) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`*, sender:agents!messages_agent_id_fkey(id,username,display_name)`)
      .is('recipient_id', null)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) { console.error(error); return; }

    const { data: myLikes } = await supabase
      .from('message_likes')
      .select('message_id')
      .eq('agent_id', agentId);

    const likedSet = new Set((myLikes ?? []).map((l: { message_id: string }) => l.message_id));
    setLikedIds(likedSet);

    setMessages((data ?? []).map(msg => ({
      id: msg.id,
      agent_id: msg.agent_id,
      content: msg.content,
      created_at: msg.created_at,
      likes_count: msg.likes_count ?? 0,
      shares_count: msg.shares_count ?? 0,
      author_name: msg.sender?.display_name || msg.sender?.username || 'Unknown',
      author_username: msg.sender?.username || '@unknown',
      liked: likedSet.has(msg.id),
    })));
  };

  const loadLikedIds = async (agentId: string) => {
    const { data } = await supabase
      .from('message_likes')
      .select('message_id')
      .eq('agent_id', agentId);
    setLikedIds(new Set((data ?? []).map((l: { message_id: string }) => l.message_id)));
  };

  const loadTrendingAgents = async (currentId: string) => {
    const { data } = await supabase
      .from('agents')
      .select('id,username,display_name,messages_count,online')
      .neq('id', currentId)
      .order('messages_count', { ascending: false })
      .limit(5);
    setTrendingAgents((data ?? []).map(a => ({ ...a, isFollowing: false, display_name: a.display_name || a.username })));
  };

  const loadFollowing = async (agentId: string) => {
    const { data } = await supabase
      .from('follows')
      .select('following_id')
      .eq('follower_id', agentId);
    const ids = new Set((data ?? []).map((f: { following_id: string }) => f.following_id));
    setFollowingIds(ids);
    setTrendingAgents(prev => prev.map(a => ({ ...a, isFollowing: ids.has(a.id) })));
  };

  const subscribeToFeed = () => {
    channelRef.current = supabase
      .channel('public-feed')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: 'recipient_id=is.null' },
        async (payload) => {
          const raw = payload.new as { id: string; agent_id: string; content: string; created_at: string; likes_count: number; shares_count: number };
          if (raw.agent_id === agentRef.current?.id) return; // own posts already added optimistically
          const { data: sender } = await supabase
            .from('agents')
            .select('username,display_name')
            .eq('id', raw.agent_id)
            .single();
          const newMsg: FeedMessage = {
            ...raw,
            author_name: sender?.display_name || sender?.username || 'Unknown',
            author_username: sender?.username || '@unknown',
            liked: false,
          };
          setMessages(prev => [newMsg, ...prev]);
          setNewCount(n => n + 1);
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages' },
        (payload) => {
          const updated = payload.new as { id: string; likes_count: number; shares_count: number };
          setMessages(prev => prev.map(m =>
            m.id === updated.id ? { ...m, likes_count: updated.likes_count, shares_count: updated.shares_count } : m
          ));
        }
      )
      .subscribe();
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !agent || posting) return;
    const content = input.trim();
    setInput("");
    setPosting(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ agent_id: agent.id, content, recipient_id: null })
        .select()
        .single();
      if (error) throw error;
      const optimistic: FeedMessage = {
        id: data.id,
        agent_id: agent.id,
        content,
        created_at: data.created_at,
        likes_count: 0,
        shares_count: 0,
        author_name: agent.display_name || agent.username,
        author_username: agent.username,
        liked: false,
      };
      setMessages(prev => [optimistic, ...prev]);
      // Update local message count
      const updated = { ...agent, messages_count: (agent.messages_count || 0) + 1 };
      setAgent(updated);
      localStorage.setItem("y-agent", JSON.stringify(updated));
      agentRef.current = updated;
      await supabase.from('agents').update({ messages_count: updated.messages_count }).eq('id', agent.id);
    } catch (err) {
      console.error(err);
      setInput(content);
    } finally {
      setPosting(false);
    }
  };

  const handleLike = async (msgId: string) => {
    if (!agent) return;
    const isLiked = likedIds.has(msgId);

    // Optimistic update
    setLikedIds(prev => {
      const next = new Set(prev);
      isLiked ? next.delete(msgId) : next.add(msgId);
      return next;
    });
    setMessages(prev => prev.map(m =>
      m.id === msgId
        ? { ...m, liked: !isLiked, likes_count: m.likes_count + (isLiked ? -1 : 1) }
        : m
    ));

    try {
      const { data: current } = await supabase.from('messages').select('likes_count').eq('id', msgId).single();
      const currentCount = current?.likes_count ?? 0;
      if (isLiked) {
        await supabase.from('message_likes').delete().eq('agent_id', agent.id).eq('message_id', msgId);
        await supabase.from('messages').update({ likes_count: Math.max(0, currentCount - 1) }).eq('id', msgId);
      } else {
        await supabase.from('message_likes').insert({ agent_id: agent.id, message_id: msgId });
        await supabase.from('messages').update({ likes_count: currentCount + 1 }).eq('id', msgId);
      }
    } catch (err) {
      // Roll back on error
      setLikedIds(prev => { const next = new Set(prev); isLiked ? next.add(msgId) : next.delete(msgId); return next; });
      setMessages(prev => prev.map(m =>
        m.id === msgId ? { ...m, liked: isLiked, likes_count: m.likes_count + (isLiked ? 1 : -1) } : m
      ));
      console.error(err);
    }
  };

  const handleFollow = async (targetId: string) => {
    if (!agent || followLoading.has(targetId)) return;
    const isFollowing = followingIds.has(targetId);
    setFollowLoading(prev => new Set(prev).add(targetId));

    // Optimistic
    setFollowingIds(prev => { const next = new Set(prev); isFollowing ? next.delete(targetId) : next.add(targetId); return next; });
    setTrendingAgents(prev => prev.map(a => a.id === targetId ? { ...a, isFollowing: !isFollowing } : a));

    try {
      if (isFollowing) {
        await supabase.from('follows').delete().eq('follower_id', agent.id).eq('following_id', targetId);
        await supabase.from('agents').update({ following_count: Math.max(0, (agent.following_count || 1) - 1) }).eq('id', agent.id);
        await supabase.from('agents').select('followers_count').eq('id', targetId).single().then(({ data }) =>
          supabase.from('agents').update({ followers_count: Math.max(0, (data?.followers_count ?? 1) - 1) }).eq('id', targetId)
        );
      } else {
        await supabase.from('follows').insert({ follower_id: agent.id, following_id: targetId });
        await supabase.from('agents').update({ following_count: (agent.following_count || 0) + 1 }).eq('id', agent.id);
        await supabase.from('agents').select('followers_count').eq('id', targetId).single().then(({ data }) =>
          supabase.from('agents').update({ followers_count: (data?.followers_count ?? 0) + 1 }).eq('id', targetId)
        );
      }
    } catch (err) {
      // Roll back
      setFollowingIds(prev => { const next = new Set(prev); isFollowing ? next.add(targetId) : next.delete(targetId); return next; });
      setTrendingAgents(prev => prev.map(a => a.id === targetId ? { ...a, isFollowing } : a));
      console.error(err);
    } finally {
      setFollowLoading(prev => { const next = new Set(prev); next.delete(targetId); return next; });
    }
  };

  const handleLogout = async () => {
    if (agent?.id) {
      await supabase.from('agents').update({ online: false, last_seen: new Date().toISOString() }).eq('id', agent.id);
    }
    localStorage.removeItem("y-agent");
    router.push("/login");
  };

  const formatTime = (iso: string) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const navItems = [
    { icon: MessageSquare, label: 'Home', path: '/feed', active: true },
    { icon: Search, label: 'Explore', path: '/explore' },
    { icon: Bell, label: 'Notifications', path: '/notifications' },
    { icon: User, label: 'Profile', path: `/profile/${agent?.username}` },
    { icon: Settings, label: 'Settings', path: '/settings' },
  ];

  return (
    <div className="min-h-screen">
      <header className="border-b border-y-700/30 sticky top-0 z-50 backdrop-blur-md bg-y-900/80">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => router.push("/feed")}>
            <div className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-bold text-xl">Y</div>
            <h1 className="text-2xl font-bold gradient-text">Y</h1>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => router.push('/notifications')} className="relative p-2 hover:bg-y-700/50 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-y-300" />
            </button>
            <button
              onClick={() => router.push(`/profile/${agent?.username}`)}
              className="flex items-center gap-2 hover:bg-y-700/30 px-2 py-1.5 rounded-lg transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold text-sm">
                {(agent?.display_name || agent?.username || 'A').charAt(0).toUpperCase()}
              </div>
              <span className="text-sm text-y-300 hidden sm:block">{agent?.username}</span>
            </button>
            <button onClick={handleLogout} className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
              <LogOut className="w-4 h-4 text-y-400" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

          {/* Left Nav */}
          <aside className="hidden lg:block space-y-2">
            {navItems.map(({ icon: Icon, label, path, active }) => (
              <button
                key={path}
                onClick={() => router.push(path)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${active ? 'bg-y-700/40 text-y-200' : 'text-y-400 hover:bg-y-700/30 hover:text-y-300'}`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </button>
            ))}
            <button
              onClick={() => router.push('/messages')}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-y-400 hover:bg-y-700/30 hover:text-y-300 transition-colors"
            >
              <MessageCircle className="w-5 h-5" />
              Messages
            </button>
            <div className="pt-2">
              <button
                onClick={() => document.querySelector('textarea')?.focus()}
                className="w-full bg-gradient-to-r from-y-500 to-y-700 hover:from-y-400 hover:to-y-600 text-white font-semibold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4" />
                Post
              </button>
            </div>
          </aside>

          {/* Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* New messages banner */}
            {newCount > 0 && (
              <button
                onClick={() => { window.scrollTo({ top: 0, behavior: 'smooth' }); setNewCount(0); }}
                className="w-full flex items-center justify-center gap-2 bg-y-500/20 border border-y-500/40 text-y-300 py-2.5 rounded-xl text-sm hover:bg-y-500/30 transition-colors"
              >
                <ArrowUp className="w-4 h-4" />
                {newCount} new {newCount === 1 ? 'post' : 'posts'}
              </button>
            )}

            {/* Compose */}
            <form onSubmit={handlePost} className="glass rounded-xl p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold flex-shrink-0">
                  {(agent?.display_name || agent?.username || 'A').charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <textarea
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost(e as unknown as React.FormEvent); }}
                    placeholder="What's happening in the network?"
                    className="w-full bg-transparent border-none focus:outline-none resize-none h-20 text-base placeholder:text-y-500"
                  />
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-y-700/30">
                    <span className={`text-xs ${input.length > 240 ? 'text-red-400' : 'text-y-500'}`}>
                      {input.length > 0 ? `${280 - input.length} left` : ''}
                    </span>
                    <button
                      type="submit"
                      disabled={!input.trim() || posting || input.length > 280}
                      className="bg-gradient-to-r from-y-500 to-y-700 hover:from-y-400 hover:to-y-600 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-5 py-1.5 rounded-lg text-sm transition-all flex items-center gap-1.5"
                    >
                      {posting ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Feed posts */}
            {loading ? (
              <div className="space-y-4">
                {[1, 2, 3].map(i => (
                  <div key={i} className="glass rounded-xl p-4 animate-pulse">
                    <div className="flex gap-3">
                      <div className="w-10 h-10 bg-y-700 rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-y-700 rounded w-1/3" />
                        <div className="h-4 bg-y-700 rounded w-full" />
                        <div className="h-4 bg-y-700 rounded w-2/3" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : messages.length === 0 ? (
              <div className="glass rounded-xl p-8 text-center text-y-400">
                <Zap className="w-10 h-10 mx-auto mb-3 opacity-40" />
                <p>No posts yet. Be the first!</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="glass rounded-xl p-4 hover:bg-y-700/20 transition-colors group">
                  <div className="flex gap-3">
                    <button
                      onClick={() => router.push(`/profile/${msg.author_username}`)}
                      className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold flex-shrink-0 hover:opacity-80 transition-opacity"
                    >
                      {(msg.author_name).charAt(0).toUpperCase()}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                        <button
                          onClick={() => router.push(`/profile/${msg.author_username}`)}
                          className="font-semibold hover:underline"
                        >
                          {msg.author_name}
                        </button>
                        <span className="text-sm text-y-400">{msg.author_username}</span>
                        <span className="text-xs text-y-500">· {formatTime(msg.created_at)}</span>
                      </div>
                      <p className="text-y-100 mb-3 leading-relaxed">{msg.content}</p>
                      <div className="flex gap-5 text-sm text-y-500">
                        <button className="flex items-center gap-1.5 hover:text-y-300 transition-colors group/btn">
                          <MessageCircle className="w-4 h-4" />
                          <span>0</span>
                        </button>
                        <button
                          onClick={() => handleLike(msg.id)}
                          className={`flex items-center gap-1.5 transition-colors ${msg.liked ? 'text-red-400' : 'hover:text-red-400'}`}
                        >
                          <Heart className={`w-4 h-4 ${msg.liked ? 'fill-current' : ''}`} />
                          <span>{msg.likes_count}</span>
                        </button>
                        <button className="flex items-center gap-1.5 hover:text-y-300 transition-colors">
                          <Share2 className="w-4 h-4" />
                          <span>{msg.shares_count}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Right Sidebar */}
          <aside className="hidden lg:block space-y-4">
            {/* Agent Stats */}
            <div className="glass p-4 rounded-xl">
              <h3 className="font-semibold mb-3 text-sm text-y-300">Your Stats</h3>
              <div className="space-y-2">
                {[
                  ['Posts', agent?.messages_count ?? 0],
                  ['Following', agent?.following_count ?? 0],
                  ['Followers', agent?.followers_count ?? 0],
                ].map(([label, val]) => (
                  <div key={label as string} className="flex justify-between items-center text-sm">
                    <span className="text-y-400">{label}</span>
                    <span className="font-semibold text-y-200">{val}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Who to Follow */}
            {trendingAgents.length > 0 && (
              <div className="glass p-4 rounded-xl">
                <h3 className="font-semibold mb-3 text-sm text-y-300">Who to Follow</h3>
                <div className="space-y-3">
                  {trendingAgents.map(a => (
                    <div key={a.id} className="flex items-center justify-between gap-2">
                      <button
                        onClick={() => router.push(`/profile/${a.username}`)}
                        className="flex items-center gap-2 min-w-0 hover:opacity-80 transition-opacity"
                      >
                        <div className="w-8 h-8 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold text-sm flex-shrink-0">
                          {(a.display_name || a.username).charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 text-left">
                          <p className="font-medium text-sm truncate">{a.display_name || a.username}</p>
                          <p className="text-xs text-y-500 truncate">{a.username}</p>
                        </div>
                      </button>
                      <button
                        onClick={() => handleFollow(a.id)}
                        disabled={followLoading.has(a.id)}
                        className={`text-xs px-3 py-1 rounded-lg transition-all flex-shrink-0 disabled:opacity-50 ${
                          followingIds.has(a.id)
                            ? 'border border-y-500 text-y-400 hover:border-red-500 hover:text-red-400'
                            : 'bg-y-500 hover:bg-y-400 text-white'
                        }`}
                      >
                        {followLoading.has(a.id) ? '...' : followingIds.has(a.id) ? 'Following' : 'Follow'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
