import { NextRequest, NextResponse } from 'next/server';
import { getChatMessages } from '@/lib/storage/database';

// GET /api/messages - Get chat messages for a task
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

    const messages = getChatMessages(taskId);
    return NextResponse.json(messages);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    );
  }
}