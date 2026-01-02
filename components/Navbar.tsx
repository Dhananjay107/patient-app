"use client";

import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import Link from "next/link";
import { NewsIcon, DashboardIcon, MenuIcon } from "./icons";
import { apiGet } from "@/lib/api";
import { getSocket, onSocketEvent, offSocketEvent } from "@/lib/socket";

interface NavbarProps {
  user?: {
    id?: string;
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
  } | null;
  onMenuToggle?: () => void;
}

export default function Navbar({ user, onMenuToggle }: NavbarProps) {
  const router = useRouter();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  const handleLogout = () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      router.replace("/");
    }
  };

  useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      setNotificationCount(0);
      return;
    }

    const fetchNotificationCount = async () => {
      try {
        const notifications = await apiGet<any[]>("/api/notifications/my").catch(() => []);
        const unreadCount = Array.isArray(notifications)
          ? notifications.filter((n) => n.status !== "READ").length
          : 0;
        setNotificationCount(unreadCount);
      } catch (error: any) {
        // Silently handle errors
        setNotificationCount(0);
      }
    };

    fetchNotificationCount();

    // Listen for new notifications
    const socket = getSocket();
    if (socket && user) {
      const handleNewNotification = (data?: any) => {
        // For message:created, check if it's not from current user
        if (data && data.message && user) {
          const userId = user.id || user._id;
          if (userId && data.message.senderId === userId) {
            return; // Don't show notification for own messages
          }
        }
        fetchNotificationCount();
      };

      onSocketEvent("notification:new", handleNewNotification);
      onSocketEvent("appointment:statusUpdated", handleNewNotification);
      onSocketEvent("prescription:created", handleNewNotification);
      onSocketEvent("message:created", handleNewNotification);
      
      return () => {
        offSocketEvent("notification:new", handleNewNotification);
        offSocketEvent("appointment:statusUpdated", handleNewNotification);
        offSocketEvent("prescription:created", handleNewNotification);
        offSocketEvent("message:created", handleNewNotification);
      };
    }
  }, []);

  const getUserInitials = () => {
    if (!user?.name) return "U";
    const names = user.name.split(" ");
    if (names.length >= 2) {
      return `${names[0][0]}${names[1][0]}`.toUpperCase();
    }
    return user.name[0].toUpperCase();
  };

  return (
    <nav className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="px-3 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16">
          {/* Left side - Hamburger menu and Page title */}
          <div className="flex items-center gap-2 sm:gap-4 min-w-0 flex-1">
            {/* Hamburger menu button - visible only on mobile */}
            {onMenuToggle && (
              <button
                onClick={onMenuToggle}
                className="lg:hidden p-2 rounded-lg bg-blue-900 text-white shadow-sm hover:bg-blue-800 transition-colors flex-shrink-0"
                aria-label="Toggle menu"
              >
                <MenuIcon className="w-5 h-5" />
              </button>
            )}
            <h1 className="text-base sm:text-xl font-bold text-gray-900 truncate">
              {user?.name ? `Welcome, ${user.name.split(" ")[0]}` : "Patient Portal"}
            </h1>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0">
            {/* Notifications icon with count */}
            <Link
              href="/news"
              className="relative p-1.5 sm:p-2 rounded-lg text-gray-600 hover:bg-gray-100 hover:text-blue-900 transition-colors"
              aria-label="Notifications"
            >
              <NewsIcon className="w-5 h-5" />
              {notificationCount > 0 && (
                <span className="absolute top-0 right-0 h-4 w-4 sm:h-5 sm:w-5 bg-red-600 text-white text-[10px] sm:text-xs font-bold rounded-full flex items-center justify-center">
                  {notificationCount > 9 ? "9+" : notificationCount}
                </span>
              )}
            </Link>

            {/* User menu */}
            <div className="relative">
              <button
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="flex items-center gap-1.5 sm:gap-3 px-2 sm:px-3 py-1.5 sm:py-2 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-full bg-blue-900 flex items-center justify-center text-white text-xs sm:text-sm font-semibold flex-shrink-0">
                  {getUserInitials()}
                </div>
                <div className="hidden md:block text-left min-w-0">
                  <div className="text-sm font-semibold text-gray-900 leading-[100%] truncate max-w-[120px]">
                    {user?.name || "User"}
                  </div>
                  <div className="text-xs text-gray-500 leading-[100%] truncate max-w-[120px]">
                    {user?.email || ""}
                  </div>
                </div>
                <span className="text-gray-400 hidden sm:inline text-xs">▼</span>
              </button>

              {/* Dropdown menu */}
              {isMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setIsMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 sm:w-64 rounded-lg bg-white border border-gray-200 shadow-lg z-20 max-w-[calc(100vw-2rem)]">
                    <div className="p-4 border-b border-gray-200">
                      <div className="text-sm font-semibold text-gray-900 leading-[100%]">
                        {user?.name || "User"}
                      </div>
                      <div className="text-xs text-gray-500 mt-1 leading-[100%]">
                        {user?.email || ""}
                      </div>
                      {user?.role && (
                        <div className="text-xs text-blue-900 mt-1 font-medium leading-[100%]">
                          {user.role}
                        </div>
                      )}
                    </div>
                    <div className="p-2">
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          router.push("/dashboard");
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                      >
                        <DashboardIcon className="w-4 h-4" />
                        Dashboard
                      </button>
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          router.push("/records");
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-100 transition-colors flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Settings
                      </button>
                      <button
                        onClick={() => {
                          setIsMenuOpen(false);
                          handleLogout();
                        }}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-red-700 hover:bg-red-50 transition-colors mt-2 flex items-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        Logout
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}

