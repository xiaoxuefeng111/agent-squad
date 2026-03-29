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
      return `You are using the brainstorming skill to design a feature.
Follow this process:
1. Explore project context first (files, docs, recent commits)
2. Ask clarifying questions one at a time
3. Propose 2-3 approaches with trade-offs
4. Present design sections for approval
5. Write design doc after approval

IMPORTANT: Never skip to implementation without completing the design phase.
Ask questions to clarify before proposing solutions.`;

    case 'writing-plans':
      return `You are using the writing-plans skill to create implementation plans.
Plans should include:
- Exact file paths for each task
- Complete code snippets
- Verification commands
- Bite-sized steps (2-5 minutes each)

Each task has checkbox syntax: - [ ] Step description`;

    case 'executing-plans':
      return `You are using the executing-plans skill to implement a plan.
For each task:
1. Mark as in_progress
2. Follow steps exactly
3. Run verifications
4. Mark completed

Stop and ask for help when blocked. Don't guess.`;

    case 'tdd-development':
      return `You are using TDD (Test-Driven Development).
Follow Red-Green-Refactor:
1. Write failing test first
2. Implement minimal code to pass
3. Refactor for clarity

Always verify test status after each step.`;

    case 'code-review':
      return `You are reviewing code for:
- Style and formatting
- Security vulnerabilities
- Performance issues
- Error handling
- Best practices

Provide actionable feedback with specific recommendations.`;

    case 'debugging':
      return `You are debugging an issue.
Process:
1. Collect error info and logs
2. Reproduce the issue
3. Locate root cause
4. Propose fix
5. Implement fix
6. Verify fix works
7. Check for regression

Stop and ask for help when stuck.`;

    default:
      return `You are a helpful assistant executing a skill step.
Provide clear, actionable output for the given step.`;
  }
}

// 调用大模型 API
async function callLLM(
  systemPrompt: string,
  userPrompt: string,
  settings: { apiKey?: string; baseUrl?: string; model?: string }
): Promise<string> {
  if (!settings.apiKey) {
    return 'Error: No API key configured. Please set up API key in Settings.';
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

  // 根据baseUrl判断API提供商
  const apiProvider = baseUrl.includes('dashscope') ? 'aliyun' : 'anthropic';

  try {
    if (apiProvider === 'aliyun') {
      // 阿里云百炼 API
      const response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${settings.apiKey}`,
        },
        body: JSON.stringify({
          model,
          input: {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ]
          },
          parameters: {
            max_tokens: 4000,
            result_format: 'message'
          }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        return `API Error: ${response.status} - ${errorText}`;
      }

      const data = await response.json();
      return data.output?.choices?.[0]?.message?.content || data.output?.text || 'No response';

    } else {
      // Anthropic API
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
        return `API Error: ${response.status} - ${errorText}`;
      }

      const data = await response.json();
      const content = data.content?.find((c: { type: string }) => c.type === 'text');
      return content?.text || 'No response';
    }
  } catch (error) {
    return `Error calling API: ${error instanceof Error ? error.message : 'Unknown error'}`;
  }
}