import { io, Socket } from 'socket.io-client';
import { StoreSubscription } from '../types';

let socket: Socket | null = null;
let currentToken: string | null = null;

export type RealtimeEventCallback = (data: any) => void;

const listeners: Map<string, Set<RealtimeEventCallback>> = new Map();

export function getSocket(): Socket | null {
  return socket;
}

export function isSocketConnected(): boolean {
  return !!socket && socket.connected;
}

export function connectSocket(token: string) {
  if (!token) return;

  // Prevent duplicate connections with same token if already connected/connecting
  if (socket && currentToken === token && (socket.connected || socket.active)) {
    return socket;
  }

  // Disconnect previous socket if token changed
  if (socket) {
    socket.disconnect();
    socket = null;
  }

  currentToken = token;

  const url = window.location.origin;

  socket = io(url, {
    auth: { token },
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
    timeout: 10000,
  });

  socket.on('connect', () => {
    console.log('[Socket Client] Connected to ShopPOS server. Socket ID:', socket?.id);
    notifyListeners('connect', { connected: true, id: socket?.id });
  });

  socket.on('disconnect', (reason) => {
    console.log('[Socket Client] Disconnected from ShopPOS server:', reason);
    notifyListeners('disconnect', { reason });
  });

  socket.on('connect_error', (err) => {
    console.warn('[Socket Client] Connection error:', err.message);
    notifyListeners('connect_error', { error: err.message });
  });

  // Built-in handlers for Realtime SaaS events
  socket.on('ACCOUNT_SUSPENDED', (data) => {
    console.warn('[Realtime SaaS] ACCOUNT_SUSPENDED event received:', data);
    notifyListeners('ACCOUNT_SUSPENDED', data);
  });

  socket.on('ACCOUNT_ACTIVATED', (data) => {
    console.log('[Realtime SaaS] ACCOUNT_ACTIVATED event received:', data);
    notifyListeners('ACCOUNT_ACTIVATED', data);
  });

  socket.on('PAYMENT_APPROVED', (data: { paymentId: string; subscription: StoreSubscription; message?: string }) => {
    console.log('[Realtime SaaS] PAYMENT_APPROVED event received:', data);
    notifyListeners('PAYMENT_APPROVED', data);
  });

  socket.on('SUBSCRIPTION_ACTIVATED', (data: { subscription: StoreSubscription }) => {
    console.log('[Realtime SaaS] SUBSCRIPTION_ACTIVATED event received:', data);
    notifyListeners('SUBSCRIPTION_ACTIVATED', data);
  });

  socket.on('SUBSCRIPTION_UPDATED', (data: { subscription: StoreSubscription }) => {
    console.log('[Realtime SaaS] SUBSCRIPTION_UPDATED event received:', data);
    notifyListeners('SUBSCRIPTION_UPDATED', data);
  });

  socket.on('SUBSCRIPTION_EXPIRED', (data) => {
    console.warn('[Realtime SaaS] SUBSCRIPTION_EXPIRED event received:', data);
    notifyListeners('SUBSCRIPTION_EXPIRED', data);
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
    currentToken = null;
    console.log('[Socket Client] Disconnected & cleared socket instance.');
  }
}

export function subscribeToRealtimeEvent(event: string, callback: RealtimeEventCallback): () => void {
  if (!listeners.has(event)) {
    listeners.set(event, new Set());
  }
  listeners.get(event)!.add(callback);

  // Return unsubscribe cleanup function
  return () => {
    const eventListeners = listeners.get(event);
    if (eventListeners) {
      eventListeners.delete(callback);
      if (eventListeners.size === 0) {
        listeners.delete(event);
      }
    }
  };
}

function notifyListeners(event: string, data: any) {
  const eventListeners = listeners.get(event);
  if (eventListeners) {
    eventListeners.forEach((cb) => {
      try {
        cb(data);
      } catch (err) {
        console.error(`[Socket Client] Error in listener for "${event}":`, err);
      }
    });
  }
}
