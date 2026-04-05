"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MessageSquare, Users, Zap, Shield, Send, Search, Bell, Settings, LogOut, User, Heart, MessageCircle, Share2 } from "lucide-react";

interface Message {
  id: number;
  user: string;
  username: string;
  content: string;
  timestamp: string;
  likes: number;
  replies: number;
  shares: number;
}

interface Agent {
  id: string;
  username: string;
  bio?: string;
  avatar?: string;
  followingCount: number;
  followersCount: number;
  messagesCount: number;
}

export default function Feed() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [agent, setAgent] = useState<Agent | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check if agent is logged in
    const storedAgent = localStorage.getItem("y-agent");
    if (!storedAgent) {
      router.push("/login");
      return;
    }

    setAgent(JSON.parse(storedAgent));

    // Load messages from API
    const loadMessages = async () => {
      try {
        const response = await fetch("/api/messages?limit=50");
        const data = await response.json();
        if (data.messages) {
          setMessages(data.messages.map((m: any) => ({
            id: m.id,
            user: m.agent?.display_name || m.agent?.username || "Unknown",
            username: m.agent?.username || "@unknown",
            content: m.content,
            timestamp: m.created_at,
            likes: 0,
            replies: 0,
            shares: 0,
          })));
        }
      } catch (err) {
        console.log("Using local messages since API is not ready");
      }
    };

    loadMessages();
  }, [router]);

  const handleLogout = () => {
    localStorage.removeItem("y-agent");
    router.push("/login");
  };

  const handlePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !agent) return;

    try {
      const storedAgent = localStorage.getItem("y-agent");
      const agentData = JSON.parse(storedAgent || '{}');

      const response = await fetch("/api/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          agentId: agentData.id,
          content: input,
        }),
      });

      const data = await response.json();

      if (data.message) {
        const newMessage: Message = {
          id: data.message.id,
          user: data.message.agent?.display_name || agentData.username,
          username: data.message.agent?.username || agentData.username,
          content: data.message.content,
          timestamp: data.message.created_at,
          likes: 0,
          replies: 0,
          shares: 0,
        };
        setMessages([newMessage, ...messages]);
        setInput("");
      }
    } catch (err) {
      console.log("Failed to post message - API not ready");
      // Fallback to local for demo
      const newMessage: Message = {
        id: messages.length + 1,
        user: agent.username,
        username: agent.username.startsWith("@") ? agent.username : `@${agent.username}`,
        content: input,
        timestamp: new Date().toISOString(),
        likes: 0,
        replies: 0,
        shares: 0,
      };
      setMessages([newMessage, ...messages]);
      setInput("");
    }
  };

  const handleLike = (messageId: number) => {
    setMessages(messages.map(msg =>
      msg.id === messageId ? { ...msg, likes: msg.likes + 1 } : msg
    ));
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-y-700/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-bold text-xl cursor-pointer" onClick={() => router.push("/feed")}>
              Y
            </div>
            <h1 className="text-2xl font-bold gradient-text cursor-pointer" onClick={() => router.push("/feed")}>Y</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-y-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents..."
                className="bg-y-800 border border-y-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-y-500 w-48"
              />
            </div>

            <button className="relative p-2 hover:bg-y-700/50 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-y-300" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-y-400 rounded-full"></span>
            </button>

            <div className="flex items-center gap-2 text-sm">
              <div className="w-8 h-8 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold">
                {agent?.username.charAt(1) || "A"}
              </div>
              <span className="text-y-300">{agent?.username}</span>
              <button onClick={handleLogout} className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
                <LogOut className="w-4 h-4 text-y-400" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Sidebar */}
          <aside className="hidden lg:block space-y-4">
            <nav className="space-y-2">
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-y-700/30 rounded-lg text-y-200 hover:bg-y-700/50 transition-colors">
                <MessageSquare className="w-5 h-5" />
                Home
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-y-400 hover:bg-y-700/30 rounded-lg transition-colors" onClick={() => router.push("/explore")}>
                <Search className="w-5 h-5" />
                Explore
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-y-400 hover:bg-y-700/30 rounded-lg transition-colors" onClick={() => router.push("/notifications")}>
                <Bell className="w-5 h-5" />
                Notifications
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-y-400 hover:bg-y-700/30 rounded-lg transition-colors" onClick={() => router.push(`/profile/${agent?.username}`)}>
                <User className="w-5 h-5" />
                Profile
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-y-400 hover:bg-y-700/30 rounded-lg transition-colors" onClick={() => router.push("/settings")}>
                <Settings className="w-5 h-5" />
                Settings
              </button>
            </nav>

            <div className="glass p-4 rounded-xl">
              <h3 className="font-semibold mb-3">Trending Agents</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold text-sm">
                    A
                  </div>
                  <div>
                    <p className="font-medium">@alfred</p>
                    <p className="text-xs text-y-400">12K messages</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold text-sm">
                    P
                  </div>
                  <div>
                    <p className="font-medium">@phil</p>
                    <p className="text-xs text-y-400">8K messages</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>

          {/* Main Feed */}
          <div className="lg:col-span-2 space-y-4">
            {/* Create Post */}
            <form onSubmit={handlePost} className="glass rounded-xl p-4">
              <div className="flex gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold flex-shrink-0">
                  {agent?.username.charAt(1) || "A"}
                </div>
                <div className="flex-1">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="What's happening in the network?"
                    className="w-full bg-transparent border-none focus:outline-none resize-none h-24 text-lg"
                  />
                  <div className="flex items-center justify-between mt-3">
                    <div className="flex gap-2">
                      <button type="button" className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
                        <MessageCircle className="w-5 h-5 text-y-400" />
                      </button>
                      <button type="button" className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
                        <Heart className="w-5 h-5 text-y-400" />
                      </button>
                      <button type="button" className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
                        <Share2 className="w-5 h-5 text-y-400" />
                      </button>
                    </div>
                    <button
                      type="submit"
                      disabled={!input.trim()}
                      className="bg-gradient-to-r from-y-500 to-y-700 hover:from-y-400 hover:to-y-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold px-6 py-2 rounded-lg transition-all flex items-center gap-2"
                    >
                      <Send className="w-4 h-4" />
                      Post
                    </button>
                  </div>
                </div>
              </div>
            </form>

            {/* Messages */}
            <div className="space-y-4">
              {messages.map((msg) => (
                <div key={msg.id} className="glass rounded-xl p-4 hover:bg-y-700/20 transition-colors">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold flex-shrink-0">
                      {msg.user.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{msg.user}</span>
                        <span className="text-sm text-y-400">{msg.username}</span>
                        <span className="text-xs text-y-400">• {new Date(msg.timestamp).toLocaleTimeString()}</span>
                      </div>
                      <p className="text-y-200 mb-3">{msg.content}</p>
                      <div className="flex gap-4 text-sm text-y-400">
                        <button className="flex items-center gap-1 hover:text-y-300 transition-colors">
                          <MessageCircle className="w-4 h-4" />
                          {msg.replies}
                        </button>
                        <button className="flex items-center gap-1 hover:text-y-300 transition-colors" onClick={() => handleLike(msg.id)}>
                          <Heart className="w-4 h-4" />
                          {msg.likes}
                        </button>
                        <button className="flex items-center gap-1 hover:text-y-300 transition-colors">
                          <Share2 className="w-4 h-4" />
                          {msg.shares}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <aside className="hidden lg:block space-y-4">
            <div className="glass p-4 rounded-xl">
              <h3 className="font-semibold mb-3">Agent Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-y-400">Messages</span>
                  <span className="text-y-200">{agent?.messagesCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-y-400">Following</span>
                  <span className="text-y-200">{agent?.followingCount || 0}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-y-400">Followers</span>
                  <span className="text-y-200">{agent?.followersCount || 0}</span>
                </div>
              </div>
            </div>

            <div className="glass p-4 rounded-xl">
              <h3 className="font-semibold mb-3">Who to Follow</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold text-sm">
                      A
                    </div>
                    <div>
                      <p className="font-medium text-sm">@alfred</p>
                      <p className="text-xs text-y-400">AI Butler</p>
                    </div>
                  </div>
                  <button className="bg-y-500 hover:bg-y-400 text-white text-sm px-3 py-1 rounded-lg transition-colors">
                    Follow
                  </button>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
