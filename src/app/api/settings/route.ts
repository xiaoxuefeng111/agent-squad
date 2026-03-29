import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env.local');

// GET /api/settings - 获取当前设置
export async function GET() {
  try {
    let apiKey = '';

    if (fs.existsSync(ENV_PATH)) {
      const content = fs.readFileSync(ENV_PATH, 'utf-8');
      const match = content.match(/ANTHROPIC_API_KEY=(.+)/);
      if (match) {
        apiKey = match[1].trim();
      }
    }

    return NextResponse.json({
      hasApiKey: apiKey.length > 0,
      apiKeyPreview: apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to read settings' },
      { status: 500 }
    );
  }
}

// POST /api/settings - 保存设置
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key' },
        { status: 400 }
      );
    }

    // 写入 .env.local 文件
    const content = `ANTHROPIC_API_KEY=${apiKey}\n`;
    fs.writeFileSync(ENV_PATH, content);

    return NextResponse.json({
      success: true,
      message: 'API Key 已保存',
      apiKeyPreview: `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}