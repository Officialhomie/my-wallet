'use client';

// Client component to initialize WebSocket connection
import { useSocket } from '@/hooks/useSocket';

export function SocketProvider({ children }: { children: React.ReactNode }) {
  useSocket();
  return <>{children}</>;
}

