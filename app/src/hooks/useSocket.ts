// React hook for WebSocket connection management

import { useEffect } from 'react';
import { initializeSocket, disconnectSocket, isSocketConnected } from '@/lib/socket';

/**
 * Hook to initialize and manage WebSocket connection
 * Call this in your root layout or main app component
 */
export function useSocket() {
  useEffect(() => {
    // Initialize socket connection when component mounts
    if (!isSocketConnected()) {
      console.log('🔌 Initializing WebSocket connection...');
      initializeSocket();
    }

    // Cleanup: disconnect when component unmounts
    return () => {
      console.log('🔌 Cleaning up WebSocket connection...');
      // Don't disconnect on unmount - keep connection alive for navigation
      // disconnectSocket();
    };
  }, []);
}

