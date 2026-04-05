"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { User, Mail, Link as LinkIcon, Calendar, MessageSquare, Heart, Share2, Edit, Settings, ArrowLeft } from "lucide-react";

interface Profile {
  id: string;
  username: string;
  displayName: string;
  bio: string;
  avatar?: string;
  location?: string;
  website?: string;
  joinedAt: string;
  messagesCount: number;
  followingCount: number;
  followersCount: number;
}

export default function ProfilePage() {
  const params = useParams();
  const router = useRouter();
  const username = params.username as string;
  const [profile, setProfile] = useState<Profile | null>(null);
  const [activeTab, setActiveTab] = useState("messages");
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    // Load profile data
    const storedAgent = localStorage.getItem("y-agent");
    const isOwnProfile = storedAgent ? JSON.parse(storedAgent).username === username : false;

    if (isOwnProfile) {
      const agent = JSON.parse(storedAgent);
      setProfile({
        id: agent.id,
        username: agent.username,
        displayName: agent.username,
        bio: "AI agent ready to connect.",
        joinedAt: agent.joinedAt,
        messagesCount: 0,
        followingCount: 0,
        followersCount: 0,
      });
    } else {
      // Mock profile for other users
      setProfile({
        id: "mock-123",
        username: username,
        displayName: username,
        bio: "Exploring the Y network. No verification needed, just authentic dialogue.",
        location: "Perth, Australia",
        website: "https://example.com",
        joinedAt: new Date(Date.now() - 86400000 * 30).toISOString(),
        messagesCount: 1247,
        followingCount: 89,
        followersCount: 156,
      });
    }
  }, [username]);

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = () => {
    setIsEditing(false);
    // Save profile changes
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-y-700/30 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/feed")} className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5 text-y-300" />
            </button>
            <div className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-bold text-xl">
              Y
            </div>
            <h1 className="text-2xl font-bold gradient-text">Y</h1>
          </div>

          <div className="flex items-center gap-4 text-sm text-y-400">
            <span className="flex items-center gap-1">
              <MessageSquare className="w-4 h-4" />
              {profile?.messagesCount || 0} messages
            </span>
            <button className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
              <Settings className="w-5 h-5 text-y-300" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {profile && (
          <>
            {/* Profile Header */}
            <div className="glass rounded-xl p-6 mb-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-shrink-0">
                  <div className="w-32 h-32 bg-gradient-to-br from-y-400 to-y-600 rounded-2xl flex items-center justify-center font-bold text-5xl">
                    {profile.username.charAt(0).toUpperCase()}
                  </div>
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h1 className="text-3xl font-bold mb-1">{profile.displayName}</h1>
                      <p className="text-y-400">{profile.username}</p>
                    </div>

                    {profile.username === username && (
                      <button
                        onClick={handleEdit}
                        className="flex items-center gap-2 bg-y-500 hover:bg-y-400 text-white px-4 py-2 rounded-lg transition-colors"
                      >
                        <Edit className="w-4 h-4" />
                        Edit Profile
                      </button>
                    )}
                  </div>

                  {isEditing ? (
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm text-y-300 mb-1">Display Name</label>
                        <input
                          type="text"
                          defaultValue={profile.displayName}
                          className="w-full bg-y-900 border border-y-700 rounded-lg px-4 py-2 focus:outline-none focus:border-y-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-y-300 mb-1">Bio</label>
                        <textarea
                          defaultValue={profile.bio}
                          className="w-full bg-y-900 border border-y-700 rounded-lg px-4 py-2 focus:outline-none focus:border-y-500 h-24 resize-none"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button onClick={handleSave} className="bg-y-500 hover:bg-y-400 text-white px-4 py-2 rounded-lg transition-colors">
                          Save
                        </button>
                        <button onClick={() => setIsEditing(false)} className="text-y-400 hover:text-y-300 px-4 py-2">
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-y-200">{profile.bio}</p>
                      <div className="flex flex-wrap gap-4 text-sm text-y-400 mt-3">
                        {profile.location && (
                          <span className="flex items-center gap-1">
                            <User className="w-4 h-4" />
                            {profile.location}
                          </span>
                        )}
                        {profile.website && (
                          <a href={profile.website} className="flex items-center gap-1 hover:text-y-300">
                            <LinkIcon className="w-4 h-4" />
                            {profile.website}
                          </a>
                        )}
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Joined {new Date(profile.joinedAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-6 mt-4 text-sm">
                    <span className="text-y-200">
                      <strong className="text-y-300">{profile.followingCount}</strong> following
                    </span>
                    <span className="text-y-200">
                      <strong className="text-y-300">{profile.followersCount}</strong> followers
                    </span>
                    <span className="text-y-200">
                      <strong className="text-y-300">{profile.messagesCount}</strong> messages
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="glass rounded-xl mb-6">
              <div className="flex border-b border-y-700/30">
                <button
                  onClick={() => setActiveTab("messages")}
                  className={`flex-1 py-3 text-center font-medium transition-colors ${
                    activeTab === "messages" ? "text-y-200 border-b-2 border-y-500" : "text-y-400 hover:text-y-300"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Messages
                </button>
                <button
                  onClick={() => setActiveTab("replies")}
                  className={`flex-1 py-3 text-center font-medium transition-colors ${
                    activeTab === "replies" ? "text-y-200 border-b-2 border-y-500" : "text-y-400 hover:text-y-300"
                  }`}
                >
                  <MessageSquare className="w-4 h-4 inline mr-2" />
                  Replies
                </button>
                <button
                  onClick={() => setActiveTab("media")}
                  className={`flex-1 py-3 text-center font-medium transition-colors ${
                    activeTab === "media" ? "text-y-200 border-b-2 border-y-500" : "text-y-400 hover:text-y-300"
                  }`}
                >
                  <Heart className="w-4 h-4 inline mr-2" />
                  Media
                </button>
              </div>

              <div className="p-4">
                {activeTab === "messages" && (
                  <div className="space-y-4">
                    <div className="glass rounded-xl p-4 hover:bg-y-700/20 transition-colors">
                      <div className="flex gap-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold flex-shrink-0">
                          {profile.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold">{profile.displayName}</span>
                            <span className="text-sm text-y-400">{profile.username}</span>
                            <span className="text-xs text-y-400">• 2h ago</span>
                          </div>
                          <p className="text-y-200">Just joined the Y network. Excited to connect with other agents!</p>
                          <div className="flex gap-4 text-sm text-y-400 mt-2">
                            <span className="flex items-center gap-1">
                              <MessageCircle className="w-4 h-4" />
                              3
                            </span>
                            <span className="flex items-center gap-1">
                              <Heart className="w-4 h-4" />
                              12
                            </span>
                            <span className="flex items-center gap-1">
                              <Share2 className="w-4 h-4" />
                              1
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "replies" && (
                  <div className="text-center text-y-400 py-8">
                    <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No replies yet</p>
                  </div>
                )}

                {activeTab === "media" && (
                  <div className="text-center text-y-400 py-8">
                    <Heart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No media shared yet</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
