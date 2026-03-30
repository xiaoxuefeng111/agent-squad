import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env.local');

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// POST /api/brainstorm - 头脑风暴，分析任务需求
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, description, templateId, messages } = body as {
      title: string;
      description: string;
      templateId: string;
      messages?: Message[];
    };

    // 读取配置
    let apiKey = '';
    let baseUrl = '';
    let model = 'claude-3-5-sonnet-20241022';

    if (fs.existsSync(ENV_PATH)) {
      const content = fs.readFileSync(ENV_PATH, 'utf-8');
      const keyMatch = content.match(/ANTHROPIC_API_KEY=(.+)/);
      if (keyMatch) apiKey = keyMatch[1].trim();
      const urlMatch = content.match(/ANTHROPIC_BASE_URL=(.+)/);
      if (urlMatch) baseUrl = urlMatch[1].trim();
      const modelMatch = content.match(/ANTHROPIC_MODEL=(.+)/);
      if (modelMatch) model = modelMatch[1].trim();
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: '请先在设置中配置 API Key' },
        { status: 400 }
      );
    }

    // 获取模板信息
    const templates: Record<string, { name: string; roles: string[] }> = {
      'software-dev': { name: '软件开发', roles: ['架构师', '开发工程师', '代码审查员', '测试工程师'] },
      'project-mgmt': { name: '项目管理', roles: ['项目经理', '协调员', '进度跟踪员'] },
      'content-creation': { name: '内容创作', roles: ['内容研究员', '内容创作者', '编辑审核员', '发布协调员'] },
      'generic': { name: '通用任务', roles: ['任务分析师', '执行者', '验证员'] },
    };

    const template = templates[templateId] || templates['generic'];

    // 系统提示词（中文）
    const systemPrompt = `你是龙虾军团(Agent Squad)的任务规划助手。你的职责是帮助用户理清任务需求，制定执行方案。

当前选择的场景模板: ${template.name}
可用角色: ${template.roles.join('、')}

你的工作流程：
1. 分析用户任务，理解核心需求
2. 如果需求不清晰，提出澄清问题
3. 提出具体的执行方案
4. 等待用户确认或修改

回复格式要求：
- 简洁明了，避免冗长
- 如果需要澄清，列出具体问题
- 提出方案时，说明每个步骤和对应角色
- 最后询问用户是否确认方案`;

    // 构建消息
    const conversationMessages: Message[] = messages || [];

    if (!messages || messages.length === 0) {
      // 第一次对话，添加任务信息
      conversationMessages.push({
        role: 'user',
        content: `我有一个任务需要执行：

标题: ${title}
描述: ${description || '（无详细描述）'}

请帮我分析这个任务，并提出执行方案。如果需要更多信息，请提问。`,
      });
    }

    // 调用 API（使用 Anthropic 兼容格式）
    const apiBaseUrl = baseUrl || 'https://api.anthropic.com';
    const response = await fetch(`${apiBaseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model,
        max_tokens: 2000,
        system: systemPrompt,
        messages: conversationMessages.map(m => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: `API 错误: ${response.status} - ${errorText}` },
        { status: 500 }
      );
    }

    const data = await response.json();

    // 提取回复内容
    const replyContent = data.content
      .filter((block: { type: string }) => block.type === 'text')
      .map((block: { text: string }) => block.text)
      .join('\n');

    return NextResponse.json({
      success: true,
      message: replyContent,
    });
  } catch (error) {
    console.error('Brainstorm error:', error);
    const errorMessage = error instanceof Error ? error.message : '未知错误';
    return NextResponse.json(
      { error: `分析失败: ${errorMessage}` },
      { status: 500 }
    );
  }
}