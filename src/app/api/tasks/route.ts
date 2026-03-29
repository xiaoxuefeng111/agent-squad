import { NextRequest, NextResponse } from 'next/server';
import { createTask, getTasks, getTaskById, updateTaskStatus, getStorageStats } from '@/lib/storage/database';
import { getTemplates } from '@/lib/storage/config';
import { Task } from '@/types';

// GET /api/tasks - List all tasks
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const stats = searchParams.get('stats');

  try {
    if (stats === 'true') {
      // Return storage statistics
      const storageStats = getStorageStats();
      return NextResponse.json(storageStats);
    }

    if (id) {
      // Return specific task
      const task = getTaskById(id);
      if (!task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }
      return NextResponse.json(task);
    }

    // Return all tasks
    const tasks = getTasks();
    return NextResponse.json(tasks);
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
    const { title, description, templateId, permissionMode, workspacePath } = body;

    if (!title || !templateId) {
      return NextResponse.json(
        { error: 'Missing required fields: title and templateId' },
        { status: 400 }
      );
    }

    // Validate template exists
    const templates = getTemplates();
    const template = templates.find(t => t.id === templateId);
    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 400 }
      );
    }

    // Create task with generated ID
    const taskData = {
      id: crypto.randomUUID(),
      title,
      description: description || '',
      templateId,
      permissionMode: permissionMode || 'standard',
      status: 'pending' as Task['status'],
      workspacePath: workspacePath || process.cwd(),
    };

    const task = createTask(taskData);

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    );
  }
}

// PUT /api/tasks - Update task status
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, status } = body;

    if (!id || !status) {
      return NextResponse.json(
        { error: 'Missing required fields: id and status' },
        { status: 400 }
      );
    }

    // Validate status
    const validStatuses: Task['status'][] = ['pending', 'running', 'completed', 'failed', 'paused'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: 'Invalid status value' },
        { status: 400 }
      );
    }

    // Check task exists
    const existingTask = getTaskById(id);
    if (!existingTask) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    updateTaskStatus(id, status);

    return NextResponse.json({ success: true, taskId: id, status });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    );
  }
}