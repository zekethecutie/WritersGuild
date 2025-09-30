import { useEffect, useRef, useState, useCallback } from 'react';
import { useAuth } from './useAuth';

interface WebSocketMessage {
  type: string;
  data?: any;
  conversationId?: string; // Added for typing indicators
  userId?: string; // Added for typing indicators and reactions
  messageId?: string; // Added for reactions
  emoji?: string; // Added for reactions
}

export const useWebSocket = (selectedConversation?: { id: string }, setMessages?: (messages: any[]) => void, setConversations?: (conversations: any[]) => void) => {
  const { user, isAuthenticated } = useAuth();
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any>(null);
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const MAX_RECONNECT_ATTEMPTS = 5;
  const HEARTBEAT_INTERVAL = 30000; // 30 seconds

  const getWebSocketUrl = () => {
    if (typeof window === 'undefined') return '';

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;

    // Always use the current host for WebSocket connection
    return `${protocol}//${host}/ws`;
  };

  const connect = useCallback(() => {
    if (!user?.id || socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING) return;

    const wsUrl = getWebSocketUrl();
    if (!wsUrl) return;

    try {
      console.log('Connecting to WebSocket:', wsUrl);
      const newSocket = new WebSocket(wsUrl);

      newSocket.onopen = () => {
        console.log('WebSocket connected successfully');
        // Send authentication immediately
        if (user?.id) {
          newSocket.send(JSON.stringify({
            type: 'authenticate',
            userId: user.id
          }));
        }
      };

      newSocket.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);

          if (message.type === 'auth_success') {
            setIsConnected(true);
            setConnectionAttempts(0); // Reset attempts on successful connection
            console.log('WebSocket authenticated successfully');

            // Start heartbeat to keep connection alive
            startHeartbeat();
          } else if (message.type === 'pong') {
            // Handle heartbeat response
            console.log('Received heartbeat pong');
          } else {
            setLastMessage(message);
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      newSocket.onclose = (event) => {
        console.log(`WebSocket disconnected: ${event.code} ${event.reason}`);
        setIsConnected(false);

        // Clear heartbeat on close
        if (heartbeatIntervalRef.current) {
          clearInterval(heartbeatIntervalRef.current);
          heartbeatIntervalRef.current = null;
        }

        // Only attempt to reconnect if it's an unexpected close
        if (event.code !== 1000 && event.code !== 1001 && connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
          const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 10000); // Exponential backoff, max 10s
          console.log(`Reconnecting in ${delay}ms (attempt ${connectionAttempts + 1}/${MAX_RECONNECT_ATTEMPTS})`);

          reconnectTimeoutRef.current = setTimeout(() => {
            setConnectionAttempts(prev => prev + 1);
            connect();
          }, delay);
        } else if (connectionAttempts >= MAX_RECONNECT_ATTEMPTS) {
          console.log('Max reconnect attempts reached.');
        }
      };

      newSocket.onerror = (error) => {
        console.error('WebSocket error:', error);
        // The onclose event will handle reconnection logic
      };

      setSocket(newSocket);

    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
      setConnectionAttempts(prev => prev + 1);
      if (connectionAttempts < MAX_RECONNECT_ATTEMPTS) {
        const delay = Math.min(1000 * Math.pow(2, connectionAttempts), 30000);
        reconnectTimeoutRef.current = setTimeout(connect, delay);
      }
    }
  }, [user?.id, connectionAttempts, isAuthenticated]); // Include isAuthenticated to re-evaluate connection on auth status change

  const startHeartbeat = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }

    heartbeatIntervalRef.current = setInterval(() => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: 'ping' }));
      }
    }, HEARTBEAT_INTERVAL);
  }, [socket]);

  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }

    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
      heartbeatIntervalRef.current = null;
    }

    if (socket) {
      socket.close();
      setSocket(null);
    }

    setIsConnected(false);
    setConnectionAttempts(0);
  }, [socket]);

  const sendMessage = useCallback((message: WebSocketMessage) => {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(message));
      return true;
    }
    return false;
  }, [socket]);

  // Connect when user is available and authenticated, disconnect when not
  useEffect(() => {
    if (user?.id && isAuthenticated) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [user?.id, isAuthenticated, connect, disconnect]);

  // Handle WebSocket messages for real-time updates
  useEffect(() => {
    if (lastMessage) {
      console.log('Received WebSocket message:', lastMessage);

      if (lastMessage.type === 'new_message') {
        const messageData = lastMessage.data;
        console.log('Processing new message:', messageData);

        // If this message is for the currently selected conversation, add it to messages
        if (selectedConversation?.id === messageData.conversationId && setMessages) {
          setMessages(prev => {
            const messageExists = prev.some(msg => msg.id === messageData.id);
            if (messageExists) {
              console.log('Message already exists, skipping');
              return prev;
            }
            console.log('Adding message to conversation:', messageData);
            return [...prev, messageData];
          });
        }

        // Always update conversations list to show new message preview
        if (setConversations) {
          setConversations(prev => {
            const updated = prev.map(conv => {
              if (conv.id === messageData.conversationId) {
                return {
                  ...conv,
                  lastMessage: messageData,
                  lastMessageAt: messageData.createdAt
                };
              }
              return conv;
            });
            console.log('Updated conversations:', updated);
            return updated;
          });
        }
      } else if (lastMessage.type === 'message_reaction' && selectedConversation?.id === lastMessage.data.conversationId && setMessages) {
        // Handle emoji reactions
        console.log('Message reaction received:', lastMessage.data);
        setMessages(prev => prev.map(msg => {
          if (msg.id === lastMessage.data.messageId) {
            return {
              ...msg,
              reactions: [...(msg.reactions || []), {
                emoji: lastMessage.data.emoji,
                userId: lastMessage.data.userId
              }]
            };
          }
          return msg;
        }));
      } else if (lastMessage.type === 'typing_indicator') {
        console.log('Typing indicator received:', lastMessage.data);
        // This will be handled by the Messages component
      }
    }
  }, [lastMessage, selectedConversation?.id, setMessages, setConversations])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      disconnect();
    };
  }, [disconnect]);

  return {
    isConnected,
    lastMessage,
    sendMessage,
    connect,
    disconnect
  };
};