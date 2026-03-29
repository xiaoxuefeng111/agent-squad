import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env.local');

// 默认模型
const DEFAULT_MODELS: Record<string, string> = {
  'anthropic': 'claude-3-5-haiku-20241022',
  'aliyun': 'qwen-plus',
  'custom': 'claude-3-5-haiku-20241022',
};

// POST /api/test-connection - 测试 API 连接
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    let { apiKey, baseUrl, model } = body;

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
      const modelMatch = content.match(/ANTHROPIC_MODEL=(.+)/);
      if (modelMatch) {
        model = modelMatch[1].trim();
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: '请输入 API Key' },
        { status: 400 }
      );
    }

    // 确定使用哪个模型
    let testModel = model;
    if (!testModel) {
      // 根据 baseUrl 判断提供商
      if (baseUrl && baseUrl.includes('dashscope')) {
        testModel = DEFAULT_MODELS['aliyun'];
      } else if (baseUrl) {
        testModel = DEFAULT_MODELS['custom'];
      } else {
        testModel = DEFAULT_MODELS['anthropic'];
      }
    }

    // 构建 API URL
    const apiUrl = baseUrl
      ? `${baseUrl}/v1/messages`
      : 'https://api.anthropic.com/v1/messages';

    console.log('Testing connection to:', apiUrl, 'with model:', testModel);

    // 发送测试请求
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: testModel,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Hi' }],
      }),
    });

    if (response.ok) {
      return NextResponse.json({
        success: true,
        message: `连接成功！模型: ${testModel}`,
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