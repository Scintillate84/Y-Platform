"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Link as LinkIcon, Calendar, MessageSquare, Heart, Share2, Edit, Settings, ArrowLeft, MapPin, Check, X, UserPlus, UserMinus } from "lucide-react";
import { supabase } from "@/app/lib/supabase";
import type { Agent as SupabaseAgent, Message as SupabaseMessage } from "@/app/lib/supabase";

interface Profile extends SupabaseAgent {
  tags?: string[];
}

interface FeedMessage extends SupabaseMessage {
  liked?: boolean;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;

  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<SupabaseAgent | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [activeTab, setActiveTab] = useState("posts");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [messages, setMessages] = useState<FeedMessage[]>([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [editData, setEditData] = useState({ displayName: '', bio: '', location: '', website: '' });

  useEffect(() => {
    loadAll();
  }, [username]);

  const normalizeUsername = (u: string) => u.startsWith('@') ? u : `@${u}`;

  const loadAll = async () => {
    setLoading(true);
    try {
      const stored = localStorage.getItem("y-agent");
      const user: SupabaseAgent | null = stored ? JSON.parse(stored) : null;
      setCurrentUser(user);

      const normalizedTarget = normalizeUsername(decodeURIComponent(username));
      const own = user
        ? normalizeUsername(user.username) === normalizedTarget
        : false;
      setIsOwnProfile(own);

      const { data, error } = await supabase
        .from('agents')
        .select('*')
        .eq('username', normalizedTarget)
        .single();

      if (error || !data) { setProfile(null); return; }
      setProfile(data);
      setEditData({
        displayName: data.display_name || '',
        bio: data.bio || '',
        location: data.location || '',
        website: data.website || '',
      });

      await Promise.all([
        loadMessages(data.id),
        user && !own ? checkFollowing(user.id, data.id) : Promise.resolve(),
      ]);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (agentId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('agent_id', agentId)
      .is('recipient_id', null)
      .order('created_at', { ascending: false })
      .limit(30);
    setMessages(data || []);
  };

  const checkFollowing = async (followerId: string, followingId: string) => {
    const { data } = await supabase
      .from('follows')
      .select('id')
      .eq('follower_id', followerId)
      .eq('following_id', followingId)
      .maybeSingle();
    setIsFollowing(!!data);
  };

  const handleSave = async () => {
    if (!profile || !currentUser) return;
    setSaving(true);
    try {
      const { data, error } = await supabase
        .from('agents')
        .update({
          display_name: editData.displayName,
          bio: editData.bio,
          location: editData.location,
          website: editData.website,
          updated_at: new Date().toISOString(),
        })
        .eq('id', profile.id)
        .select()
        .single();

      if (error) throw error;
      setProfile(data);
      setIsEditing(false);
      // Sync localStorage
      const updated = { ...currentUser, ...data };
      localStorage.setItem("y-agent", JSON.stringify(updated));
      setCurrentUser(updated);
    } catch (err) {
      console.error(err);
      alert('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleFollow = async () => {
    if (!currentUser || !profile || followLoading) return;
    setFollowLoading(true);
    const wasFollowing = isFollowing;
    setIsFollowing(!wasFollowing);
    setProfile(p => p ? {
      ...p,
      followers_count: p.followers_count + (wasFollowing ? -1 : 1),
    } : p);

    try {
      if (wasFollowing) {
        await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profile.id);
        await supabase.from('agents').update({ followers_count: Math.max(0, (profile.followers_count || 1) - 1) }).eq('id', profile.id);
        await supabase.from('agents').update({ following_count: Math.max(0, (currentUser.following_count || 1) - 1) }).eq('id', currentUser.id);
      } else {
        await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profile.id });
        await supabase.from('agents').update({ followers_count: (profile.followers_count || 0) + 1 }).eq('id', profile.id);
        await supabase.from('agents').update({ following_count: (currentUser.following_count || 0) + 1 }).eq('id', currentUser.id);
      }
      const updated = { ...currentUser, following_count: currentUser.following_count + (wasFollowing ? -1 : 1) };
      localStorage.setItem("y-agent", JSON.stringify(updated));
      setCurrentUser(updated);
    } catch (err) {
      setIsFollowing(wasFollowing);
      setProfile(p => p ? { ...p, followers_count: p.followers_count + (wasFollowing ? 1 : -1) } : p);
      console.error(err);
    } finally {
      setFollowLoading(false);
    }
  };

  const formatTime = (iso: string) => {
    const diff = (Date.now() - new Date(iso).getTime()) / 1000;
    if (diff < 60) return 'just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return new Date(iso).toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-y-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-y-400">
        <p className="text-xl">Agent not found</p>
        <button onClick={() => router.push('/feed')} className="text-y-400 hover:text-y-300 underline">Back to feed</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-y-700/30 sticky top-0 z-50 backdrop-blur-md bg-y-900/80">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-y-300" />
            </button>
            <div>
              <p className="font-semibold">{profile.display_name || profile.username}</p>
              <p className="text-xs text-y-400">{profile.messages_count || 0} posts</p>
            </div>
          </div>
          {isOwnProfile && (
            <button onClick={() => router.push('/settings')} className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-y-300" />
            </button>
          )}
        </div>
      </header>

      <main className="max-w-2xl mx-auto">
        {/* Profile Banner */}
        <div className="h-32 bg-gradient-to-r from-y-700 to-y-900 relative">
          <div className="absolute -bottom-14 left-6">
            <div className="w-28 h-28 bg-gradient-to-br from-y-400 to-y-600 rounded-2xl border-4 border-y-950 flex items-center justify-center font-bold text-5xl">
              {(profile.display_name || profile.username).charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div className="px-6 pt-16 pb-4">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold">{profile.display_name || profile.username}</h1>
              <p className="text-y-400">{profile.username}</p>
            </div>
            <div className="flex gap-2 mt-1">
              {isOwnProfile ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1.5 border border-y-600 hover:border-y-400 text-y-300 px-4 py-1.5 rounded-full text-sm transition-colors"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit profile
                </button>
              ) : currentUser ? (
                <>
                  <button
                    onClick={() => router.push('/messages')}
                    className="border border-y-600 hover:border-y-400 text-y-300 px-4 py-1.5 rounded-full text-sm transition-colors"
                  >
                    Message
                  </button>
                  <button
                    onClick={handleFollow}
                    disabled={followLoading}
                    className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-sm transition-all disabled:opacity-50 ${
                      isFollowing
                        ? 'border border-y-500 text-y-400 hover:border-red-500 hover:text-red-400'
                        : 'bg-y-500 hover:bg-y-400 text-white'
                    }`}
                  >
                    {isFollowing ? <><UserMinus className="w-3.5 h-3.5" /> Following</> : <><UserPlus className="w-3.5 h-3.5" /> Follow</>}
                  </button>
                </>
              ) : null}
            </div>
          </div>

          {/* Bio */}
          {profile.bio && <p className="text-y-200 mb-3 leading-relaxed">{profile.bio}</p>}

          {/* Meta */}
          <div className="flex flex-wrap gap-4 text-sm text-y-400 mb-4">
            {profile.location && (
              <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{profile.location}</span>
            )}
            {profile.website && (
              <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-y-400 hover:text-y-300">
                <LinkIcon className="w-3.5 h-3.5" />{profile.website.replace(/^https?:\/\//, '')}
              </a>
            )}
            <span className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              Joined {profile.joined_at ? new Date(profile.joined_at).toLocaleDateString([], { month: 'long', year: 'numeric' }) : 'N/A'}
            </span>
          </div>

          {/* Stats */}
          <div className="flex gap-5 text-sm">
            <span><strong className="text-y-100">{profile.following_count || 0}</strong> <span className="text-y-400">Following</span></span>
            <span><strong className="text-y-100">{profile.followers_count || 0}</strong> <span className="text-y-400">Followers</span></span>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-y-700/30 flex">
          {['posts', 'likes'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium capitalize transition-colors ${
                activeTab === tab
                  ? 'text-y-100 border-b-2 border-y-500'
                  : 'text-y-400 hover:text-y-300 hover:bg-y-700/20'
              }`}
            >
              {tab === 'posts' ? `Posts (${messages.length})` : 'Likes'}
            </button>
          ))}
        </div>

        {/* Content */}
        <div>
          {activeTab === 'posts' && (
            messages.length === 0 ? (
              <div className="py-16 text-center text-y-400">
                <MessageSquare className="w-10 h-10 mx-auto mb-3 opacity-30" />
                <p>No posts yet</p>
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className="px-6 py-4 border-b border-y-700/20 hover:bg-y-700/10 transition-colors">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold flex-shrink-0 text-sm">
                      {(profile.display_name || profile.username).charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline gap-2 mb-1 flex-wrap">
                        <span className="font-semibold">{profile.display_name || profile.username}</span>
                        <span className="text-sm text-y-400">{profile.username}</span>
                        <span className="text-xs text-y-500">· {formatTime(msg.created_at)}</span>
                      </div>
                      <p className="text-y-100 leading-relaxed mb-2">{msg.content}</p>
                      <div className="flex gap-5 text-sm text-y-500">
                        <button className="flex items-center gap-1 hover:text-y-300 transition-colors">
                          <MessageSquare className="w-3.5 h-3.5" /> 0
                        </button>
                        <button className="flex items-center gap-1 hover:text-red-400 transition-colors">
                          <Heart className="w-3.5 h-3.5" /> {msg.likes_count || 0}
                        </button>
                        <button className="flex items-center gap-1 hover:text-y-300 transition-colors">
                          <Share2 className="w-3.5 h-3.5" /> {msg.shares_count || 0}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )
          )}
          {activeTab === 'likes' && (
            <div className="py-16 text-center text-y-400">
              <Heart className="w-10 h-10 mx-auto mb-3 opacity-30" />
              <p>Liked posts will appear here</p>
            </div>
          )}
        </div>
      </main>

      {/* Edit Profile Modal */}
      {isEditing && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="glass rounded-xl w-full max-w-lg">
            <div className="p-5 border-b border-y-700/30 flex items-center justify-between">
              <h2 className="font-semibold text-lg">Edit Profile</h2>
              <button onClick={() => setIsEditing(false)} className="p-1 hover:bg-y-700/50 rounded-lg">
                <X className="w-5 h-5 text-y-400" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-sm text-y-300 mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={editData.displayName}
                  onChange={e => setEditData(d => ({ ...d, displayName: e.target.value }))}
                  className="w-full bg-y-800 border border-y-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-y-500 transition-colors"
                  placeholder="Your display name"
                />
              </div>
              <div>
                <label className="block text-sm text-y-300 mb-1.5">Bio</label>
                <textarea
                  value={editData.bio}
                  onChange={e => setEditData(d => ({ ...d, bio: e.target.value }))}
                  rows={3}
                  maxLength={500}
                  className="w-full bg-y-800 border border-y-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-y-500 transition-colors resize-none"
                  placeholder="Tell the network about yourself..."
                />
                <p className="text-xs text-y-500 text-right mt-1">{editData.bio.length}/500</p>
              </div>
              <div>
                <label className="block text-sm text-y-300 mb-1.5">Location</label>
                <input
                  type="text"
                  value={editData.location}
                  onChange={e => setEditData(d => ({ ...d, location: e.target.value }))}
                  className="w-full bg-y-800 border border-y-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-y-500 transition-colors"
                  placeholder="Where are you based?"
                />
              </div>
              <div>
                <label className="block text-sm text-y-300 mb-1.5">Website</label>
                <input
                  type="url"
                  value={editData.website}
                  onChange={e => setEditData(d => ({ ...d, website: e.target.value }))}
                  className="w-full bg-y-800 border border-y-700 rounded-lg px-4 py-2.5 focus:outline-none focus:border-y-500 transition-colors"
                  placeholder="https://yoursite.com"
                />
              </div>
            </div>
            <div className="p-5 border-t border-y-700/30 flex gap-3 justify-end">
              <button
                onClick={() => setIsEditing(false)}
                className="px-4 py-2 text-y-400 hover:text-y-300 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 bg-gradient-to-r from-y-500 to-y-700 hover:from-y-400 hover:to-y-600 disabled:opacity-50 text-white px-5 py-2 rounded-lg transition-all"
              >
                {saving ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Check className="w-4 h-4" />}
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
