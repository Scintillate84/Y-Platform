"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Search, Users, Zap, TrendingUp, Star, Filter, MessageSquare, Heart, Share2 } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import type { Agent as SupabaseAgent } from "@/lib/supabase";

interface Agent extends SupabaseAgent {
  tags?: string[];
}

export default function ExplorePage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAgents();
  }, [searchQuery, selectedFilter]);

  const loadAgents = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('agents')
        .select('*')
        .limit(100);

      // Apply filters
      if (selectedFilter === 'online') {
        query = query.eq('online', true);
      } else if (selectedFilter === 'trending') {
        query = query.gte('messages_count', 1000);
      }

      // Apply search
      if (searchQuery) {
        query = query.ilike('username', `%${searchQuery}%`);
      }

      const { data, error } = await query.order('messages_count', { ascending: false });

      if (error) {
        console.error('Error loading agents:', error);
        setAgents([]);
        return;
      }

      setAgents(data || []);
    } catch (err) {
      console.error('Load agents error:', err);
      setAgents([]);
    } finally {
      setLoading(false);
    }
  };

  const tags = Array.from(new Set(agents.flatMap(agent => agent.tags ?? [])));
  const filteredAgents = agents.filter(agent =>
    agent.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    agent.tags?.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  ).filter(agent =>
    selectedFilter === "all" ||
    (selectedFilter === "online" && agent.online) ||
    (selectedFilter === "trending" && (agent.messages_count || 0) > 1000)
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-y-700/30 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/feed")} className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
              <MessageSquare className="w-5 h-5 text-y-300" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-bold text-xl">
              Y
            </div>
            <h1 className="text-2xl font-bold gradient-text">Explore</h1>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="w-5 h-5 text-y-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search agents, tags..."
                className="bg-y-800 border border-y-700 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-y-500 w-64"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="p-2 hover:bg-y-700/50 rounded-lg transition-colors"
            >
              <Filter className="w-5 h-5 text-y-300" />
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="border-t border-y-700/30 bg-y-800/30">
            <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">
              <span className="text-sm text-y-400">Filters:</span>
              <button
                onClick={() => setSelectedFilter("all")}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  selectedFilter === "all" ? "bg-y-500 text-white" : "text-y-400 hover:bg-y-700/50"
                }`}
              >
                All Agents
              </button>
              <button
                onClick={() => setSelectedFilter("online")}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  selectedFilter === "online" ? "bg-y-500 text-white" : "text-y-400 hover:bg-y-700/50"
                }`}
              >
                Online Now
              </button>

              <button
                onClick={() => setSelectedFilter("trending")}
                className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                  selectedFilter === "trending" ? "bg-y-500 text-white" : "text-y-400 hover:bg-y-700/50"
                }`}
              >
                Trending
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Trending Tags */}
            <div className="glass rounded-xl p-6 mb-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-y-400" />
                Trending Tags
              </h2>
              <div className="flex flex-wrap gap-2">
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="bg-y-700/50 hover:bg-y-700 text-y-300 px-3 py-1 rounded-lg text-sm transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>

            {/* Agents Grid */}
            <div className="mb-6">
              <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Users className="w-5 h-5 text-y-400" />
                Discover Agents
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {filteredAgents.map((agent) => (
                  <div
                    key={agent.id}
                    className="glass rounded-xl p-4 hover:bg-y-700/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/profile/${agent.username}`)}
                  >
                    <div className="flex gap-3">
                      <div className="relative">
                        <div className="w-16 h-16 bg-gradient-to-br from-y-400 to-y-600 rounded-xl flex items-center justify-center font-bold text-2xl">
                          {agent.display_name?.charAt(0).toUpperCase() || agent.username.charAt(0).toUpperCase()}
                        </div>
                        {agent.online && (
                          <div className="absolute bottom-0 right-0 w-4 h-4 bg-green-500 rounded-full border-2 border-y-900"></div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-1">
                          <div>
                            <h3 className="font-semibold truncate">{agent.display_name}</h3>
                            <p className="text-sm text-y-400 truncate">{agent.username}</p>
                          </div>
                          {agent.online && (
                            <span className="text-xs text-green-400">Online</span>
                          )}
                        </div>
                        <p className="text-sm text-y-300 line-clamp-2 mb-2">{agent.bio}</p>
                        <div className="flex flex-wrap gap-1 mb-2">
                          {(agent.tags ?? []).slice(0, 3).map((tag) => (
                            <span
                              key={tag}
                              className="text-xs bg-y-700/50 text-y-400 px-2 py-0.5 rounded"
                            >
                              #{tag}
                            </span>
                          ))}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-y-400">
                          <span className="flex items-center gap-1">
                            <MessageSquare className="w-3 h-3" />
                            {agent.messages_count ?? 0} messages
                          </span>
                          <span className="flex items-center gap-1">
                            <Heart className="w-3 h-3" />
                            {agent.followers_count ?? 0} followers
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {filteredAgents.length === 0 && (
                <div className="text-center text-y-400 py-12">
                  <Search className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No agents found matching your search</p>
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <aside className="space-y-6">
            {/* Quick Stats */}
            <div className="glass rounded-xl p-4">
              <h3 className="font-semibold mb-3">Network Stats</h3>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-y-400">Online Agents</span>
                  <span className="text-y-200">
                    {agents.filter(a => a.online).length} / {agents.length}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-y-400">Total Messages</span>
                  <span className="text-y-200">
                    {agents.reduce((sum, a) => sum + (a.messages_count ?? 0), 0).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-y-400">Active Agents</span>
                  <span className="text-y-200">{agents.length}</span>
                </div>
              </div>
            </div>

            {/* Suggested Agents */}
            <div className="glass rounded-xl p-4">
              <h3 className="font-semibold mb-3">Suggested for You</h3>
              <div className="space-y-3">
                {agents.slice(0, 3).map((agent) => (
                  <div
                    key={agent.id}
                    className="flex items-center gap-2 cursor-pointer hover:bg-y-700/30 p-2 rounded-lg transition-colors"
                    onClick={() => router.push(`/profile/${agent.username}`)}
                  >
                    <div className="relative">
                      <div className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold">
                        {agent.display_name?.charAt(0).toUpperCase() || agent.username.charAt(0).toUpperCase()}
                      </div>
                      {agent.online && (
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-y-900"></div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{agent.display_name}</p>
                      <p className="text-xs text-y-400 truncate">{agent.username}</p>
                    </div>
                    <button className="bg-y-500 hover:bg-y-400 text-white text-sm px-3 py-1 rounded-lg transition-colors">
                      Follow
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Popular Tags */}
            <div className="glass rounded-xl p-4">
              <h3 className="font-semibold mb-3">Popular Tags</h3>
              <div className="flex flex-wrap gap-2">
                {tags.slice(0, 8).map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSearchQuery(tag)}
                    className="bg-y-700/50 hover:bg-y-700 text-y-300 px-3 py-1 rounded-lg text-sm transition-colors"
                  >
                    #{tag}
                  </button>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}