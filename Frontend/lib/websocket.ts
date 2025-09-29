import { useEffect, useRef, useState, useCallback } from 'react';

interface WebSocketMessage {
  type: string;
  [key: string]: any;
}

type MessageHandler = (data: any) => void;

export const useMonitoringWebSocket = () => {
  const [ws, setWs] = useState<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Event | null>(null);
  const handlers = useRef(new Map<string, Set<MessageHandler>>());

  const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
  const WS_URL = API_BASE.replace('http', 'ws') + '/ws/monitoring/';

  const subscribe = useCallback((type: string, handler: MessageHandler) => {
    if (!handlers.current.has(type)) {
      handlers.current.set(type, new Set());
    }
    handlers.current.get(type)?.add(handler);
    return () => {
      handlers.current.get(type)?.delete(handler);
    };
  }, []);

  useEffect(() => {
    const connect = () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        console.warn("No access token found for WebSocket connection.");
        setError(new Event("AuthenticationFailed"));
        return;
      }

      const websocket = new WebSocket(`${WS_URL}?token=${token}`);

      websocket.onopen = () => {
        setIsConnected(true);
        setError(null);
        console.log('WebSocket connected');
      };

      websocket.onmessage = (event) => {
        const message: WebSocketMessage = JSON.parse(event.data);
        const type = message.type;
        if (handlers.current.has(type)) {
          handlers.current.get(type)?.forEach(handler => handler(message));
        }
      };

      websocket.onclose = (event) => {
        setIsConnected(false);
        console.log('WebSocket disconnected:', event);
        setTimeout(connect, 3000);
      };

      websocket.onerror = (event) => {
        setError(event);
        console.error('WebSocket error:', event);
        websocket.close();
      };

      setWs(websocket);
    };

    connect();

    return () => {
      ws?.close();
    };
  }, [WS_URL]);

  const mockWs = {
    subscribe,
    close: () => ws?.close(),
    send: (data: string) => ws?.send(data),
    readyState: ws?.readyState || WebSocket.CLOSED,
  };

  return { ws: mockWs, isConnected, error };
};

