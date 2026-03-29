// Agent types
export type AgentRole = {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  tools: string[];
};

export type AgentStatus = 'idle' | 'thinking' | 'running' | 'error';

export type AgentState = {
  roleId: string;
  status: AgentStatus;
  currentTask?: string;
  lastActivity?: Date;
};

// Task types
export type PermissionMode = 'strict' | 'standard' | 'trusted';

export type TaskStatus = 'pending' | 'running' | 'completed' | 'failed' | 'paused';

export type Task = {
  id: string;
  title: string;
  description: string;
  templateId: string;
  permissionMode: PermissionMode;
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  workspacePath: string;
};

// Message types for agent communication
export type ChatMessage = {
  id: string;
  taskId: string;
  agentId: string;
  agentName: string;
  content: string;
  timestamp: Date;
  type: 'thinking' | 'speaking' | 'tool_use' | 'tool_result' | 'error';
};

// Template types
export type ScenarioTemplate = {
  id: string;
  name: string;
  description: string;
  roles: AgentRole[];
  flow: string[]; // Role IDs in execution order
};

// Config types
export type AppConfig = {
  templates: ScenarioTemplate[];
  customRoles: AgentRole[];
  defaultPermissionMode: PermissionMode;
  storageLimits: {
    maxConversationLogSize: number; // bytes
    maxTaskHistory: number;
    maxTotalStorage: number; // bytes
  };
};

// WebSocket message types
export type WSMessage =
  | { type: 'agent_status'; data: AgentState }
  | { type: 'chat_message'; data: ChatMessage }
  | { type: 'task_status'; data: { taskId: string; status: TaskStatus } }
  | { type: 'error'; data: { message: string } };