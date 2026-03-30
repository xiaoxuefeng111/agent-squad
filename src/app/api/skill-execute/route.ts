import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const ENV_PATH = path.join(process.cwd(), '.env.local');

// 读取设置
function getSettings(): { apiKey?: string; baseUrl?: string; model?: string } {
  if (!fs.existsSync(ENV_PATH)) {
    return {};
  }

  const content = fs.readFileSync(ENV_PATH, 'utf-8');
  const keyMatch = content.match(/ANTHROPIC_API_KEY=(.+)/);
  const urlMatch = content.match(/ANTHROPIC_BASE_URL=(.+)/);
  const modelMatch = content.match(/ANTHROPIC_MODEL=(.+)/);

  return {
    apiKey: keyMatch?.[1]?.trim(),
    baseUrl: urlMatch?.[1]?.trim(),
    model: modelMatch?.[1]?.trim(),
  };
}

// Skill 执行 API - 处理 skill 步骤的实际执行
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, step, params, context, previousOutput, skillId } = body;

    const settings = getSettings();

    // 根据 action 类型处理
    let output = '';

    switch (action) {
      case 'analyze':
        output = await handleAnalyze(step, context, skillId, settings);
        break;

      case 'read':
        output = await handleRead(step, context, settings);
        break;

      case 'write':
        output = await handleWrite(step, params, context, previousOutput, settings);
        break;

      case 'edit':
        output = await handleEdit(step, context, previousOutput, settings);
        break;

      case 'bash':
        output = `[Command execution would happen here: ${params?.command}]`;
        break;

      default:
        output = `Action ${action} executed`;
    }

    return NextResponse.json({ success: true, output });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// 分析步骤 - 使用大模型进行思考分析
async function handleAnalyze(
  step: string,
  context: { title?: string; description?: string; templateId?: string } | undefined,
  skillId: string | undefined,
  settings: { apiKey?: string; baseUrl?: string; model?: string }
): Promise<string> {
  const systemPrompt = getSkillSystemPrompt(skillId);
  const userPrompt = `Step to execute: ${step}

Context:
- Task Title: ${context?.title || 'Not specified'}
- Task Description: ${context?.description || 'Not specified'}
- Template: ${context?.templateId || 'Not specified'}

Please analyze and provide your thoughts for this step.`;

  return callLLM(systemPrompt, userPrompt, settings);
}

// 读取步骤 - 获取项目上下文信息
async function handleRead(
  step: string,
  context: { title?: string; description?: string; templateId?: string } | undefined,
  settings: { apiKey?: string; baseUrl?: string; model?: string }
): Promise<string> {
  const systemPrompt = `You are a helpful assistant that helps gather and understand project context.
When asked to read or gather information, provide a structured summary of what should be examined.`;

  const userPrompt = `Step: ${step}

Context: ${JSON.stringify(context)}

What information should be gathered for this step?`;

  return callLLM(systemPrompt, userPrompt, settings);
}

// 写入步骤 - 生成文档/计划/代码
async function handleWrite(
  step: string,
  params: { type?: string } | undefined,
  context: { title?: string; description?: string; templateId?: string } | undefined,
  previousOutput: string | undefined,
  settings: { apiKey?: string; baseUrl?: string; model?: string }
): Promise<string> {
  const typeDesc = params?.type || 'content';

  const systemPrompt = `You are an expert at creating ${typeDesc}.
Based on previous analysis and context, generate clear, well-structured content.`;

  const userPrompt = `Step: ${step}
Type to create: ${typeDesc}

Context:
${JSON.stringify(context)}

Previous analysis:
${previousOutput || 'None'}

Please generate the appropriate ${typeDesc}.`;

  return callLLM(systemPrompt, userPrompt, settings);
}

// 编辑步骤 - 修改和改进现有内容
async function handleEdit(
  step: string,
  context: { title?: string; description?: string; templateId?: string } | undefined,
  previousOutput: string | undefined,
  settings: { apiKey?: string; baseUrl?: string; model?: string }
): Promise<string> {
  const systemPrompt = `You are an expert at refining and improving content.
Make targeted improvements while preserving the core intent.`;

  const userPrompt = `Step: ${step}

Context:
${JSON.stringify(context)}

Current content:
${previousOutput || 'None'}

What improvements should be made?`;

  return callLLM(systemPrompt, userPrompt, settings);
}

// 获取 skill 特定的系统提示
function getSkillSystemPrompt(skillId: string | undefined): string {
  switch (skillId) {
    case 'brainstorming':
      return `你正在使用头脑风暴(brainstorming)技能来设计功能。
请用中文回复，遵循以下流程：
1. 首先探索项目上下文（文件、文档、最近提交）
2. 逐个提出澄清问题
3. 提出2-3个方案并说明优缺点
4. 展示设计章节供确认
5. 确认后编写设计文档

重要：不要跳过设计阶段直接进入实现。
在提出方案前先通过提问澄清需求。`;

    case 'writing-plans':
      return `你正在使用编写计划(writing-plans)技能来创建实现计划。
请用中文回复，计划应包含：
- 每个任务的精确文件路径
- 完整的代码片段
- 验证命令
- 小步骤（每个2-5分钟）

每个任务使用复选框语法：- [ ] 步骤描述`;

    case 'executing-plans':
      return `你正在使用执行计划(executing-plans)技能来实现计划。
请用中文回复，对每个任务：
1. 标记为进行中
2. 严格按步骤执行
3. 运行验证
4. 标记完成

遇到阻塞时停下来寻求帮助，不要猜测。`;

    case 'tdd-development':
      return `你正在使用测试驱动开发(TDD)。
请用中文回复，遵循红-绿-重构循环：
1. 先编写失败的测试
2. 实现最小代码使测试通过
3. 重构以提高代码质量

每步后都要验证测试状态。`;

    case 'code-review':
      return `你正在进行代码审查，关注：
- 风格和格式
- 安全漏洞
- 性能问题
- 错误处理
- 最佳实践

请用中文回复，提供可操作的具体建议。`;

    case 'debugging':
      return `你正在调试问题。
请用中文回复，流程：
1. 收集错误信息和日志
2. 重现问题
3. 定位根本原因
4. 提出修复方案
5. 实现修复
6. 验证修复有效
7. 检查是否有回归

卡住时停下来寻求帮助。`;

    default:
      return `你是一个帮助执行技能步骤的助手。
请用中文回复，为给定步骤提供清晰、可操作的输出。`;
  }
}

// 调用大模型 API
async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  settings: { apiKey?: string; baseUrl?: string; model?: string }
): Promise<string> {
  if (!settings.apiKey) {
    return '错误: 未配置 API Key，请在设置中配置 API Key。';
  }

  const baseUrl = settings.baseUrl || 'https://api.anthropic.com';
  const model = settings.model || 'claude-sonnet-4-6';

  // 构建请求
  const requestBody = {
    model,
    max_tokens: 4000,
    system: systemPrompt,
    messages: [
      { role: 'user', content: userPrompt }
    ]
  };

  try {
    // 使用 Anthropic 兼容 API 格式
    const response = await fetch(`${baseUrl}/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': settings.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return `API 错误: ${response.status} - ${errorText}`;
    }

    const data = await response.json();
    const content = data.content?.find((c: { type: string }) => c.type === 'text');
    return content?.text || '无响应';
  } catch (error) {
    return `调用 API 出错: ${error instanceof Error ? error.message : '未知错误'}`;
  }
}