import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { UsersRepo, StoreRepo, StoreSubscription } from './db';

const JWT_SECRET = process.env.JWT_SECRET || 'shoppos_production_jwt_secret_key_884920';

let io: SocketIOServer | null = null;

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
    transports: ['websocket', 'polling'],
  });

  // Socket Authentication Middleware
  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        (socket.handshake.headers.authorization &&
          socket.handshake.headers.authorization.split(' ')[1]) ||
        socket.handshake.query?.token;

      if (!token || typeof token !== 'string') {
        return next(new Error('Authentication required: No bearer token provided'));
      }

      const decoded = jwt.verify(token, JWT_SECRET) as {
        id: string;
        storeId?: string;
        email: string;
      };

      const user = await UsersRepo.findById(decoded.id);
      if (!user) {
        return next(new Error('User account not found'));
      }

      if (user.status === 'suspended') {
        return next(new Error('User account is suspended'));
      }

      const store = await StoreRepo.getStore(user.storeId);
      if (!store) {
        return next(new Error('Store not found'));
      }

      socket.data.user = user;
      socket.data.storeId = user.storeId;
      next();
    } catch (err) {
      next(new Error('Authentication failed: Invalid token'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const storeId = socket.data.storeId;
    const room = `store_${storeId}`;

    // Join only the authenticated user's store room
    socket.join(room);
    console.log(
      `[Socket.IO] Client connected: ${socket.id} (User: ${socket.data.user?.name}, Store: ${storeId}) -> Joined ${room}`
    );

    // Send connection confirmation & initial store sync
    socket.emit('CONNECTED_TO_STORE', {
      storeId,
      room,
      connectedAt: new Date().toISOString(),
    });

    socket.on('disconnect', (reason) => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id} (${reason})`);
    });
  });

  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}

// ---------------- Realtime Emitters (Scoped to Store Room) ----------------
export function emitToStore(storeId: string, event: string, payload?: any) {
  if (!io) return;
  io.to(`store_${storeId}`).emit(event, {
    event,
    storeId,
    timestamp: new Date().toISOString(),
    ...payload,
  });
}

export function emitAccountSuspended(storeId: string, reason?: string) {
  console.log(`[Realtime Event] Emitting ACCOUNT_SUSPENDED to store_${storeId}`);
  emitToStore(storeId, 'ACCOUNT_SUSPENDED', {
    message: reason || 'Your account has been suspended. Please contact support.',
  });
}

export function emitAccountActivated(storeId: string) {
  console.log(`[Realtime Event] Emitting ACCOUNT_ACTIVATED to store_${storeId}`);
  emitToStore(storeId, 'ACCOUNT_ACTIVATED', {
    message: 'Your store account has been activated.',
  });
}

export function emitPaymentApproved(
  storeId: string,
  paymentId: string,
  subscription: StoreSubscription
) {
  console.log(`[Realtime Event] Emitting PAYMENT_APPROVED to store_${storeId}`);
  emitToStore(storeId, 'PAYMENT_APPROVED', {
    paymentId,
    subscription,
    message: 'Subscription payment approved! Your plan has been activated.',
  });
  // Also emit SUBSCRIPTION_ACTIVATED
  emitToStore(storeId, 'SUBSCRIPTION_ACTIVATED', {
    subscription,
  });
}

export function emitSubscriptionUpdated(storeId: string, subscription: StoreSubscription) {
  console.log(`[Realtime Event] Emitting SUBSCRIPTION_UPDATED to store_${storeId}`);
  emitToStore(storeId, 'SUBSCRIPTION_UPDATED', {
    subscription,
  });
}

export function emitSubscriptionExpired(storeId: string) {
  console.log(`[Realtime Event] Emitting SUBSCRIPTION_EXPIRED to store_${storeId}`);
  emitToStore(storeId, 'SUBSCRIPTION_EXPIRED', {
    message: 'Your subscription has expired. Please renew your plan.',
  });
}
