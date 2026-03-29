import { useState, useEffect, useCallback, useRef } from 'react';

// WebSocket connection hook for real-time updates
export function useWebSocket(url: string = 'ws://localhost:3001') {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<any | null>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Connect to WebSocket server
  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      return; // Already connected
    }

    const ws = new WebSocket(url);

    ws.onopen = () => {
      console.log('WebSocket connected');
      setIsConnected(true);
      wsRef.current = ws;
    };

    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        setLastMessage(message);
        setMessages((prev) => [...prev, message]);

        // Keep only last 100 messages to prevent memory issues
        if (messages.length > 100) {
          setMessages((prev) => prev.slice(-100));
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    };

    ws.onclose = () => {
      console.log('WebSocket disconnected');
      setIsConnected(false);
      wsRef.current = null;

      // Attempt reconnect after 3 seconds
      reconnectTimeoutRef.current = setTimeout(() => {
        connect();
      }, 3000);
    };

    ws.onerror = (error) => {
      console.error('WebSocket error:', error);
      ws.close();
    };

    wsRef.current = ws;
  }, [url]);

  // Disconnect from WebSocket server
  const disconnect = useCallback(() => {
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
    }
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsConnected(false);
  }, []);

  // Send message to WebSocket server
  const sendMessage = useCallback((message: any) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn('WebSocket not connected, cannot send message');
    }
  }, []);

  // Subscribe to specific task updates
  const subscribeToTask = useCallback((taskId: string) => {
    sendMessage({ type: 'subscribe', taskId });
  }, [sendMessage]);

  // Clear messages history
  const clearMessages = useCallback(() => {
    setMessages([]);
    setLastMessage(null);
  }, []);

  // Connect on mount, disconnect on unmount
  useEffect(() => {
    connect();
    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  return {
    isConnected,
    lastMessage,
    messages,
    sendMessage,
    subscribeToTask,
    clearMessages,
    connect,
    disconnect,
  };
}

// Hook for managing chat messages from WebSocket
export function useChatMessages(taskId: string | null) {
  const { isConnected, messages, subscribeToTask, clearMessages } = useWebSocket();
  const [chatMessages, setChatMessages] = useState<any[]>([]);

  // Subscribe to task when taskId changes
  useEffect(() => {
    if (taskId && isConnected) {
      subscribeToTask(taskId);
      clearMessages(); // Clear previous messages
      setChatMessages([]); // Reset chat messages for new task
    }
  }, [taskId, isConnected, subscribeToTask, clearMessages]);

  // Update chat messages when new WebSocket messages arrive
  useEffect(() => {
    const relevantMessages = messages.filter(
      (msg) =>
        msg.type === 'chat_message' &&
        (taskId === null || msg.data.taskId === taskId)
    );

    if (relevantMessages.length > 0) {
      setChatMessages((prev) => [...prev, ...relevantMessages.map((msg) => msg.data)]);
    }
  }, [messages, taskId]);

  return {
    isConnected,
    chatMessages,
  };
}

// Hook for tracking task status updates
export function useTaskStatus(taskId: string | null) {
  const { messages, subscribeToTask } = useWebSocket();
  const [status, setStatus] = useState<string | null>(null);

  // Subscribe to task
  useEffect(() => {
    if (taskId) {
      subscribeToTask(taskId);
    }
  }, [taskId, subscribeToTask]);

  // Update status from WebSocket messages
  useEffect(() => {
    const statusMessage = messages.find(
      (msg) => msg.type === 'task_status' && msg.data.taskId === taskId
    );

    if (statusMessage) {
      setStatus(statusMessage.data.status);
    }
  }, [messages, taskId]);

  return status;
}