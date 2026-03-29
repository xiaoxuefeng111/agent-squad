import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { Task, ChatMessage } from '@/types';

const DB_PATH = path.join(process.cwd(), 'data', 'tasks.db');

let db: Database.Database | null = null;

export function getDatabase(): Database.Database {
  if (!db) {
    // Ensure data directory exists
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
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
  let totalSize = 0;
  try {
    const stats = fs.statSync(DB_PATH);
    totalSize = stats.size;
  } catch {
    // File doesn't exist yet
  }

  return { totalSize, taskCount, messageCount };
}