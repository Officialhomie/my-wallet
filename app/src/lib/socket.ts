// WebSocket Client for Real-time Simulation Updates

import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

let socket: Socket | null = null;

// Simulation event handlers type
export interface SimulationEventHandlers {
  onComplete?: (data: { simulationId: string; results: any }) => void;
  onError?: (data: { simulationId: string; error: string }) => void;
  onProgress?: (data: { simulationId: string; progress: any }) => void;
  onTransactionUpdate?: (data: { simulationId: string; transaction: any }) => void;
}

let eventHandlers: SimulationEventHandlers = {};

/**
 * Initialize WebSocket connection
 */
export function initializeSocket(): Socket {
  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: 5,
    reconnectionDelay: 1000,
  });

  socket.on('connect', () => {
    console.log('🔌 WebSocket connected:', socket?.id);
  });

  socket.on('disconnect', (reason) => {
    console.log('🔌 WebSocket disconnected:', reason);
  });

  socket.on('connect_error', (error) => {
    console.error('🔌 WebSocket connection error:', error.message);
  });

  // Handle simulation events
  socket.on('simulation:complete', (data) => {
    console.log('✅ Simulation completed:', data.simulationId);
    eventHandlers.onComplete?.(data);
  });

  socket.on('simulation:error', (data) => {
    console.error('❌ Simulation error:', data.simulationId, data.error);
    eventHandlers.onError?.(data);
  });

  socket.on('simulation:progress', (data) => {
    console.log('📊 Simulation progress:', data.simulationId, data.progress);
    eventHandlers.onProgress?.(data);
  });

  socket.on('simulation:transaction', (data) => {
    console.log('💰 Transaction update:', data.simulationId, data.transaction);
    eventHandlers.onTransactionUpdate?.(data);
  });

  return socket;
}

/**
 * Get the socket instance (initializes if needed)
 */
export function getSocket(): Socket {
  if (!socket) {
    return initializeSocket();
  }
  return socket;
}

/**
 * Set event handlers for simulation events
 */
export function setSimulationEventHandlers(handlers: SimulationEventHandlers) {
  eventHandlers = { ...eventHandlers, ...handlers };
}

/**
 * Subscribe to a specific simulation's updates
 */
export function subscribeToSimulation(simulationId: string) {
  const sock = getSocket();
  sock.emit('subscribe_simulation', simulationId);
  console.log(`📡 Subscribed to simulation: ${simulationId}`);
}

/**
 * Unsubscribe from a simulation's updates
 */
export function unsubscribeFromSimulation(simulationId: string) {
  const sock = getSocket();
  sock.emit('unsubscribe_simulation', simulationId);
  console.log(`📡 Unsubscribed from simulation: ${simulationId}`);
}

/**
 * Disconnect WebSocket
 */
export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/**
 * Check if socket is connected
 */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

