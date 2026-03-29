import WebSocket, { WebSocketServer } from 'ws';
import { Server } from 'http';
import { ChatMessage, Task, WSMessage } from '@/types';

// WebSocket message types
export type WSBroadcastMessage = WSMessage | { type: 'agent_status'; data: { taskId: string; status: Task['status'] } };

// WebSocket manager class
export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket>;
  private port: number;

  constructor(port: number = 3001) {
    this.clients = new Set();
    this.port = port;
  }

  // Initialize WebSocket server
  init(server?: Server): void {
    if (server) {
      // Use existing HTTP server
      this.wss = new WebSocketServer({ server });
    } else {
      // Create standalone WebSocket server
      this.wss = new WebSocketServer({ port: this.port });
    }

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('WebSocket client connected');
      this.clients.add(ws);

      // Send welcome message
      this.sendToClient(ws, {
        type: 'connection_established',
        data: { message: 'Connected to Agent Squad WebSocket server' },
      });

      ws.on('message', (data: string) => {
        try {
          const message = JSON.parse(data.toString());
          this.handleClientMessage(ws, message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    console.log(`WebSocket server started on port ${this.port}`);
  }

  // Handle incoming client message
  private handleClientMessage(ws: WebSocket, message: any): void {
    switch (message.type) {
      case 'ping':
        this.sendToClient(ws, { type: 'pong', data: {} });
        break;
      case 'subscribe':
        // Subscribe to specific task updates
        this.sendToClient(ws, {
          type: 'subscription_confirmed',
          data: { taskId: message.taskId },
        });
        break;
      default:
        console.log('Unknown message type:', message.type);
    }
  }

  // Send message to a specific client
  private sendToClient(ws: WebSocket, message: any): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  }

  // Broadcast message to all connected clients
  broadcast(message: WSBroadcastMessage): void {
    const messageStr = JSON.stringify(message);
    this.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      }
    });
  }

  // Broadcast chat message
  broadcastChatMessage(message: ChatMessage): void {
    this.broadcast({ type: 'chat_message', data: message });
  }

  // Broadcast task status update
  broadcastTaskStatus(taskId: string, status: Task['status']): void {
    this.broadcast({ type: 'task_status', data: { taskId, status } });
  }

  // Broadcast agent status update
  broadcastAgentStatus(taskId: string, status: Task['status']): void {
    this.broadcast({ type: 'agent_status', data: { taskId, status } });
  }

  // Broadcast error message
  broadcastError(errorMessage: string): void {
    this.broadcast({ type: 'error', data: { message: errorMessage } });
  }

  // Get connected clients count
  getClientCount(): number {
    return this.clients.size;
  }

  // Close WebSocket server
  close(): void {
    if (this.wss) {
      this.clients.forEach((client) => {
        client.close();
      });
      this.wss.close();
      this.wss = null;
    }
  }
}

// Singleton WebSocket manager
let wsManager: WebSocketManager | null = null;

export function getWebSocketManager(port: number = 3001): WebSocketManager {
  if (!wsManager) {
    wsManager = new WebSocketManager(port);
  }
  return wsManager;
}

// Initialize WebSocket server (called from custom server or startup)
export function initWebSocketServer(port: number = 3001): WebSocketManager {
  const manager = getWebSocketManager(port);
  manager.init();
  return manager;
}

// Create message callback for coordinator agent
export function createWSMessageCallback(taskId: string): (message: ChatMessage) => void {
  const ws = getWebSocketManager();
  return (message: ChatMessage) => {
    ws.broadcastChatMessage(message);
  };
}

// Create status callback for coordinator agent
export function createWSStatusCallback(): (taskId: string, status: Task['status']) => void {
  const ws = getWebSocketManager();
  return (taskId: string, status: Task['status']) => {
    ws.broadcastTaskStatus(taskId, status);
  };
}