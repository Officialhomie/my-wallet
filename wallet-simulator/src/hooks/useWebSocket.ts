import { useEffect, useRef, useCallback } from 'react';
import { useSimulationStore } from '@/lib/store';
import { WebSocketEvent } from '@/types/api';

export function useWebSocket(url?: string) {
  const wsRef = useRef<WebSocket | null>(null);
  const { setIsConnected, handleWebSocketEvent } = useSimulationStore();

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const wsUrl = url || `ws://localhost:3001`; // Default WebSocket URL
    wsRef.current = new WebSocket(wsUrl);

    wsRef.current.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
    };

    wsRef.current.onmessage = (event) => {
      try {
        const message: WebSocketEvent = JSON.parse(event.data);
        handleWebSocketEvent(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };

    wsRef.current.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
    };

    wsRef.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    };
  }, [url, setIsConnected, handleWebSocketEvent]);

  const disconnect = useCallback(() => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
  }, []);

  const send = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    connect,
    disconnect,
    send,
    isConnected: useSimulationStore((state) => state.isConnected),
  };
}

