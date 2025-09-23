import { useEffect, useRef, useState } from 'react';

interface UseWebSocketOptions {
  onMessage?: (data: any) => void;
  onError?: (error: Event) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  enabled?: boolean;
}

export function useWebSocket(url: string, options: UseWebSocketOptions = {}) {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const {
    onMessage,
    onError,
    reconnectInterval = 5000,
    maxReconnectAttempts = 3,
    enabled = true
  } = options;

  const connect = () => {
    if (!enabled) return;

    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        return;
      }

      // Allow WebSocket in all modes but handle gracefully
      if (process.env.NODE_ENV === 'development') {
        console.log('WebSocket enabled in development mode');
      }

      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}${url}`;

      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        setError(null);
        reconnectAttemptsRef.current = 0;
        console.log('WebSocket connected');
      };

      wsRef.current.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          onMessage?.(data);
        } catch (e) {
          console.warn('Failed to parse WebSocket message:', e);
        }
      };

      wsRef.current.onerror = (event) => {
        setError('WebSocket connection error');
        onError?.(event);
        console.warn('WebSocket error:', event);
      };

      wsRef.current.onclose = (event) => {
        setIsConnected(false);
        console.log('WebSocket closed:', event.code, event.reason);

        if (enabled && reconnectAttemptsRef.current < maxReconnectAttempts && event.code !== 1000) {
          reconnectAttemptsRef.current++;
          reconnectTimeoutRef.current = setTimeout(() => {
            connect();
          }, reconnectInterval);
        }
      };
    } catch (err) {
      setError('Failed to create WebSocket connection');
      console.warn('WebSocket connection error:', err);
    }
  };

  const disconnect = () => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }

    if (wsRef.current) {
      wsRef.current.close(1000, 'Component unmounted');
      wsRef.current = null;
    }

    setIsConnected(false);
  };

  const sendMessage = (message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      try {
        wsRef.current.send(JSON.stringify(message));
      } catch (err) {
        console.warn('Failed to send WebSocket message:', err);
      }
    }
  };

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      disconnect();
    };
  }, [url, enabled]);

  return {
    isConnected,
    error,
    sendMessage,
    disconnect,
    reconnect: connect
  };
}