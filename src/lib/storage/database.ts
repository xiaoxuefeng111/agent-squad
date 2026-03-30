import path from 'path';
import fs from 'fs';
import { Task, ChatMessage } from '@/types';

// Lazy-loaded database - only load when actually needed
let db: any = null;
let useFallback = false;
let dbLoaded = false;

// Fallback in-memory storage when better-sqlite3 is not available
const fallbackTasks: Task[] = [];
const fallbackMessages: ChatMessage[] = [];

function loadDatabase(): any {
  if (dbLoaded) return db;
  dbLoaded = true;

  try {
    // Dynamic require - may fail if better-sqlite3 not compiled
    const Database = require('better-sqlite3');
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbPath = path.join(dataDir, 'tasks.db');
    db = new Database(dbPath);
    db.pragma('journal_mode = WAL');
    initializeTables(db);
    console.log('SQLite database loaded successfully');
    return db;
  } catch (error: any) {
    console.warn('SQLite not available, using in-memory fallback:', error?.message || error);
    useFallback = true;
    return null;
  }
}

function initializeTables(database: any) {
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
  const newTask: Task = {
    ...task,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  if (useFallback) {
    fallbackTasks.push(newTask);
    return newTask;
  }

  try {
    const database = loadDatabase();
    if (!database) {
      fallbackTasks.push(newTask);
      return newTask;
    }
    const stmt = database.prepare(`
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
    return newTask;
  } catch (error) {
    useFallback = true;
    fallbackTasks.push(newTask);
    return newTask;
  }
}

export function getTasks(): Task[] {
  if (useFallback) {
    return [...fallbackTasks].sort((a, b) =>
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  try {
    const database = loadDatabase();
    if (!database) {
      return [...fallbackTasks];
    }
    const rows = database.prepare('SELECT * FROM tasks ORDER BY created_at DESC').all() as any[];
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
  } catch (error) {
    useFallback = true;
    return [...fallbackTasks];
  }
}

export function getTaskById(id: string): Task | null {
  if (useFallback) {
    return fallbackTasks.find(t => t.id === id) || null;
  }

  try {
    const database = loadDatabase();
    if (!database) {
      return fallbackTasks.find(t => t.id === id) || null;
    }
    const row = database.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as any;
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
  } catch (error) {
    useFallback = true;
    return fallbackTasks.find(t => t.id === id) || null;
  }
}

export function updateTaskStatus(id: string, status: Task['status']): void {
  if (useFallback) {
    const task = fallbackTasks.find(t => t.id === id);
    if (task) {
      task.status = status;
      task.updatedAt = new Date();
    }
    return;
  }

  try {
    const database = loadDatabase();
    if (!database) {
      const task = fallbackTasks.find(t => t.id === id);
      if (task) {
        task.status = status;
        task.updatedAt = new Date();
      }
      return;
    }
    database.prepare('UPDATE tasks SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?').run(status, id);
  } catch (error) {
    useFallback = true;
    const task = fallbackTasks.find(t => t.id === id);
    if (task) {
      task.status = status;
      task.updatedAt = new Date();
    }
  }
}

export function createChatMessage(message: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
  const newMessage: ChatMessage = {
    id: crypto.randomUUID(),
    ...message,
    timestamp: new Date()
  };

  if (useFallback) {
    fallbackMessages.push(newMessage);
    return newMessage;
  }

  try {
    const database = loadDatabase();
    if (!database) {
      fallbackMessages.push(newMessage);
      return newMessage;
    }
    const stmt = database.prepare(`
      INSERT INTO chat_messages (id, task_id, agent_id, agent_name, content, type)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(newMessage.id, message.taskId, message.agentId, message.agentName, message.content, message.type);
    return newMessage;
  } catch (error) {
    useFallback = true;
    fallbackMessages.push(newMessage);
    return newMessage;
  }
}

export function getChatMessages(taskId: string): ChatMessage[] {
  if (useFallback) {
    return fallbackMessages.filter(m => m.taskId === taskId);
  }

  try {
    const database = loadDatabase();
    if (!database) {
      return fallbackMessages.filter(m => m.taskId === taskId);
    }
    const rows = database.prepare('SELECT * FROM chat_messages WHERE task_id = ? ORDER BY timestamp ASC').all(taskId) as any[];
    return rows.map(row => ({
      id: row.id,
      taskId: row.task_id,
      agentId: row.agent_id,
      agentName: row.agent_name,
      content: row.content,
      type: row.type,
      timestamp: new Date(row.timestamp),
    }));
  } catch (error) {
    useFallback = true;
    return fallbackMessages.filter(m => m.taskId === taskId);
  }
}

export function getStorageStats(): { totalSize: number; taskCount: number; messageCount: number } {
  if (useFallback) {
    return {
      totalSize: 0,
      taskCount: fallbackTasks.length,
      messageCount: fallbackMessages.length
    };
  }

  try {
    const database = loadDatabase();
    if (!database) {
      return {
        totalSize: 0,
        taskCount: fallbackTasks.length,
        messageCount: fallbackMessages.length
      };
    }
    const taskCount = (database.prepare('SELECT COUNT(*) as count FROM tasks').get() as any).count;
    const messageCount = (database.prepare('SELECT COUNT(*) as count FROM chat_messages').get() as any).count;

    let totalSize = 0;
    try {
      const dbPath = path.join(process.cwd(), 'data', 'tasks.db');
      const stats = fs.statSync(dbPath);
      totalSize = stats.size;
    } catch {
      // File doesn't exist yet
    }

    return { totalSize, taskCount, messageCount };
  } catch (error) {
    useFallback = true;
    return {
      totalSize: 0,
      taskCount: fallbackTasks.length,
      messageCount: fallbackMessages.length
    };
  }
}

export function isUsingFallback(): boolean {
  return useFallback;
}