import { NextRequest, NextResponse } from 'next/server';
import { getTaskById, updateTaskStatus } from '@/lib/storage/database';
import { agentManager, createWSMessageCallback, createWSStatusCallback } from '@/lib/agents/coordinator';
import { getWebSocketManager } from '@/lib/websocket/server';

// POST /api/execute - Start, pause, resume, or stop agent execution
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { taskId, action } = body;

    if (!taskId || !action) {
      return NextResponse.json(
        { error: 'Missing required fields: taskId and action' },
        { status: 400 }
      );
    }

    // Validate action
    const validActions = ['start', 'pause', 'resume', 'stop'];
    if (!validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action. Use start, pause, resume, or stop' },
        { status: 400 }
      );
    }

    // Check task exists
    const task = getTaskById(taskId);
    if (!task) {
      return NextResponse.json(
        { error: 'Task not found' },
        { status: 404 }
      );
    }

    // Initialize WebSocket manager if needed
    const wsManager = getWebSocketManager();
    const messageCallback = createWSMessageCallback(taskId);
    const statusCallback = createWSStatusCallback();

    switch (action) {
      case 'start':
        // Check if agent is already running
        if (agentManager.isAgentRunning(taskId)) {
          return NextResponse.json(
            { error: 'Agent is already running for this task' },
            { status: 400 }
          );
        }

        // Start agent
        agentManager.startAgent(taskId, task, messageCallback, statusCallback);

        return NextResponse.json({
          success: true,
          taskId,
          action: 'start',
          message: 'Agent execution started',
        });

      case 'pause':
        if (!agentManager.isAgentRunning(taskId)) {
          return NextResponse.json(
            { error: 'No agent running for this task' },
            { status: 400 }
          );
        }

        agentManager.pauseAgent(taskId);

        return NextResponse.json({
          success: true,
          taskId,
          action: 'pause',
          message: 'Agent execution paused',
        });

      case 'resume':
        if (!agentManager.isAgentRunning(taskId)) {
          return NextResponse.json(
            { error: 'No agent running for this task' },
            { status: 400 }
          );
        }

        agentManager.resumeAgent(taskId);

        return NextResponse.json({
          success: true,
          taskId,
          action: 'resume',
          message: 'Agent execution resumed',
        });

      case 'stop':
        if (!agentManager.isAgentRunning(taskId)) {
          return NextResponse.json(
            { error: 'No agent running for this task' },
            { status: 400 }
          );
        }

        agentManager.stopAgent(taskId);

        return NextResponse.json({
          success: true,
          taskId,
          action: 'stop',
          message: 'Agent execution stopped',
        });
    }
  } catch (error) {
    console.error('Agent execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute agent action' },
      { status: 500 }
    );
  }
}

// GET /api/execute - Check if agent is running for a task
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const taskId = searchParams.get('taskId');

  try {
    if (!taskId) {
      return NextResponse.json(
        { error: 'Missing required parameter: taskId' },
        { status: 400 }
      );
    }

    const isRunning = agentManager.isAgentRunning(taskId);
    const task = getTaskById(taskId);

    return NextResponse.json({
      taskId,
      isRunning,
      taskStatus: task?.status || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to check agent status' },
      { status: 500 }
    );
  }
}