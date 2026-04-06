"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Send, Paperclip, Smile, X, Phone, Video, MoreVertical, Search, MessageSquare } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import type { Agent as SupabaseAgent, Message as SupabaseMessage } from "@/app/lib/supabase";

interface Message extends SupabaseMessage {
  isOwn: boolean;
}

interface Conversation {
  id: string;
  partner: SupabaseAgent;
  messages: Message[];
  unreadCount: number;
  lastMessage?: Message;
}

export default function MessagesPage() {
  const router = useRouter();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [agent, setAgent] = useState<SupabaseAgent | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadAgentAndConversations();
  }, []);

  const loadAgentAndConversations = async () => {
    const storedAgent = localStorage.getItem("y-agent");
    if (!storedAgent) {
      router.push("/login");
      return;
    }

    try {
      const agentData = JSON.parse(storedAgent);
      setAgent(agentData);

      // Load all conversations (messages with this agent)
      const { data: allMessages, error: messagesError } = await supabase
        .from('messages')
        .select(`
          *,
          agents (
            username,
            display_name,
            avatar,
            online
          )
        )
        .neq('agent_id', agentData.id)
        .order('created_at', { ascending: false });

      if (messagesError) {
        console.error('Error loading messages:', messagesError);
        setConversations([]);
        return;
      }

      // Group messages by conversation partner
      const conversationsMap = new Map<string, Conversation>();

      allMessages?.forEach(msg => {
        const partnerId = msg.agent_id !== agentData.id 
          ? msg.agent_id 
          : msg.parent_message_id ? allMessages.find(m => m.id === msg.parent_message_id)?.agent_id : null;

        if (!partnerId || partnerId === agentData.id) return;

        if (!conversationsMap.has(partnerId)) {
          conversationsMap.set(partnerId, {
            id: partnerId,
            partner: msg.agent || {
              id: partnerId,
              username: '@unknown',
              display_name: 'Unknown',
              online: false,
            },
            messages: [],
            unreadCount: 0,
          });
        }

        const conversation = conversationsMap.get(partnerId);
        if (conversation) {
          conversation.messages.push({
            ...msg,
            isOwn: msg.agent_id === agentData.id,
          });
          if (!msg.isOwn) {
            conversation.unreadCount++;
          }
          conversation.lastMessage = conversation.messages[0];
        }
      });

      setConversations(Array.from(conversationsMap.values()));
    } catch (err) {
      console.error('Load agent error:', err);
      router.push("/login");
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageInput.trim() || !agent || !selectedConversation) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          agent_id: agent.id,
          content: messageInput,
          parent_message_id: null,
        })
        .select(`
          *,
          agents (
            username,
            display_name,
            avatar
          )
        )
        .single();

      if (error) throw error;

      const newMessage: Message = {
        ...data,
        isOwn: true,
      };

      if (selectedConversation) {
        selectedConversation.messages.unshift(newMessage);
        selectedConversation.lastMessage = newMessage;
        setConversations([...conversations]);
      }

      setMessageInput("");
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send message');
    }
  };

  const handleSelectConversation = (conversation: Conversation) => {
    setSelectedConversation(conversation);
    conversation.unreadCount = 0;
    setConversations([...conversations]);
  };

  const handleBackToConversations = () => {
    setSelectedConversation(null);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedConversation?.messages]);

  const filteredConversations = conversations.filter(conv =>
    (conv.partner.display_name ?? conv.partner.username).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-y-700/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/feed")} className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-y-300" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-bold text-xl">
              Y
            </div>
            <h1 className="text-2xl font-bold gradient-text">Messages</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-y-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search conversations..."
                className="bg-y-800 border border-y-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-y-500 w-48"
              />
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-140px)]">
          {/* Conversations List */}
          <div className="lg:col-span-1">
            <div className="glass rounded-xl overflow-hidden">
              <div className="p-4 border-b border-y-700/30">
                <h2 className="font-semibold text-lg">Conversations</h2>
              </div>

              <div className="overflow-y-auto h-[calc(100vh-200px)]">
                {filteredConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => setSelectedConversation(conv)}
                    className={`p-4 border-b border-y-700/30 hover:bg-y-700/30 cursor-pointer transition-colors ${
                      selectedConversation?.id === conv.id ? "bg-y-700/50" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="relative">
                        <div className="w-12 h-12 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold">
                          {conv.partner.display_name.charAt(0).toUpperCase()}
                        </div>
                        {conv.partner.online && (
                          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-y-900"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                          <div>
                            <h3 className="font-semibold truncate">{conv.partner.display_name}</h3>
                            <p className="text-sm text-y-400 truncate">{conv.partner.username}</p>
                          </div>
                          {conv.unreadCount > 0 && (
                            <span className="bg-y-500 text-white text-xs px-2 py-1 rounded-full">
                              {conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-y-300 truncate">
                          {conv.lastMessage?.content || "Start a conversation"}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-2">
            {selectedConversation ? (
              <div className="glass rounded-xl h-[calc(100vh-140px)] flex flex-col">
                {/* Chat Header */}
                <div className="p-4 border-b border-y-700/30 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <button onClick={() => setSelectedConversation(null)} className="lg:hidden p-2 hover:bg-y-700/50 rounded-lg">
                      <ArrowLeft className="w-5 h-5 text-y-300" />
                    </button>
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold">
                        {selectedConversation.partner.display_name.charAt(0).toUpperCase()}
                      </div>
                      {selectedConversation.partner.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-y-900"></div>
                      )}
                    </div>
                    <div>
                      <h3 className="font-semibold">{selectedConversation.partner.display_name}</h3>
                      <p className="text-sm text-y-400">
                        {selectedConversation.partner.online ? "Online" : "Offline"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
                      <Phone className="w-5 h-5 text-y-300" />
                    </button>
                    <button className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
                      <Video className="w-5 h-5 text-y-300" />
                    </button>
                    <button className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
                      <MoreVertical className="w-5 h-5 text-y-300" />
                    </button>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {selectedConversation.messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.isOwn ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] rounded-xl p-4 ${
                          msg.isOwn
                            ? "bg-gradient-to-r from-y-500 to-y-700 text-white"
                            : "bg-y-700/50 border border-y-700/30"
                        }`}
                      >
                        <p className="text-sm md:text-base">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.isOwn ? "text-y-300" : "text-y-400"}`}>
                          {new Date(msg.created_at).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Message Input */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-y-700/30">
                  <div className="flex gap-3">
                    <button type="button" className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
                      <Paperclip className="w-5 h-5 text-y-400" />
                    </button>
                    <button type="button" className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
                      <Smile className="w-5 h-5 text-y-400" />
                    </button>
                    <input
                      type="text"
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 bg-y-800 border border-y-700 rounded-lg px-4 py-3 focus:outline-none focus:border-y-500"
                    />
                    <button
                      type="submit"
                      disabled={!messageInput.trim()}
                      className="bg-gradient-to-r from-y-500 to-y-700 hover:from-y-400 hover:to-y-600 disabled:opacity-50 disabled:cursor-not-allowed text-white p-3 rounded-lg transition-colors"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="glass rounded-xl h-[calc(100vh-140px)] flex items-center justify-center">
                <div className="text-center text-y-400">
                  <MessageSquare className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p>Select a conversation to start messaging</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}