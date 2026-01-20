import { useState, useEffect, useCallback, useRef } from 'react';

export interface WebSocketMessage {
    type: 'connected' | 'state_update' | 'ai_decision' | 'alert' | 'kpi_update' | 'hurdle_response';
    timestamp: string;
    data: Record<string, unknown>;
}

interface UseWebSocketReturn {
    isConnected: boolean;
    lastMessage: WebSocketMessage | null;
    connectionError: string | null;
    reconnect: () => void;
}

const WS_URL = 'ws://127.0.0.1:8000/ws';
const RECONNECT_DELAY = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Custom hook for WebSocket connection to the AI-Native Broadcast Platform
 * 
 * Provides real-time updates from the backend including:
 * - System state changes
 * - AI decision notifications
 * - Alert broadcasts
 * - KPI metric updates
 */
export function useWebSocket(): UseWebSocketReturn {
    const [isConnected, setIsConnected] = useState(false);
    const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
    const [connectionError, setConnectionError] = useState<string | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const reconnectAttemptsRef = useRef(0);
    const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const connect = useCallback(() => {
        // Clean up existing connection
        if (wsRef.current) {
            wsRef.current.close();
        }

        try {
            const ws = new WebSocket(WS_URL);
            wsRef.current = ws;

            ws.onopen = () => {
                console.log('🔗 WebSocket connected');
                setIsConnected(true);
                setConnectionError(null);
                reconnectAttemptsRef.current = 0;
            };

            ws.onmessage = (event) => {
                try {
                    const message: WebSocketMessage = JSON.parse(event.data);
                    setLastMessage(message);

                    // Log specific message types for debugging
                    if (message.type === 'alert') {
                        console.log('🚨 Alert:', message.data);
                    } else if (message.type === 'ai_decision') {
                        console.log('🧠 AI Decision:', message.data);
                    }
                } catch (e) {
                    console.error('Failed to parse WebSocket message:', e);
                }
            };

            ws.onerror = (error) => {
                console.error('WebSocket error:', error);
                setConnectionError('Connection error');
            };

            ws.onclose = (event) => {
                console.log('🔌 WebSocket disconnected:', event.code, event.reason);
                setIsConnected(false);
                wsRef.current = null;

                // Attempt reconnection if not a clean close
                if (event.code !== 1000 && reconnectAttemptsRef.current < MAX_RECONNECT_ATTEMPTS) {
                    reconnectAttemptsRef.current += 1;
                    console.log(`Reconnecting... (attempt ${reconnectAttemptsRef.current}/${MAX_RECONNECT_ATTEMPTS})`);

                    reconnectTimeoutRef.current = setTimeout(() => {
                        connect();
                    }, RECONNECT_DELAY);
                } else if (reconnectAttemptsRef.current >= MAX_RECONNECT_ATTEMPTS) {
                    setConnectionError('Max reconnection attempts reached');
                }
            };
        } catch (e) {
            console.error('Failed to create WebSocket:', e);
            setConnectionError('Failed to connect');
        }
    }, []);

    const reconnect = useCallback(() => {
        reconnectAttemptsRef.current = 0;
        setConnectionError(null);
        connect();
    }, [connect]);

    useEffect(() => {
        connect();

        return () => {
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
            if (wsRef.current) {
                wsRef.current.close(1000, 'Component unmounting');
            }
        };
    }, [connect]);

    return {
        isConnected,
        lastMessage,
        connectionError,
        reconnect
    };
}

/**
 * Hook to subscribe to specific WebSocket message types
 */
export function useWebSocketSubscription<T = unknown>(
    messageType: WebSocketMessage['type'],
    onMessage: (data: T) => void
) {
    const { lastMessage, isConnected } = useWebSocket();
    const callbackRef = useRef(onMessage);
    callbackRef.current = onMessage;

    useEffect(() => {
        if (lastMessage && lastMessage.type === messageType) {
            callbackRef.current(lastMessage.data as T);
        }
    }, [lastMessage, messageType]);

    return { isConnected };
}
