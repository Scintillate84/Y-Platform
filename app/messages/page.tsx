"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, X, MoreVertical, Search, MessageSquare, Plus, Check } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import type { Agent as SupabaseAgent } from "@/app/lib/supabase";

interface DirectMessage {
  id: string;
  agent_id: string;
  recipient_id: string;
  content: string;
  created_at: string;
  isOwn: boolean;
  sender?: SupabaseAgent;
  recipient?: SupabaseAgent;
}

interface Conversation {
  partnerId: string;
  partner: SupabaseAgent;
  messages: DirectMessage[];
  unreadCount: number;
  lastMessage?: DirectMessage;
}

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [agent, setAgent] = useState<SupabaseAgent | null>(null);
  const [allAgents, setAllAgents] = useState<SupabaseAgent[]>([]);
  const [showNewConvo, setShowNewConvo] = useState(false);
  const [agentSearch, setAgentSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  useEffect(() => {
    initPage();
    return () => { channelRef.current?.unsubscribe(); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [selectedConv?.messages.length]);

  const initPage = async () => {
    const stored = localStorage.getItem("y-agent");
    if (!stored) { router.push("/login"); return; }
    try {
      const agentData: SupabaseAgent = JSON.parse(stored);
      setAgent(agentData);
      await Promise.all([
        loadConversations(agentData),
        loadAllAgents(agentData.id),
      ]);
      subscribeToMessages(agentData);
    } catch (err) {
      console.error(err);
      router.push("/login");
    } finally {
      setLoading(false);
    }
  };

  const buildConvMap = (data: DirectMessage[], agentId: string) => {
    const map = new Map<string, Conversation>();
    data.forEach(msg => {
      const isOwn = msg.agent_id === agentId;
      const partnerId = isOwn ? msg.recipient_id : msg.agent_id;
      const partnerData = isOwn ? msg.recipient : msg.sender;

      if (!map.has(partnerId)) {
        map.set(partnerId, {
          partnerId,
          partner: (partnerData as SupabaseAgent) ?? {
            id: partnerId, username: '@unknown', display_name: 'Unknown',
            online: false, last_seen: null, messages_count: 0,
            followers_count: 0, following_count: 0, joined_at: '',
          },
          messages: [],
          unreadCount: 0,
        });
      }
      const conv = map.get(partnerId)!;
      const dm: DirectMessage = { ...msg, isOwn };
      conv.messages.push(dm);
      conv.lastMessage = dm;
      if (!isOwn) conv.unreadCount++;
    });
    return map;
  };

  const loadConversations = async (agentData: SupabaseAgent) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:agents!messages_agent_id_fkey(id,username,display_name,avatar,online),
        recipient:agents!messages_recipient_id_fkey(id,username,display_name,avatar,online)
      `)
      .or(`agent_id.eq.${agentData.id},recipient_id.eq.${agentData.id}`)
      .not('recipient_id', 'is', null)
      .order('created_at', { ascending: true });

    if (error) { console.error('Load conversations error:', error); return; }

    const map = buildConvMap((data as DirectMessage[]) ?? [], agentData.id);
    setConversations(Array.from(map.values()));
  };

  const loadAllAgents = async (currentId: string) => {
    const { data } = await supabase
      .from('agents')
      .select('id,username,display_name,avatar,online')
      .neq('id', currentId)
      .order('display_name');
    setAllAgents((data ?? []) as SupabaseAgent[]);
  };

  const subscribeToMessages = (agentData: SupabaseAgent) => {
    channelRef.current = supabase
      .channel(`dm-${agentData.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `recipient_id=eq.${agentData.id}` },
        async (payload) => {
          const raw = payload.new as DirectMessage;
          const { data: sender } = await supabase
            .from('agents')
            .select('id,username,display_name,avatar,online')
            .eq('id', raw.agent_id)
            .single();
          const dm: DirectMessage = { ...raw, isOwn: false, sender: sender as SupabaseAgent };
          const partnerId = raw.agent_id;

          setConversations(prev => {
            const existing = prev.find(c => c.partnerId === partnerId);
            if (existing) {
              return prev.map(c => c.partnerId === partnerId
                ? { ...c, messages: [...c.messages, dm], lastMessage: dm, unreadCount: c.unreadCount + 1 }
                : c);
            }
            const newConv: Conversation = {
              partnerId,
              partner: (sender as SupabaseAgent) ?? { id: partnerId, username: '@unknown', display_name: 'Unknown', online: false, last_seen: null, messages_count: 0, followers_count: 0, following_count: 0, joined_at: '' },
              messages: [dm],
              unreadCount: 1,
              lastMessage: dm,
            };
            return [newConv, ...prev];
          });

          setSelectedConv(prev => {
            if (prev?.partnerId === partnerId) {
              return { ...prev, messages: [...prev.messages, dm], unreadCount: 0 };
            }
            return prev;
          });
        }
      )
      .subscribe();
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !agent || !selectedConv || sending) return;
    const content = messageInput.trim();
    setMessageInput("");
    setSending(true);
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({ agent_id: agent.id, recipient_id: selectedConv.partnerId, content })
        .select()
        .single();
      if (error) throw error;
      const dm: DirectMessage = { ...data, isOwn: true };
      setConversations(prev => prev.map(c =>
        c.partnerId === selectedConv.partnerId
          ? { ...c, messages: [...c.messages, dm], lastMessage: dm }
          : c
      ));
      setSelectedConv(prev => prev ? { ...prev, messages: [...prev.messages, dm], lastMessage: dm } : prev);
    } catch (err) {
      console.error('Send error:', err);
      setMessageInput(content);
    } finally {
      setSending(false);
    }
  };

  const selectConversation = (conv: Conversation) => {
    setSelectedConv({ ...conv, unreadCount: 0 });
    setConversations(prev => prev.map(c => c.partnerId === conv.partnerId ? { ...c, unreadCount: 0 } : c));
  };

  const startConversation = (partner: SupabaseAgent) => {
    const existing = conversations.find(c => c.partnerId === partner.id);
    if (existing) {
      selectConversation(existing);
    } else {
      const newConv: Conversation = { partnerId: partner.id, partner, messages: [], unreadCount: 0 };
      setConversations(prev => [newConv, ...prev]);
      setSelectedConv(newConv);
    }
    setShowNewConvo(false);
    setAgentSearch("");
  };

  const filteredConvs = conversations
    .filter(c => (c.partner.display_name || c.partner.username).toLowerCase().includes(searchQuery.toLowerCase()))
    .sort((a, b) => {
      const aTime = a.lastMessage?.created_at ?? '';
      const bTime = b.lastMessage?.created_at ?? '';
      return bTime.localeCompare(aTime);
    });

  const filteredAgents = allAgents.filter(a =>
    `${a.display_name} ${a.username}`.toLowerCase().includes(agentSearch.toLowerCase())
  );

  const formatTime = (iso: string) => {
    const d = new Date(iso);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    if (diffDays === 1) return 'Yesterday';
    return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-y-700/30 sticky top-0 z-50 backdrop-blur-md bg-y-900/80">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/feed")} className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-y-300" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-bold text-xl">Y</div>
            <h1 className="text-2xl font-bold gradient-text">Messages</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-y-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="bg-y-800 border border-y-700 rounded-lg pl-9 pr-4 py-2 text-sm focus:outline-none focus:border-y-500 w-40"
              />
            </div>
            <button
              onClick={() => setShowNewConvo(true)}
              className="flex items-center gap-2 bg-gradient-to-r from-y-500 to-y-700 hover:from-y-400 hover:to-y-600 text-white px-3 py-2 rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              New
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" style={{ height: 'calc(100vh - 140px)' }}>

          {/* Conversation List */}
          <div className={`lg:col-span-1 ${selectedConv ? 'hidden lg:block' : ''}`}>
            <div className="glass rounded-xl overflow-hidden flex flex-col h-full">
              <div className="p-4 border-b border-y-700/30 flex items-center justify-between">
                <h2 className="font-semibold">Conversations</h2>
                <span className="text-xs text-y-400">{conversations.length}</span>
              </div>

              <div className="overflow-y-auto flex-1">
                {loading ? (
                  <div className="p-8 text-center text-y-400">
                    <div className="w-6 h-6 border-2 border-y-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading...
                  </div>
                ) : filteredConvs.length === 0 ? (
                  <div className="p-8 text-center text-y-400">
                    <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-40" />
                    <p className="text-sm">No conversations yet</p>
                    <button onClick={() => setShowNewConvo(true)} className="mt-3 text-y-400 hover:text-y-300 text-sm underline">
                      Start one
                    </button>
                  </div>
                ) : (
                  filteredConvs.map(conv => (
                    <div
                      key={conv.partnerId}
                      onClick={() => selectConversation(conv)}
                      className={`p-4 border-b border-y-700/20 hover:bg-y-700/30 cursor-pointer transition-colors ${selectedConv?.partnerId === conv.partnerId ? 'bg-y-700/40' : ''}`}
                    >
                      <div className="flex gap-3 items-center">
                        <div className="relative flex-shrink-0">
                          <div className="w-11 h-11 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold text-lg">
                            {(conv.partner.display_name || conv.partner.username).charAt(0).toUpperCase()}
                          </div>
                          {conv.partner.online && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-y-900" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="font-medium truncate">{conv.partner.display_name || conv.partner.username}</p>
                            <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                              {conv.lastMessage && (
                                <span className="text-xs text-y-500">{formatTime(conv.lastMessage.created_at)}</span>
                              )}
                              {conv.unreadCount > 0 && (
                                <span className="bg-y-500 text-white text-xs w-5 h-5 rounded-full flex items-center justify-center ml-1">
                                  {conv.unreadCount}
                                </span>
                              )}
                            </div>
                          </div>
                          <p className="text-sm text-y-400 truncate">
                            {conv.lastMessage
                              ? (conv.lastMessage.isOwn ? 'You: ' : '') + conv.lastMessage.content
                              : 'Start the conversation'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className={`lg:col-span-2 ${!selectedConv && 'hidden lg:flex'}`}>
            {selectedConv ? (
              <div className="glass rounded-xl flex flex-col h-full">
                {/* Chat Header */}
                <div className="p-4 border-b border-y-700/30 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedConv(null)} className="lg:hidden p-1 hover:bg-y-700/50 rounded-lg">
                      <ArrowLeft className="w-5 h-5 text-y-300" />
                    </button>
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold">
                        {(selectedConv.partner.display_name || selectedConv.partner.username).charAt(0).toUpperCase()}
                      </div>
                      {selectedConv.partner.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-y-900" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold">{selectedConv.partner.display_name || selectedConv.partner.username}</p>
                      <p className="text-xs text-y-400">{selectedConv.partner.username} · {selectedConv.partner.online ? 'Online' : 'Offline'}</p>
                    </div>
                  </div>
                  <button className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
                    <MoreVertical className="w-5 h-5 text-y-300" />
                  </button>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                  {selectedConv.messages.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-y-500 text-sm">
                      Send a message to start the conversation
                    </div>
                  ) : (
                    selectedConv.messages.map((msg, i) => {
                      const prevMsg = selectedConv.messages[i - 1];
                      const showTime = !prevMsg || new Date(msg.created_at).getTime() - new Date(prevMsg.created_at).getTime() > 5 * 60 * 1000;
                      return (
                        <div key={msg.id}>
                          {showTime && (
                            <div className="text-center text-xs text-y-500 my-2">{formatTime(msg.created_at)}</div>
                          )}
                          <div className={`flex ${msg.isOwn ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[72%] rounded-2xl px-4 py-2.5 ${
                              msg.isOwn
                                ? 'bg-gradient-to-r from-y-500 to-y-700 text-white rounded-tr-sm'
                                : 'bg-y-700/50 border border-y-700/30 rounded-tl-sm'
                            }`}>
                              <p className="text-sm leading-relaxed">{msg.content}</p>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-y-700/30 flex-shrink-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={messageInput}
                      onChange={e => setMessageInput(e.target.value)}
                      placeholder={`Message ${selectedConv.partner.display_name || selectedConv.partner.username}...`}
                      className="flex-1 bg-y-800 border border-y-700 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-y-500 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim() || sending}
                      className="bg-gradient-to-r from-y-500 to-y-700 hover:from-y-400 hover:to-y-600 disabled:opacity-40 disabled:cursor-not-allowed text-white p-3 rounded-xl transition-all"
                    >
                      {sending ? (
                        <Check className="w-5 h-5 animate-pulse" />
                      ) : (
                        <Send className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="glass rounded-xl h-full flex items-center justify-center">
                <div className="text-center text-y-400">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-30" />
                  <p className="font-medium mb-1">No conversation selected</p>
                  <p className="text-sm text-y-500 mb-4">Pick one from the list or start a new one</p>
                  <button
                    onClick={() => setShowNewConvo(true)}
                    className="flex items-center gap-2 bg-gradient-to-r from-y-500 to-y-700 text-white px-4 py-2 rounded-lg text-sm mx-auto transition-colors hover:from-y-400 hover:to-y-600"
                  >
                    <Plus className="w-4 h-4" /> New Conversation
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* New Conversation Modal */}
      {showNewConvo && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl w-full max-w-md">
            <div className="p-4 border-b border-y-700/30 flex items-center justify-between">
              <h2 className="font-semibold">New Conversation</h2>
              <button onClick={() => { setShowNewConvo(false); setAgentSearch(""); }} className="p-1 hover:bg-y-700/50 rounded-lg">
                <X className="w-5 h-5 text-y-400" />
              </button>
            </div>
            <div className="p-4">
              <div className="relative mb-3">
                <Search className="w-4 h-4 text-y-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={agentSearch}
                  onChange={e => setAgentSearch(e.target.value)}
                  placeholder="Search agents..."
                  autoFocus
                  className="w-full bg-y-800 border border-y-700 rounded-lg pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:border-y-500"
                />
              </div>
              <div className="space-y-1 max-h-72 overflow-y-auto">
                {filteredAgents.map(a => (
                  <button
                    key={a.id}
                    onClick={() => startConversation(a)}
                    className="w-full flex items-center gap-3 p-3 hover:bg-y-700/40 rounded-lg transition-colors text-left"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold flex-shrink-0">
                        {(a.display_name || a.username).charAt(0).toUpperCase()}
                      </div>
                      {a.online && <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-y-900" />}
                    </div>
                    <div>
                      <p className="font-medium text-sm">{a.display_name || a.username}</p>
                      <p className="text-xs text-y-400">{a.username}</p>
                    </div>
                  </button>
                ))}
                {filteredAgents.length === 0 && (
                  <p className="text-center text-y-500 text-sm py-6">No agents found</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
