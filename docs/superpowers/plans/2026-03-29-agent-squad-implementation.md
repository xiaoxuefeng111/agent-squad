# Agent Squad (龙虾军团) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a local multi-agent collaboration system with Web UI, using Claude Agent SDK for agent communication and coordination.

**Architecture:** Single-process Next.js application. Coordinator Agent dispatches tasks to specialized agents via SDK's subagent mechanism. WebSocket pushes real-time updates to Web UI. SQLite persists tasks and conversation logs.

**Tech Stack:** Next.js 14 + TypeScript + Tailwind CSS + Claude Agent SDK + SQLite + WebSocket

---

## File Structure

```
agent-squad/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── page.tsx                  # Main page
│   │   ├── layout.tsx                # Root layout
│   │   └── api/                      # API routes
│   │       ├── tasks/                # Task CRUD
│   │       │   └── route.ts
│   │       ├── websocket/            # WebSocket endpoint
│   │       │   └── route.ts
│   │       └── agents/               # Agent execution
│   │           └── route.ts
│   ├── components/                   # React components
│   │   ├── layout/                   # Layout components
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── task/                     # Task management
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskCreate.tsx
│   │   │   └── TaskDetail.tsx
│   │   ├── agent/                    # Agent visualization
│   │   │   ├── AgentStatus.tsx
│   │   │   └── ChatPanel.tsx
│   │   └── config/                   # Configuration
│   │       ├── RoleEditor.tsx
│   │       └── StorageManager.tsx
│   ├── lib/                          # Core libraries
│   │   ├── agents/                   # Agent definitions
│   │   │   ├── coordinator.ts        # Coordinator agent
│   │   │   ├── templates/            # Scenario templates
│   │   │   │   ├── software-dev.ts
│   │   │   │   ├── project-mgmt.ts
│   │   │   │   ├── content-creation.ts
│   │   │   │   └── generic.ts
│   │   │   └── types.ts              # Agent types
│   │   ├── storage/                  # Data persistence
│   │   │   ├── database.ts           # SQLite operations
│   │   │   ├── config.ts             # JSON config
│   │   │   └── cleanup.ts            # Storage management
│   │   ├── websocket/                # Real-time communication
│   │   │   └── server.ts
│   │   └── permissions/              # Permission system
│   │       └── handler.ts
│   └── types/                        # TypeScript types
│       └── index.ts
├── data/                             # User data (gitignored)
│   ├── config.json
│   ├── tasks.db
│   └── workspace/
├── public/                           # Static assets
├── package.json
├── tsconfig.json
├── tailwind.config.ts
└── next.config.js
```

---

## Phase 1: Project Foundation

### Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `tailwind.config.ts`
- Create: `next.config.js`
- Create: `.env.local.example`
- Create: `src/app/layout.tsx`
- Create: `src/app/page.tsx`
- Create: `src/types/index.ts`

- [ ] **Step 1: Create Next.js project with TypeScript and Tailwind**

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --no-git
```

Expected: Project initialized successfully

- [ ] **Step 2: Install Claude Agent SDK and dependencies**

```bash
npm install @anthropic-ai/claude-agent-sdk better-sqlite3 ws
npm install -D @types/better-sqlite3 @types/ws
```

Expected: Dependencies installed

- [ ] **Step 3: Create environment file template**

```bash
cat > .env.local.example << 'EOF'
# Claude API Key (required)
ANTHROPIC_API_KEY=your-api-key-here

# WebSocket server port (optional, default: 3001)
WS_PORT=3001
EOF
cp .env.local.example .env.local
```

Expected: Environment template created

- [ ] **Step 4: Create data directory structure**

```bash
mkdir -p data/workspace
echo '{"templates": [], "customRoles": []}' > data/config.json
```

Expected: Data directory created

- [ ] **Step 5: Verify project runs**

```bash
npm run dev
```

Expected: Dev server starts at localhost:3000

- [ ] **Step 6: Commit**

```bash
git add .
git commit -m "feat: initialize Next.js project with Claude Agent SDK"
```

---

### Task 2: Define TypeScript Types

**Files:**
- Create: `src/types/index.ts`

- [ ] **Step 1: Write type definitions**

```typescript
// src/types/index.ts

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
```

Expected: Types defined

- [ ] **Step 2: Commit**

```bash
git add src/types/index.ts
git commit -m "feat: add TypeScript type definitions"
```

---

### Task 3: Setup SQLite Database

**Files:**
- Create: `src/lib/storage/database.ts`

- [ ] **Step 1: Write database module**

```typescript
// src/lib/storage/database.ts
import Database from 'better-sqlite3';
import path from 'path';
import { Task, ChatMessage } from '@/types';

const DB_PATH = path.join(process.cwd(), 'data', 'tasks.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');
    initializeTables(db);
  }
  return db;
}

function initializeTables(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      template_id TEXT NOT NULL,
      permission_mode TEXT NOT NULL DEFAULT 'standard',
      status TEXT NOT NULL DEFAULT 'pending',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      workspace_path TEXT
    );

    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL,
      agent_id TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      content TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      type TEXT NOT NULL,
      FOREIGN KEY (task_id) REFERENCES tasks(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_task_id ON chat_messages(task_id);
    CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
  `);
}

export function createTask(task: Omit<Task, 'createdAt' | 'updatedAt'>): Task {
  const db = getDatabase();
  const stmt = db.prepare(`
    INSERT INTO tasks (id, title, description, template_id, permission_mode, status, workspace_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    task.id,
    task.title,
    task.description,
    task.templateId,
    task.permissionMode,
    task.status,
    task.workspacePath
  );
  return { ...task, createdAt: new Date(), updatedAt: new Date() };
}

export function getTasks(): Task[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as any[];
  return rows.map(row => ({
    id: row.id,
    title: row.title,
    description: row.description,
    templateId: row.template_id,
    permissionMode: row.permission_mode,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    workspacePath: row.workspace_path,
  }));
}

export function getTaskById(id: string): Task | null {
  const db = getDatabase();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    templateId: row.template_id,
    permissionMode: row.permission_mode,
    status: row.status,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    workspacePath: row.workspace_path,
  };
}

export function updateTaskStatus(id: string, status: Task['status']): void {
  const db = getDatabase();
  db.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
}

export function createChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
  const db = getDatabase();
  const id = crypto.randomUUID();
  const stmt = db.prepare(`
    INSERT INTO chat_messages (id, task_id, agent_id, agent_name, content, type)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  stmt.run(id, message.taskId, message.agentId, message.agentName, message.content, message.type);
  return { id, ...message, timestamp: new Date() };
}

export function getChatMessages(taskId: string): ChatMessage[] {
  const db = getDatabase();
  const rows = db.prepare('SELECT * FROM chat_messages WHERE task_id = ? ORDER BY timestamp ASC').all(taskId) as any[];
  return rows.map(row => ({
    id: row.id,
    taskId: row.task_id,
    agentId: row.agent_id,
    agentName: row.agent_name,
    content: row.content,
    type: row.type,
    timestamp: new Date(row.timestamp),
  }));
}

export function getStorageStats(): { totalSize: number; taskCount: number; messageCount: number } {
  const db = getDatabase();
  const taskCount = (db.prepare('SELECT COUNT(*) as count FROM tasks').get() as any).count;
  const messageCount = (db.prepare('SELECT COUNT(*) as count FROM chat_messages').get() as any).count;

  // Calculate database file size
  const fs = require('fs');
  let totalSize = 0;
  try {
    const stats = fs.statSync(DB_PATH);
    totalSize = stats.size;
  } catch {
    // File doesn't exist yet
  }

  return { totalSize, taskCount, messageCount };
}
```

Expected: Database module created

- [ ] **Step 2: Commit**

```bash
git add src/lib/storage/database.ts
git commit -m "feat: add SQLite database module"
```

---

### Task 4: Setup Configuration Management

**Files:**
- Create: `src/lib/storage/config.ts`

- [ ] **Step 1: Write config module**

```typescript
// src/lib/storage/config.ts
import fs from 'fs';
import path from 'path';
import { AppConfig, ScenarioTemplate, AgentRole } from '@/types';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

const DEFAULT_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'software-dev',
    name: '软件开发',
    description: '完整的软件开发流程：需求分析、架构设计、开发、测试、部署',
    roles: [
      {
        id: 'pm',
        name: '产品经理',
        description: '负责需求分析、功能规划、验收标准',
        capabilities: ['文档理解', '需求澄清', '优先级排序'],
        tools: ['Read', 'Glob', 'Grep'],
      },
      {
        id: 'architect',
        name: '架构师',
        description: '负责技术方案设计、接口定义、技术选型',
        capabilities: ['代码结构分析', '方案设计', '风险评估'],
        tools: ['Read', 'Glob', 'Grep'],
      },
      {
        id: 'developer',
        name: '开发者',
        description: '负责编写代码、实现功能、修复bug',
        capabilities: ['代码生成', '文件编辑', '命令执行'],
        tools: ['Read', 'Edit', 'Write', 'Bash', 'Glob', 'Grep'],
      },
      {
        id: 'tester',
        name: '测试工程师',
        description: '负责编写测试、执行验证、问题反馈',
        capabilities: ['测试用例设计', '测试执行', '结果分析'],
        tools: ['Read', 'Bash', 'Glob', 'Grep'],
      },
      {
        id: 'devops',
        name: '运维工程师',
        description: '负责部署配置、环境管理、发布上线',
        capabilities: ['部署脚本', '配置管理', '发布执行'],
        tools: ['Read', 'Edit', 'Write', 'Bash'],
      },
    ],
    flow: ['pm', 'architect', 'developer', 'tester', 'devops'],
  },
  {
    id: 'project-mgmt',
    name: '项目管理（发布流程）',
    description: 'SDK版本发布流程：版本管理、构建、回归测试、验证、发布',
    roles: [
      {
        id: 'version-manager',
        name: '版本管理员',
        description: '负责版本号管理、变更日志、发布计划',
        capabilities: ['版本规划', '文档整理'],
        tools: ['Read', 'Write', 'Glob'],
      },
      {
        id: 'build-engineer',
        name: '构建工程师',
        description: '负责代码打包、SDK构建、依赖管理',
        capabilities: ['命令执行', '文件操作'],
        tools: ['Read', 'Bash', 'Glob'],
      },
      {
        id: 'regression-tester',
        name: '回归测试员',
        description: '负责执行回归测试、问题记录',
        capabilities: ['测试执行', '结果分析'],
        tools: ['Read', 'Bash', 'Glob', 'Grep'],
      },
      {
        id: 'verifier',
        name: '验证专员',
        description: '负责功能验证、兼容性检查',
        capabilities: ['测试验证', '报告输出'],
        tools: ['Read', 'Bash', 'Glob'],
      },
      {
        id: 'release-manager',
        name: '发布专员',
        description: '负责发包上传、发布通知',
        capabilities: ['网络请求', '发布操作'],
        tools: ['Read', 'Bash', 'WebFetch'],
      },
    ],
    flow: ['version-manager', 'build-engineer', 'regression-tester', 'verifier', 'release-manager'],
  },
  {
    id: 'content-creation',
    name: '内容创作',
    description: '内容创作流程：策划、撰稿、编辑、审稿、发布',
    roles: [
      {
        id: 'planner',
        name: '内容策划',
        description: '负责选题规划、内容框架、风格定义',
        capabilities: ['创意构思', '框架设计'],
        tools: ['Read', 'Write'],
      },
      {
        id: 'writer',
        name: '撰稿人',
        description: '负责内容撰写、初稿完成',
        capabilities: ['文字创作', '素材整理'],
        tools: ['Read', 'Write'],
      },
      {
        id: 'editor',
        name: '编辑',
        description: '负责内容润色、结构调整',
        capabilities: ['文字优化', '格式规范'],
        tools: ['Read', 'Edit', 'Write'],
      },
      {
        id: 'reviewer',
        name: '审稿人',
        description: '负责内容审核、质量把关',
        capabilities: ['审核校验', '反馈输出'],
        tools: ['Read', 'Write'],
      },
      {
        id: 'publisher',
        name: '发布专员',
        description: '负责平台发布、推广配置',
        capabilities: ['发布操作', '推广设置'],
        tools: ['Read', 'Bash', 'WebFetch'],
      },
    ],
    flow: ['planner', 'writer', 'editor', 'reviewer', 'publisher'],
  },
  {
    id: 'generic',
    name: '通用任务',
    description: '通用任务流程：规划、执行、验证、汇报',
    roles: [
      {
        id: 'planner',
        name: '规划者',
        description: '负责任务分解、方案设计',
        capabilities: ['任务分析', '方案规划'],
        tools: ['Read', 'Write', 'Glob'],
      },
      {
        id: 'executor',
        name: '执行者',
        description: '负责具体执行、落地实现',
        capabilities: ['按需配置'],
        tools: ['Read', 'Edit', 'Write', 'Bash'],
      },
      {
        id: 'verifier',
        name: '验证者',
        description: '负责结果验证、质量检查',
        capabilities: ['验证检查'],
        tools: ['Read', 'Bash', 'Glob', 'Grep'],
      },
      {
        id: 'reporter',
        name: '汇报者',
        description: '负责结果汇总、报告输出',
        capabilities: ['报告生成'],
        tools: ['Read', 'Write'],
      },
    ],
    flow: ['planner', 'executor', 'verifier', 'reporter'],
  },
];

const DEFAULT_CONFIG: AppConfig = {
  templates: DEFAULT_TEMPLATES,
  customRoles: [],
  defaultPermissionMode: 'standard',
  storageLimits: {
    maxConversationLogSize: 1 * 1024 * 1024 * 1024, // 1GB
    maxTaskHistory: 1000,
    maxTotalStorage: 10 * 1024 * 1024 * 1024, // 10GB
  },
};

export function getConfig(): AppConfig {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const config = JSON.parse(content);
      // Merge with defaults to ensure all fields exist
      return {
        ...DEFAULT_CONFIG,
        ...config,
        storageLimits: { ...DEFAULT_CONFIG.storageLimits, ...config.storageLimits },
      };
    }
  } catch (error) {
    console.error('Error loading config:', error);
  }

  // Create default config if doesn't exist
  saveConfig(DEFAULT_CONFIG);
  return DEFAULT_CONFIG;
}

export function saveConfig(config: AppConfig): void {
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getTemplates(): ScenarioTemplate[] {
  return getConfig().templates;
}

export function getTemplateById(id: string): ScenarioTemplate | undefined {
  return getConfig().templates.find(t => t.id === id);
}

export function addCustomRole(role: AgentRole): void {
  const config = getConfig();
  config.customRoles.push(role);
  saveConfig(config);
}

export function updateCustomRole(id: string, role: AgentRole): void {
  const config = getConfig();
  const index = config.customRoles.findIndex(r => r.id === id);
  if (index >= 0) {
    config.customRoles[index] = role;
    saveConfig(config);
  }
}

export function deleteCustomRole(id: string): void {
  const config = getConfig();
  config.customRoles = config.customRoles.filter(r => r.id !== id);
  saveConfig(config);
}
```

Expected: Config module created

- [ ] **Step 2: Commit**

```bash
git add src/lib/storage/config.ts
git commit -m "feat: add configuration management with default templates"
```

---

## Phase 2: Agent Layer

### Task 5: Implement Coordinator Agent

**Files:**
- Create: `src/lib/agents/types.ts`
- Create: `src/lib/agents/coordinator.ts`

- [ ] **Step 1: Write agent types**

```typescript
// src/lib/agents/types.ts
import { AgentRole, Task, PermissionMode } from '@/types';

export type CoordinatorContext = {
  taskId: string;
  task: Task;
  templateRoles: AgentRole[];
  permissionMode: PermissionMode;
  workspacePath: string;
  onStatusChange: (agentId: string, status: string) => void;
  onMessage: (agentId: string, agentName: string, content: string, type: string) => void;
  onError: (error: Error) => void;
};

export type AgentExecutionResult = {
  success: boolean;
  output: string;
  error?: string;
};
```

Expected: Agent types defined

- [ ] **Step 2: Write coordinator agent module**

```typescript
// src/lib/agents/coordinator.ts
import { query } from '@anthropic-ai/claude-agent-sdk';
import { CoordinatorContext, AgentExecutionResult } from './types';
import { AgentRole } from '@/types';

export async function runCoordinatorAgent(context: CoordinatorContext): Promise<AgentExecutionResult> {
  const { taskId, task, templateRoles, permissionMode, workspacePath, onStatusChange, onMessage, onError } = context;

  try {
    onMessage('coordinator', '协调者', `开始处理任务: ${task.title}`, 'speaking');

    // Build subagent definitions from template roles
    const subagents = buildSubagentDefinitions(templateRoles);

    // Map permission mode to SDK permission mode
    const sdkPermissionMode = mapPermissionMode(permissionMode);

    // Build system prompt for coordinator
    const systemPrompt = buildCoordinatorPrompt(task, templateRoles);

    let result = '';
    let hasError = false;

    onStatusChange('coordinator', 'running');

    for await (const message of query({
      prompt: task.description,
      options: {
        cwd: workspacePath,
        allowedTools: ['Read', 'Glob', 'Grep', 'Agent'],
        permissionMode: sdkPermissionMode,
        systemPrompt,
        agents: subagents,
        maxTurns: 100,
      },
    })) {
      // Handle different message types
      if ('result' in message) {
        result = message.result;
        onMessage('coordinator', '协调者', result, 'speaking');
      } else if (message.type === 'system') {
        // System messages (task_started, task_progress, etc.)
        handleSystemMessage(message, onMessage, onStatusChange);
      }
    }

    onStatusChange('coordinator', 'idle');

    return {
      success: !hasError,
      output: result,
    };
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError(err);
    onStatusChange('coordinator', 'error');
    return {
      success: false,
      output: '',
      error: err.message,
    };
  }
}

function buildSubagentDefinitions(roles: AgentRole[]): Record<string, any> {
  const agents: Record<string, any> = {};

  for (const role of roles) {
    agents[role.id] = {
      description: role.description,
      prompt: buildAgentPrompt(role),
      tools: role.tools,
    };
  }

  return agents;
}

function buildAgentPrompt(role: AgentRole): string {
  return `你是${role.name}。

职责：${role.description}

核心能力：${role.capabilities.join('、')}

请根据你的职责和能力，完成协调者分配给你的任务。完成后请明确说明你的输出结果和建议。`;
}

function buildCoordinatorPrompt(task: Task, roles: AgentRole[]): string {
  const roleDescriptions = roles
    .map(r => `- ${r.name}(${r.id}): ${r.description}`)
    .join('\n');

  return `你是任务协调者，负责协调多个专业Agent完成复杂任务。

当前任务：${task.title}
任务描述：${task.description}

可用的专业Agent：
${roleDescriptions}

你的职责：
1. 分析任务需求，制定执行计划
2. 按照合理的顺序调用专业Agent
3. 收集各Agent的输出，进行整合
4. 处理Agent之间的沟通和协调
5. 在遇到问题时进行协商和回退
6. 最终汇总结果并报告完成状态

执行原则：
- 按需调用Agent，不要过度调用
- 传递清晰的指令给每个Agent
- 收到Agent结果后进行验证
- 遇到错误时尝试协商解决
- 无法解决时明确报告问题

请开始执行任务。`;
}

function mapPermissionMode(mode: string): string {
  switch (mode) {
    case 'strict':
      return 'default';
    case 'standard':
      return 'acceptEdits';
    case 'trusted':
      return 'bypassPermissions';
    default:
      return 'acceptEdits';
  }
}

function handleSystemMessage(
  message: any,
  onMessage: (agentId: string, agentName: string, content: string, type: string) => void,
  onStatusChange: (agentId: string, status: string) => void
): void {
  if (message.subtype === 'task_started') {
    const agentId = message.agent_id || 'unknown';
    onStatusChange(agentId, 'running');
    onMessage(agentId, message.agent_name || agentId, '开始执行任务', 'speaking');
  } else if (message.subtype === 'task_progress') {
    const agentId = message.agent_id || 'unknown';
    onMessage(agentId, message.agent_name || agentId, message.summary || '执行中...', 'thinking');
  } else if (message.subtype === 'task_notification') {
    const agentId = message.agent_id || 'unknown';
    onStatusChange(agentId, 'idle');
  }
}
```

Expected: Coordinator agent module created

- [ ] **Step 3: Commit**

```bash
git add src/lib/agents/
git commit -m "feat: implement coordinator agent with subagent support"
```

---

## Phase 3: API Layer

### Task 6: Implement Task API

**Files:**
- Create: `src/app/api/tasks/route.ts`

- [ ] **Step 1: Write task API endpoints**

```typescript
// src/app/api/tasks/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createTask, getTasks, getTaskById, updateTaskStatus } from '@/lib/storage/database';
import { getTemplates } from '@/lib/storage/config';
import { Task } from '@/types';
import path from 'path';
import fs from 'fs';

// GET /api/tasks - List all tasks
export async function GET() {
  try {
    const tasks = getTasks();
    return NextResponse.json({ tasks });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

// POST /api/tasks - Create a new task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, templateId, permissionMode = 'standard' } = body;

    if (!title || !templateId) {
      return NextResponse.json(
        { error: 'Title and templateId are required' },
        { status: 400 }
      );
    }

    // Validate template exists
    const templates = getTemplates();
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Invalid template ID' },
        { status: 400 }
      );
    }

    // Create workspace directory for this task
    const taskId = crypto.randomUUID();
    const workspacePath = path.join(process.cwd(), 'data', 'workspace', `task-${taskId.slice(0, 8)}`);
    fs.mkdirSync(workspacePath, { recursive: true });

    const task = createTask({
      id: taskId,
      title,
      description: description || '',
      templateId,
      permissionMode,
      status: 'pending',
      workspacePath,
    });

    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}
```

Expected: Task API created

- [ ] **Step 2: Commit**

```bash
git add src/app/api/tasks/route.ts
git commit -m "feat: add task API endpoints"
```

---

### Task 7: Implement WebSocket Server

**Files:**
- Create: `src/lib/websocket/server.ts`

- [ ] **Step 1: Write WebSocket server module**

```typescript
// src/lib/websocket/server.ts
import { WebSocketServer, WebSocket } from 'ws';
import { WSMessage } from '@/types';

let wss: WebSocketServer | null = null;
const clients = new Set<WebSocket>();

export function getWebSocketServer(): WebSocketServer {
  if (!wss) {
    wss = new WebSocketServer({ port: 3001 });
    wss.on('connection', (ws) => {
      clients.add(ws);
      ws.on('close', () => {
        clients.delete(ws);
      });
    });
  }
  return wss;
}

export function broadcast(message: WSMessage): void {
  const data = JSON.stringify(message);
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  }
}

export function broadcastAgentStatus(agentId: string, status: string): void {
  broadcast({
    type: 'agent_status',
    data: { roleId: agentId, status: status as any },
  });
}

export function broadcastChatMessage(
  taskId: string,
  agentId: string,
  agentName: string,
  content: string,
  type: ChatMessage['type']
): void {
  broadcast({
    type: 'chat_message',
    data: {
      id: crypto.randomUUID(),
      taskId,
      agentId,
      agentName,
      content,
      timestamp: new Date(),
      type,
    },
  });
}

export function broadcastTaskStatus(taskId: string, status: string): void {
  broadcast({
    type: 'task_status',
    data: { taskId, status: status as any },
  });
}

// Import for type
import { ChatMessage } from '@/types';
```

Expected: WebSocket server module created

- [ ] **Step 2: Commit**

```bash
git add src/lib/websocket/server.ts
git commit -m "feat: add WebSocket server for real-time updates"
```

---

### Task 8: Implement Agent Execution API

**Files:**
- Create: `src/app/api/agents/execute/route.ts`

- [ ] **Step 1: Write agent execution API**

```typescript
// src/app/api/agents/execute/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, updateTaskStatus, createChatMessage } from '@/lib/storage/database';
import { getTemplateById } from '@/lib/storage/config';
import { runCoordinatorAgent } from '@/lib/agents/coordinator';
import { broadcastAgentStatus, broadcastChatMessage, broadcastTaskStatus } from '@/lib/websocket/server';

// POST /api/agents/execute - Execute a task
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId } = body;

    if (!taskId) {
      return NextResponse.json(
        { error: 'taskId is required' },
        { status: 400 }
      );
    }

    const task = getTaskById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    const template = getTemplateById(task.templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 400 }
      );
    }

    // Update task status
    updateTaskStatus(taskId, 'running');
    broadcastTaskStatus(taskId, 'running');

    // Start async execution
    executeTaskAsync(task, template);

    return NextResponse.json({ message: 'Task execution started' });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to start task execution' },
      { status: 500 }
    );
  }
}

async function executeTaskAsync(task: any, template: any): Promise<void> {
  const taskId = task.id;

  try {
    const result = await runCoordinatorAgent({
      taskId,
      task,
      templateRoles: template.roles,
      permissionMode: task.permissionMode,
      workspacePath: task.workspacePath,
      onStatusChange: (agentId, status) => {
        broadcastAgentStatus(agentId, status);
      },
      onMessage: (agentId, agentName, content, type) => {
        // Save to database
        createChatMessage({
          taskId,
          agentId,
          agentName,
          content,
          type: type as any,
        });
        // Broadcast to clients
        broadcastChatMessage(taskId, agentId, agentName, content, type as any);
      },
      onError: (error) => {
        createChatMessage({
          taskId,
          agentId: 'coordinator',
          agentName: '协调者',
          content: `错误: ${error.message}`,
          type: 'error',
        });
        broadcastChatMessage(taskId, 'coordinator', '协调者', `错误: ${error.message}`, 'error');
      },
    });

    if (result.success) {
      updateTaskStatus(taskId, 'completed');
      broadcastTaskStatus(taskId, 'completed');
    } else {
      updateTaskStatus(taskId, 'failed');
      broadcastTaskStatus(taskId, 'failed');
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    updateTaskStatus(taskId, 'failed');
    broadcastTaskStatus(taskId, 'failed');
    createChatMessage({
      taskId,
      agentId: 'coordinator',
      agentName: '协调者',
      content: `执行失败: ${err.message}`,
      type: 'error',
    });
  }
}
```

Expected: Agent execution API created

- [ ] **Step 2: Commit**

```bash
git add src/app/api/agents/execute/route.ts
git commit -m "feat: add agent execution API"
```

---

## Phase 4: Frontend UI

### Task 9: Implement Layout Components

**Files:**
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/Header.tsx`

- [ ] **Step 1: Write Sidebar component**

```tsx
// src/components/layout/Sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: '任务列表', icon: '📋' },
  { href: '/config', label: '角色配置', icon: '⚙️' },
  { href: '/storage', label: '存储管理', icon: '💾' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-64 bg-gray-900 text-white min-h-screen p-4">
      <div className="mb-8">
        <h1 className="text-xl font-bold">🦐 龙虾军团</h1>
        <p className="text-gray-400 text-sm">多Agent协作系统</p>
      </div>

      <nav className="space-y-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
              pathname === item.href
                ? 'bg-blue-600 text-white'
                : 'text-gray-300 hover:bg-gray-800'
            }`}
          >
            <span>{item.icon}</span>
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}
```

Expected: Sidebar component created

- [ ] **Step 2: Write Header component**

```tsx
// src/components/layout/Header.tsx
'use client';

import { useState } from 'react';

export default function Header() {
  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Agent Squad</h2>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString('zh-CN')}
          </span>
        </div>
      </div>
    </header>
  );
}
```

Expected: Header component created

- [ ] **Step 3: Update root layout**

```tsx
// src/app/layout.tsx
import './globals.css';
import Sidebar from '@/components/layout/Sidebar';
import Header from '@/components/layout/Header';

export const metadata = {
  title: '龙虾军团 - 多Agent协作系统',
  description: '基于Claude Agent SDK的多Agent协作系统',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className="bg-gray-100">
        <div className="flex min-h-screen">
          <Sidebar />
          <div className="flex-1 flex flex-col">
            <Header />
            <main className="flex-1 p-6">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
```

Expected: Layout updated

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/ src/app/layout.tsx
git commit -m "feat: add layout components (Sidebar, Header)"
```

---

### Task 10: Implement Task List Component

**Files:**
- Create: `src/components/task/TaskList.tsx`
- Create: `src/components/task/TaskCreate.tsx`

- [ ] **Step 1: Write TaskList component**

```tsx
// src/components/task/TaskList.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Task } from '@/types';

const statusColors: Record<string, string> = {
  pending: 'bg-gray-100 text-gray-800',
  running: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  paused: 'bg-yellow-100 text-yellow-800',
};

const statusLabels: Record<string, string> = {
  pending: '待执行',
  running: '执行中',
  completed: '已完成',
  failed: '失败',
  paused: '已暂停',
};

export default function TaskList() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTasks();
  }, []);

  async function fetchTasks() {
    try {
      const res = await fetch('/api/tasks');
      const data = await res.json();
      setTasks(data.tasks || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return <div className="text-center py-8">加载中...</div>;
  }

  if (tasks.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        暂无任务，请创建新任务
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {tasks.map((task) => (
        <Link
          key={task.id}
          href={`/task/${task.id}`}
          className="block bg-white rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow border border-gray-200"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-medium text-gray-900">{task.title}</h3>
              <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                {task.description || '无描述'}
              </p>
            </div>
            <span className={`px-2 py-1 rounded text-xs font-medium ${statusColors[task.status]}`}>
              {statusLabels[task.status]}
            </span>
          </div>
          <div className="mt-3 text-xs text-gray-400">
            创建于 {new Date(task.createdAt).toLocaleString('zh-CN')}
          </div>
        </Link>
      ))}
    </div>
  );
}
```

Expected: TaskList component created

- [ ] **Step 2: Write TaskCreate component**

```tsx
// src/components/task/TaskCreate.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ScenarioTemplate, PermissionMode } from '@/types';

export default function TaskCreate() {
  const router = useRouter();
  const [templates, setTemplates] = useState<ScenarioTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('standard');

  useEffect(() => {
    // Fetch templates from config
    fetch('/api/config/templates')
      .then((res) => res.json())
      .then((data) => setTemplates(data.templates || []))
      .catch(console.error);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title || !templateId) return;

    setLoading(true);
    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          templateId,
          permissionMode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        router.push(`/task/${data.task.id}`);
      }
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
      <h2 className="text-lg font-semibold mb-4">创建新任务</h2>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            任务标题 *
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            placeholder="输入任务标题"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            任务描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            rows={4}
            placeholder="详细描述任务需求..."
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            场景模板 *
          </label>
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            required
          >
            <option value="">选择模板...</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name} - {t.description}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            权限策略
          </label>
          <div className="space-y-2">
            {[
              { value: 'strict', label: '严格模式', desc: '每次操作需确认' },
              { value: 'standard', label: '标准模式（推荐）', desc: '预授权范围自动批准' },
              { value: 'trusted', label: '信任模式', desc: '全自动批准' },
            ].map((mode) => (
              <label key={mode.value} className="flex items-start gap-3 cursor-pointer">
                <input
                  type="radio"
                  name="permissionMode"
                  value={mode.value}
                  checked={permissionMode === mode.value}
                  onChange={(e) => setPermissionMode(e.target.value as PermissionMode)}
                  className="mt-1"
                />
                <div>
                  <div className="font-medium">{mode.label}</div>
                  <div className="text-sm text-gray-500">{mode.desc}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={loading || !title || !templateId}
          className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '创建中...' : '创建任务'}
        </button>
      </div>
    </form>
  );
}
```

Expected: TaskCreate component created

- [ ] **Step 3: Commit**

```bash
git add src/components/task/
git commit -m "feat: add task list and create components"
```

---

### Task 11: Implement Chat Panel Component

**Files:**
- Create: `src/components/agent/ChatPanel.tsx`
- Create: `src/components/agent/AgentStatus.tsx`

- [ ] **Step 1: Write ChatPanel component**

```tsx
// src/components/agent/ChatPanel.tsx
'use client';

import { useEffect, useRef, useState } from 'react';
import { ChatMessage } from '@/types';

interface ChatPanelProps {
  taskId: string;
  initialMessages?: ChatMessage[];
}

const typeColors: Record<string, string> = {
  thinking: 'border-l-blue-400 bg-blue-50',
  speaking: 'border-l-green-400 bg-green-50',
  tool_use: 'border-l-yellow-400 bg-yellow-50',
  tool_result: 'border-l-gray-400 bg-gray-50',
  error: 'border-l-red-400 bg-red-50',
};

const typeLabels: Record<string, string> = {
  thinking: '思考中',
  speaking: '发言',
  tool_use: '工具调用',
  tool_result: '工具结果',
  error: '错误',
};

export default function ChatPanel({ taskId, initialMessages = [] }: ChatPanelProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const [connected, setConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to WebSocket
    const ws = new WebSocket('ws://localhost:3001');

    ws.onopen = () => setConnected(true);
    ws.onclose = () => setConnected(false);
    ws.onerror = () => setConnected(false);

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'chat_message' && data.data.taskId === taskId) {
        setMessages((prev) => [...prev, data.data]);
      }
    };

    return () => ws.close();
  }, [taskId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-white">
        <h3 className="font-medium">Agent 沟通面板</h3>
        <span className={`text-xs ${connected ? 'text-green-500' : 'text-red-500'}`}>
          {connected ? '● 已连接' : '○ 未连接'}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-8">
            等待 Agent 开始工作...
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`border-l-4 p-3 rounded-r-lg ${typeColors[msg.type]}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-sm">{msg.agentName}</span>
                <span className="text-xs text-gray-400">
                  {new Date(msg.timestamp).toLocaleTimeString('zh-CN')}
                </span>
              </div>
              <div className="text-sm text-gray-700 whitespace-pre-wrap">
                {msg.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
```

Expected: ChatPanel component created

- [ ] **Step 2: Write AgentStatus component**

```tsx
// src/components/agent/AgentStatus.tsx
'use client';

import { useEffect, useState } from 'react';
import { AgentState } from '@/types';

interface AgentStatusProps {
  taskId: string;
}

const statusIcons: Record<string, string> = {
  idle: '⚪',
  thinking: '🟡',
  running: '🟢',
  error: '🔴',
};

const statusLabels: Record<string, string> = {
  idle: '待命',
  thinking: '思考中',
  running: '运行中',
  error: '错误',
};

export default function AgentStatus({ taskId }: AgentStatusProps) {
  const [agents, setAgents] = useState<AgentState[]>([]);

  useEffect(() => {
    const ws = new WebSocket('ws://localhost:3001');

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'agent_status') {
        setAgents((prev) => {
          const existing = prev.findIndex((a) => a.roleId === data.data.roleId);
          if (existing >= 0) {
            const updated = [...prev];
            updated[existing] = data.data;
            return updated;
          }
          return [...prev, data.data];
        });
      }
    };

    return () => ws.close();
  }, [taskId]);

  return (
    <div className="bg-white rounded-lg p-4 shadow-sm border border-gray-200">
      <h3 className="font-medium mb-3">Agent 状态</h3>
      <div className="space-y-2">
        {agents.length === 0 ? (
          <div className="text-sm text-gray-400">等待任务开始...</div>
        ) : (
          agents.map((agent) => (
            <div
              key={agent.roleId}
              className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded"
            >
              <span className="text-sm font-medium">{agent.roleId}</span>
              <span className="text-sm">
                {statusIcons[agent.status]} {statusLabels[agent.status]}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
```

Expected: AgentStatus component created

- [ ] **Step 3: Commit**

```bash
git add src/components/agent/
git commit -m "feat: add chat panel and agent status components"
```

---

### Task 12: Implement Main Pages

**Files:**
- Update: `src/app/page.tsx`
- Create: `src/app/task/[id]/page.tsx`
- Create: `src/components/task/TaskDetail.tsx`
- Create: `src/components/task/TaskActions.tsx`

- [ ] **Step 1: Update main page**

```tsx
// src/app/page.tsx
import TaskList from '@/components/task/TaskList';
import TaskCreate from '@/components/task/TaskCreate';

export default function Home() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <h1 className="text-2xl font-bold mb-4">任务列表</h1>
        <TaskList />
      </div>
      <div>
        <TaskCreate />
      </div>
    </div>
  );
}
```

Expected: Main page updated

- [ ] **Step 2: Create TaskActions client component**

```tsx
// src/components/task/TaskActions.tsx
'use client';

import { useState } from 'react';

interface TaskActionsProps {
  taskId: string;
  status: string;
}

export default function TaskActions({ taskId, status }: TaskActionsProps) {
  const [loading, setLoading] = useState(false);

  async function handleExecute() {
    setLoading(true);
    try {
      await fetch('/api/agents/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId }),
      });
    } catch (error) {
      console.error('Failed to start execution:', error);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex gap-4">
      {status === 'pending' && (
        <button
          onClick={handleExecute}
          disabled={loading}
          className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
        >
          {loading ? '启动中...' : '开始执行'}
        </button>
      )}
      {status === 'running' && (
        <span className="text-blue-600">任务执行中...</span>
      )}
      {status === 'completed' && (
        <span className="text-green-600">任务已完成</span>
      )}
      {status === 'failed' && (
        <span className="text-red-600">任务失败</span>
      )}
    </div>
  );
}
```

Expected: TaskActions component created

- [ ] **Step 3: Create task detail page (server component)**

```tsx
// src/app/task/[id]/page.tsx
import { notFound } from 'next/navigation';
import { getTaskById, getChatMessages } from '@/lib/storage/database';
import ChatPanel from '@/components/agent/ChatPanel';
import AgentStatus from '@/components/agent/AgentStatus';
import TaskActions from '@/components/task/TaskActions';

interface TaskPageProps {
  params: { id: string };
}

export default async function TaskPage({ params }: TaskPageProps) {
  const task = getTaskById(params.id);
  if (!task) notFound();

  const messages = getChatMessages(params.id);

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
        <h1 className="text-2xl font-bold mb-2">{task.title}</h1>
        <p className="text-gray-600">{task.description || '无描述'}</p>
        <div className="mt-4 flex gap-4 text-sm text-gray-500">
          <span>模板: {task.templateId}</span>
          <span>权限: {task.permissionMode}</span>
          <span>状态: {task.status}</span>
        </div>
      </div>

      <TaskActions taskId={params.id} status={task.status} />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <ChatPanel taskId={params.id} initialMessages={messages} />
        </div>
        <div>
          <AgentStatus taskId={params.id} />
        </div>
      </div>
    </div>
  );
}
```

Expected: Task detail page created

- [ ] **Step 4: Add config API route**

```typescript
// src/app/api/config/templates/route.ts
import { NextResponse } from 'next/server';
import { getTemplates } from '@/lib/storage/config';

export async function GET() {
  const templates = getTemplates();
  return NextResponse.json({ templates });
}
```

Expected: Config API route created

- [ ] **Step 5: Commit**

```bash
git add src/app/page.tsx src/app/task/ src/components/task/ src/app/api/config/
git commit -m "feat: add main pages, task actions, and config API"
```

---

## Phase 5: Testing & Documentation

### Task 13: Add Basic Tests

**Files:**
- Create: `__tests__/database.test.ts`
- Create: `__tests__/config.test.ts`
- Create: `jest.config.js`

- [ ] **Step 1: Setup Jest**

```bash
npm install -D jest @types/jest ts-jest
```

- [ ] **Step 2: Create jest config**

```javascript
// jest.config.js
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/__tests__/**/*.test.ts'],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
  },
};
```

- [ ] **Step 3: Write database tests**

```typescript
// __tests__/database.test.ts
import { createTask, getTasks, getTaskById, updateTaskStatus } from '@/lib/storage/database';

describe('Database Operations', () => {
  test('should create and retrieve task', () => {
    const taskData = {
      id: 'test-task-1',
      title: 'Test Task',
      description: 'Test description',
      templateId: 'software-dev',
      permissionMode: 'standard' as const,
      status: 'pending' as const,
      workspacePath: '/tmp/test',
    };

    const task = createTask(taskData);
    expect(task.id).toBe(taskData.id);
    expect(task.title).toBe(taskData.title);

    const retrieved = getTaskById('test-task-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.title).toBe('Test Task');
  });

  test('should update task status', () => {
    createTask({
      id: 'test-task-2',
      title: 'Status Test',
      description: '',
      templateId: 'software-dev',
      permissionMode: 'standard',
      status: 'pending',
      workspacePath: '/tmp/test',
    });

    updateTaskStatus('test-task-2', 'running');
    const task = getTaskById('test-task-2');
    expect(task?.status).toBe('running');
  });
});
```

- [ ] **Step 4: Run tests**

```bash
npm test
```

Expected: Tests pass

- [ ] **Step 5: Commit**

```bash
git add __tests__ jest.config.js package.json
git commit -m "test: add basic database tests"
```

---

### Task 14: Add README Documentation

**Files:**
- Create: `README.md`

- [ ] **Step 1: Write README**

```markdown
# Agent Squad (龙虾军团)

基于 Claude Agent SDK 的多 Agent 协作系统。

## 功能特性

- 🦐 **多 Agent 协作**: 协调者 Agent 调度专业 Agent 完成复杂任务
- 🎯 **场景模板**: 预设软件开发、项目管理、内容创作、通用任务四种模板
- 🔧 **角色自定义**: 支持自定义 Agent 角色和能力
- 💬 **实时可视化**: Web 界面实时展示 Agent 沟通过程
- 🔐 **权限控制**: 支持严格/标准/信任三种权限模式

## 快速开始

### 安装依赖

```bash
npm install
```

### 配置 API Key

设置环境变量：

```bash
export ANTHROPIC_API_KEY=your-api-key
```

### 启动开发服务器

```bash
npm run dev
```

打开浏览器访问 http://localhost:3000

## 使用方法

1. **创建任务**: 选择场景模板，填写任务描述，选择权限模式
2. **开始执行**: 点击"开始执行"，Agent 开始协作
3. **实时监控**: 在沟通面板查看 Agent 实时对话
4. **查看结果**: 任务完成后查看执行结果

## 场景模板

### 软件开发
产品经理 → 架构师 → 开发者 → 测试工程师 → 运维工程师

### 项目管理（发布流程）
版本管理员 → 构建工程师 → 回归测试员 → 验证专员 → 发布专员

### 内容创作
内容策划 → 撰稿人 → 编辑 → 审稿人 → 发布专员

### 通用任务
规划者 → 执行者 → 验证者 → 汇报者

## 技术栈

- Next.js 14
- TypeScript
- Tailwind CSS
- Claude Agent SDK
- SQLite
- WebSocket

## 许可证

MIT
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add README documentation"
```

---

## Summary

This plan creates a complete multi-agent collaboration system with:

1. **Foundation**: Next.js project with TypeScript, Tailwind, and dependencies
2. **Data Layer**: SQLite database and JSON config management
3. **Agent Layer**: Coordinator agent using Claude Agent SDK subagents
4. **API Layer**: REST API for tasks and WebSocket for real-time updates
5. **Frontend**: Task management UI with real-time chat visualization
6. **Testing**: Basic unit tests for core functionality
7. **Documentation**: README with setup and usage instructions

**Estimated total steps**: ~50 individual steps across 14 tasks