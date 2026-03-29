import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env.local');

// POST /api/test-connection - 测试 API 连接
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { apiKey, baseUrl } = body;

    // 如果没有传入 apiKey，从保存的配置中读取
    if (!apiKey && fs.existsSync(ENV_PATH)) {
      const content = fs.readFileSync(ENV_PATH, 'utf-8');
      const keyMatch = content.match(/ANTHROPIC_API_KEY=(.+)/);
      if (keyMatch) {
        apiKey = keyMatch[1].trim();
      }
      const urlMatch = content.match(/ANTHROPIC_BASE_URL=(.+)/);
      if (urlMatch) {
        baseUrl = urlMatch[1].trim();
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: '请输入 API Key' },
        { status: 400 }
      );
    }

    // 构建 API URL
    const apiUrl = baseUrl
      ? `${baseUrl}/v1/messages`
      : 'https://api.anthropic.com/v1/messages';

    console.log('Testing connection to:', apiUrl);

    // 发送测试请求
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-5-haiku-20241022',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: '连接成功！API Key 有效',
      });
    } else {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error?.message || errorData.message || `HTTP ${response.status}`;

      return NextResponse.json({
        success: false,
        error: `连接失败: ${errorMessage}`,
      });
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json({
      success: false,
      error: `连接失败: ${errorMessage}`,
    });
  }
}