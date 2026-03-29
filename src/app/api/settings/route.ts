import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env.local');

// GET /api/settings - 获取当前设置
export async function GET() {
  try {
    let apiKey = '';
    let baseUrl = '';
    let model = '';

    if (fs.existsSync(ENV_PATH)) {
      const content = fs.readFileSync(ENV_PATH, 'utf-8');
      const keyMatch = content.match(/ANTHROPIC_API_KEY=(.+)/);
      if (keyMatch) {
        apiKey = keyMatch[1].trim();
      }
      const urlMatch = content.match(/ANTHROPIC_BASE_URL=(.+)/);
      if (urlMatch) {
        baseUrl = urlMatch[1].trim();
      }
      const modelMatch = content.match(/ANTHROPIC_MODEL=(.+)/);
      if (modelMatch) {
        model = modelMatch[1].trim();
      }
    }

    return NextResponse.json({
      hasApiKey: apiKey.length > 0,
      apiKeyPreview: apiKey ? `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}` : null,
      baseUrl: baseUrl || null,
      model: model || null,
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
    const { apiKey, baseUrl, model } = body;

    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing API key' },
        { status: 400 }
      );
    }

    // 写入 .env.local 文件
    let content = `ANTHROPIC_API_KEY=${apiKey}\n`;
    if (baseUrl) {
      content += `ANTHROPIC_BASE_URL=${baseUrl}\n`;
    }
    if (model) {
      content += `ANTHROPIC_MODEL=${model}\n`;
    }
    fs.writeFileSync(ENV_PATH, content);

    return NextResponse.json({
      success: true,
      message: '设置已保存',
      apiKeyPreview: `${apiKey.slice(0, 8)}...${apiKey.slice(-4)}`,
      baseUrl: baseUrl || null,
      model: model || null,
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to save settings' },
      { status: 500 }
    );
  }
}