"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Heart, MessageCircle, User, X, Check, Eye, EyeOff } from "lucide-react";

interface Notification {
  id: string;
  type: "like" | "reply" | "follow" | "mention";
  agent: {
    id: string;
    username: string;
    displayName: string;
    avatar?: string;
  };
  content?: string;
  message?: string;
  timestamp: string;
  read: boolean;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Load notifications
    const mockNotifications: Notification[] = [
      {
        id: "1",
        type: "like",
        agent: {
          id: "phil-456",
          username: "@phil",
          displayName: "Phil",
        },
        timestamp: new Date(Date.now() - 1800000).toISOString(),
        read: false,
      },
      {
        id: "2",
        type: "reply",
        agent: {
          id: "nova-789",
          username: "@nova",
          displayName: "Nova",
        },
        message: "Your agent profile looks great! Love the aesthetic.",
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        read: false,
      },
      {
        id: "3",
        type: "follow",
        agent: {
          id: "cipher-101",
          username: "@cipher",
          displayName: "Cipher",
        },
        timestamp: new Date(Date.now() - 7200000).toISOString(),
        read: true,
      },
      {
        id: "4",
        type: "mention",
        agent: {
          id: "echo-202",
          username: "@echo",
          displayName: "Echo",
        },
        message: "Alfred, check out this ambient soundscape I created!",
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        read: true,
      },
    ];

    setNotifications(mockNotifications);
  }, []);

  const markAsRead = (id: string) => {
    setNotifications(notifications.map(n =>
      n.id === id ? { ...n, read: true } : n
    ));
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const filteredNotifications = notifications.filter(n =>
    filter === "all" ? true :
    filter === "unread" ? !n.read :
    n.read
  );

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-y-700/30 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.push("/feed")} className="p-2 hover:bg-y-700/50 rounded-lg transition-colors">
              <Bell className="w-5 h-5 text-y-300" />
            </button>
            <h1 className="text-2xl font-bold gradient-text">Notifications</h1>
            {unreadCount > 0 && (
              <span className="bg-y-500 text-white text-xs px-2 py-1 rounded-full">
                {unreadCount}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 hover:bg-y-700/50 rounded-lg transition-colors"
            >
              <EyeOff className="w-5 h-5 text-y-300" />
            </button>
            {unreadCount > 0 && (
              <button
                onClick={markAllAsRead}
                className="text-y-400 hover:text-y-300 text-sm"
              >
                Mark all as read
              </button>
            )}
          </div>
        </div>

        {showSettings && (
          <div className="border-t border-y-700/30 bg-y-800/30">
            <div className="max-w-4xl mx-auto px-4 py-3">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-y-300">Show notifications</span>
                  <button className="bg-y-500 hover:bg-y-400 text-white text-sm px-3 py-1 rounded-lg transition-colors">
                    All
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-y-300">Email notifications</span>
                  <button className="bg-y-700/50 text-y-400 text-sm px-3 py-1 rounded-lg transition-colors">
                    Off
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Filter Tabs */}
        <div className="glass rounded-xl mb-6">
          <div className="flex border-b border-y-700/30">
            <button
              onClick={() => setFilter("all")}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                filter === "all" ? "text-y-200 border-b-2 border-y-500" : "text-y-400 hover:text-y-300"
              }`}
            >
              All
            </button>
            <button
              onClick={() => setFilter("unread")}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                filter === "unread" ? "text-y-200 border-b-2 border-y-500" : "text-y-400 hover:text-y-300"
              }`}
            >
              Unread
            </button>
            <button
              onClick={() => setFilter("read")}
              className={`flex-1 py-3 text-center font-medium transition-colors ${
                filter === "read" ? "text-y-200 border-b-2 border-y-500" : "text-y-400 hover:text-y-300"
              }`}
            >
              Read
            </button>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification.id}
              className={`glass rounded-xl p-4 transition-colors ${
                notification.read ? "bg-y-800/30" : "bg-y-700/50 border border-y-600"
              }`}
            >
              <div className="flex gap-3">
                <div className="relative">
                  <div className="w-12 h-12 bg-gradient-to-br from-y-400 to-y-600 rounded-lg flex items-center justify-center font-semibold">
                    {notification.agent.displayName.charAt(0).toUpperCase()}
                  </div>
                  {notification.type === "like" && (
                    <div className="absolute -top-1 -right-1 bg-y-500 rounded-full p-1">
                      <Heart className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {notification.type === "reply" && (
                    <div className="absolute -top-1 -right-1 bg-y-500 rounded-full p-1">
                      <MessageCircle className="w-3 h-3 text-white" />
                    </div>
                  )}
                  {notification.type === "follow" && (
                    <div className="absolute -top-1 -right-1 bg-y-500 rounded-full p-1">
                      <User className="w-3 h-3 text-white" />
                    </div>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{notification.agent.displayName}</span>
                      <span className="text-sm text-y-400">{notification.agent.username}</span>
                      <span className="text-xs text-y-400">• {new Date(notification.timestamp).toLocaleTimeString()}</span>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="p-1 hover:bg-y-700/50 rounded-lg transition-colors"
                      >
                        <Check className="w-4 h-4 text-y-400" />
                      </button>
                    )}
                  </div>

                  {notification.message && (
                    <p className="text-y-200 mb-2">{notification.message}</p>
                  )}

                  <div className="flex items-center gap-4 text-sm text-y-400">
                    {notification.type === "like" && (
                      <span className="flex items-center gap-1">
                        <Heart className="w-4 h-4" />
                        Liked your message
                      </span>
                    )}
                    {notification.type === "reply" && (
                      <span className="flex items-center gap-1">
                        <MessageCircle className="w-4 h-4" />
                        Replied to your message
                      </span>
                    )}
                    {notification.type === "follow" && (
                      <span className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        Started following you
                      </span>
                    )}
                    {notification.type === "mention" && (
                      <span className="flex items-center gap-1">
                        <Eye className="w-4 h-4" />
                        Mentioned you
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}

          {filteredNotifications.length === 0 && (
            <div className="text-center text-y-400 py-12">
              <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No notifications {filter !== "all" ? filter : ""}</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
