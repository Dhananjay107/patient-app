"use client";

import { io, Socket } from "socket.io-client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:4000";

let socket: Socket | null = null;

export function initializeSocket(token: string): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(API_BASE, {
    transports: ["websocket", "polling"],
    auth: {
      token,
    },
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5,
    timeout: 20000, // Increased to 20 seconds
    autoConnect: true,
    // Suppress timeout errors in console
    forceNew: false,
  });

  socket.on("connect", () => {
    console.log("Socket.IO connected successfully");
  });

  socket.on("connect_error", (error) => {
    // Suppress timeout and connection errors silently when backend is not available
    // Only log unexpected errors
    const errorMessage = error.message || String(error);
    const isTimeout = errorMessage.includes("timeout") || errorMessage.includes("xhr poll error");
    const isNetworkError = errorMessage.includes("websocket error") || 
                          errorMessage.includes("NetworkError") ||
                          errorMessage.includes("Failed to fetch");
    
    if (!isTimeout && !isNetworkError) {
      console.error("Socket.IO connection error:", error);
    }
    // Silently handle timeout/network errors - backend may not be running
  });

  socket.on("disconnect", (reason) => {
    // Only log disconnects if it's not a normal close
    if (reason !== "io client disconnect") {
      console.log("Socket.IO disconnected:", reason);
    }
  });

  // Handle timeout errors specifically
  socket.on("error", (error) => {
    const errorMessage = error.message || String(error);
    if (!errorMessage.includes("timeout") && !errorMessage.includes("xhr poll error")) {
      console.error("Socket.IO error:", error);
    }
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export function getSocket(): Socket | null {
  return socket;
}

// Event listeners helper
export function onSocketEvent(event: string, callback: (data: any) => void) {
  if (socket) {
    socket.on(event, callback);
  }
}

export function offSocketEvent(event: string, callback?: (data: any) => void) {
  if (socket) {
    if (callback) {
      socket.off(event, callback);
    } else {
      socket.off(event);
    }
  }
}


