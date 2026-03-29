import Anthropic from '@anthropic-ai/sdk';
import { Task, AgentRole, ChatMessage, PermissionMode, ScenarioTemplate } from '@/types';
import { createChatMessage, updateTaskStatus } from '@/lib/storage/database';
import { getTemplateById } from '@/lib/storage/config';

// Message callback type for WebSocket communication
export type MessageCallback = (message: ChatMessage) => void;
export type StatusCallback = (taskId: string, status: Task['status']) => void;

// Coordinator Agent class
export class CoordinatorAgent {
  private taskId: string;
  private task: Task;
  private template: ScenarioTemplate | null;
  private client: Anthropic;
  private messageCallback: MessageCallback;
  private statusCallback: StatusCallback;
  private currentRoleIndex: number;
  private conversationHistory: { role: 'user' | 'assistant'; content: string }[];
  private permissionMode: PermissionMode;

  constructor(
    taskId: string,
    task: Task,
    messageCallback: MessageCallback,
    statusCallback: StatusCallback
  ) {
    this.taskId = taskId;
    this.task = task;
    this.template = getTemplateById(task.templateId);
    this.client = new Anthropic();
    this.messageCallback = messageCallback;
    this.statusCallback = statusCallback;
    this.currentRoleIndex = 0;
    this.conversationHistory = [];
    this.permissionMode = task.permissionMode;
  }

  // Send a message to WebSocket clients
  private sendMessage(type: ChatMessage['type'], agentId: string, agentName: string, content: string): ChatMessage {
    const message = createChatMessage({
      taskId: this.taskId,
      agentId,
      agentName,
      content,
      type,
    });
    this.messageCallback(message);
    return message;
  }

  // Get system prompt for coordinator based on template
  private getCoordinatorSystemPrompt(): string {
    const templateInfo = this.template
      ? `当前使用的场景模板: ${this.template.name} (${this.template.description})
执行流程: ${this.template.flow.join(' → ')}
可用角色: ${this.template.roles.map(r => r.name).join(', ')}`
      : '通用任务模式，无特定模板';

    const permissionInfo = this.getPermissionInstructions();

    return `你是龙虾军团(Agent Squad)的协调者Agent。你的职责是协调多个专业Agent完成用户任务。

${templateInfo}

${permissionInfo}

你的工作流程:
1. 分析用户任务需求
2. 确定需要哪些角色参与
3. 按流程顺序分配任务给对应角色的Subagent
4. 监控执行进度，处理异常情况
5. 汇总结果并反馈给用户

重要规则:
- 每次只调用一个角色的Subagent
- 等待Subagent返回结果后再决定下一步
- 如果遇到问题，尝试回退协商或调整方案
- 如果多次尝试仍失败，请求人工干预
- 保持简洁高效的沟通风格`;
  }

  // Get permission mode instructions
  private getPermissionInstructions(): string {
    switch (this.permissionMode) {
      case 'strict':
        return `权限模式: 严格模式
- 每个操作都需要用户确认
- 不能执行任何可能有风险的操作
- 只能读取文件，不能写入或修改`;
      case 'standard':
        return `权限模式: 标准模式
- 常规操作可自主执行
- 敏感操作需要用户确认
- 可以读写文件，执行安全命令`;
      case 'trusted':
        return `权限模式: 信任模式
- 全自主执行，无需确认
- 可以执行所有操作
- 最大程度信任Agent决策`;
    }
  }

  // Get system prompt for a specific role (subagent)
  private getRoleSystemPrompt(role: AgentRole): string {
    return `你是龙虾军团(Agent Squad)的${role.name}角色。

角色描述: ${role.description}

能力范围: ${role.capabilities.join(', ')}
可用工具: ${role.tools.join(', ')}

你的职责:
1. 接收协调者分配的任务
2. 在你能力范围内完成任务
3. 报告执行结果和发现
4. 如果任务超出能力范围，明确说明

重要规则:
- 只使用你被授权的工具
- 只处理你能力范围内的问题
- 保持专业和高效
- 提供清晰准确的结果报告`;
  }

  // Start the coordination process
  async start(): Promise<void> {
    updateTaskStatus(this.taskId, 'running');
    this.statusCallback(this.taskId, 'running');

    // Send initial thinking message
    this.sendMessage('thinking', 'coordinator', '协调者', '开始分析任务需求...');

    try {
      // Initial analysis and planning
      const initialPrompt = `用户任务: ${this.task.title}
任务描述: ${this.task.description}
工作目录: ${this.task.workspacePath}

请分析这个任务，制定执行计划，并确定第一个需要执行的角色。`;

      // Create initial message to Claude
      const response = await this.client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 16000,
        system: this.getCoordinatorSystemPrompt(),
        messages: [
          {
            role: 'user',
            content: initialPrompt,
          },
        ],
      });

      // Process response and extract thinking/speaking content
      await this.processCoordinatorResponse(response);

      // Start the agent loop
      await this.agentLoop();

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.sendMessage('error', 'coordinator', '协调者', `执行出错: ${errorMessage}`);
      updateTaskStatus(this.taskId, 'failed');
      this.statusCallback(this.taskId, 'failed');
    }
  }

  // Process coordinator response from Claude
  private async processCoordinatorResponse(response: Anthropic.Message): Promise<void> {
    // Extract content from response
    for (const block of response.content) {
      if (block.type === 'thinking') {
        this.sendMessage('thinking', 'coordinator', '协调者', block.thinking);
      } else if (block.type === 'text') {
        this.sendMessage('speaking', 'coordinator', '协调者', block.text);
      }
    }

    // Store in conversation history
    const content = this.extractContentFromResponse(response);
    this.conversationHistory.push({
      role: 'assistant',
      content,
    });
  }

  // Main agent loop - handles subagent dispatching
  private async agentLoop(): Promise<void> {
    while (this.currentRoleIndex < (this.template?.flow.length || 10)) {
      // Check if task should be paused
      // This would be controlled by external signals in real implementation

      // Get next decision from coordinator
      const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
      if (!lastMessage) break;

      // Determine if we need to dispatch a subagent or conclude
      const decision = await this.getCoordinatorDecision();

      if (decision.type === 'conclude') {
        // Task completed
        this.sendMessage('speaking', 'coordinator', '协调者', decision.summary);
        updateTaskStatus(this.taskId, 'completed');
        this.statusCallback(this.taskId, 'completed');
        break;
      }

      if (decision.type === 'dispatch') {
        // Dispatch to subagent
        await this.dispatchSubagent(decision.roleId, decision.taskDescription);
      }

      if (decision.type === 'human_intervention') {
        // Request human intervention
        this.sendMessage('speaking', 'coordinator', '协调者', '需要人工干预，请检查问题并提供指导。');
        updateTaskStatus(this.taskId, 'paused');
        this.statusCallback(this.taskId, 'paused');
        break;
      }

      this.currentRoleIndex++;
    }
  }

  // Get coordinator's decision on what to do next
  private async getCoordinatorDecision(): Promise<
    | { type: 'dispatch'; roleId: string; taskDescription: string }
    | { type: 'conclude'; summary: string }
    | { type: 'human_intervention'; reason: string }
  > {
    const lastContent = this.extractLastTextContent();

    const decisionPrompt = `基于当前执行状态，请做出下一步决策:

上一步结果: ${lastContent}

请用以下JSON格式回复:
{"type": "dispatch", "roleId": "<角色ID>", "taskDescription": "<任务描述>"}
或
{"type": "conclude", "summary": "<任务总结>"}
或
{"type": "human_intervention", "reason": "<需要人工干预的原因>"}`;

    const response = await this.client.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 4000,
      system: this.getCoordinatorSystemPrompt(),
      messages: this.conversationHistory.concat([
        {
          role: 'user',
          content: decisionPrompt,
        },
      ]),
    });

    // Parse decision from response
    const textContent = this.extractTextFromResponse(response);
    try {
      const decision = JSON.parse(textContent);
      return decision;
    } catch {
      // Default to conclude if parsing fails
      return {
        type: 'conclude',
        summary: textContent,
      };
    }
  }

  // Dispatch a subagent for a specific role
  private async dispatchSubagent(roleId: string, taskDescription: string): Promise<void> {
    const role = this.template?.roles.find(r => r.id === roleId);
    if (!role) {
      this.sendMessage('error', 'coordinator', '协调者', `找不到角色: ${roleId}`);
      return;
    }

    this.sendMessage('thinking', 'coordinator', '协调者', `正在派遣 ${role.name} 处理任务...`);

    // Create subagent prompt
    const subagentPrompt = `你需要完成以下任务:
${taskDescription}

工作目录: ${this.task.workspacePath}

请开始执行并报告结果。`;

    try {
      // Use Claude Agent SDK to create a subagent
      const subagentResponse = await this.client.messages.create({
        model: 'claude-opus-4-6',
        max_tokens: 16000,
        system: this.getRoleSystemPrompt(role),
        messages: [
          {
            role: 'user',
            content: subagentPrompt,
          },
        ],
      });

      // Process subagent response
      for (const block of subagentResponse.content) {
        if (block.type === 'thinking') {
          this.sendMessage('thinking', roleId, role.name, block.thinking);
        } else if (block.type === 'text') {
          this.sendMessage('speaking', roleId, role.name, block.text);
        }
      }

      // Add subagent result to conversation history for coordinator context
      const subagentResult = this.extractTextFromResponse(subagentResponse);
      this.conversationHistory.push({
        role: 'assistant',
        content: `[${role.name} 执行结果]: ${subagentResult}`,
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      this.sendMessage('error', roleId, role.name, `执行出错: ${errorMessage}`);
    }
  }

  // Helper: Extract text content from last message
  private extractLastTextContent(): string {
    const lastMessage = this.conversationHistory[this.conversationHistory.length - 1];
    if (!lastMessage) return '';
    return lastMessage.content;
  }

  // Helper: Extract content from response
  private extractContentFromResponse(response: Anthropic.Message): string {
    return response.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('\n');
  }

  // Helper: Extract text from response
  private extractTextFromResponse(response: Anthropic.Message): string {
    return response.content
      .filter(block => block.type === 'text')
      .map(block => (block as Anthropic.TextBlock).text)
      .join('\n');
  }

  // Pause the task
  pause(): void {
    updateTaskStatus(this.taskId, 'paused');
    this.statusCallback(this.taskId, 'paused');
  }

  // Resume the task
  async resume(): Promise<void> {
    updateTaskStatus(this.taskId, 'running');
    this.statusCallback(this.taskId, 'running');
    await this.agentLoop();
  }

  // Stop the task
  stop(): void {
    updateTaskStatus(this.taskId, 'failed');
    this.statusCallback(this.taskId, 'failed');
  }
}

// Agent manager to track running agents
export class AgentManager {
  private agents: Map<string, CoordinatorAgent>;

  constructor() {
    this.agents = new Map();
  }

  startAgent(
    taskId: string,
    task: Task,
    messageCallback: MessageCallback,
    statusCallback: StatusCallback
  ): CoordinatorAgent {
    const agent = new CoordinatorAgent(taskId, task, messageCallback, statusCallback);
    this.agents.set(taskId, agent);
    agent.start();
    return agent;
  }

  getAgent(taskId: string): CoordinatorAgent | undefined {
    return this.agents.get(taskId);
  }

  pauseAgent(taskId: string): void {
    const agent = this.agents.get(taskId);
    if (agent) {
      agent.pause();
    }
  }

  resumeAgent(taskId: string): void {
    const agent = this.agents.get(taskId);
    if (agent) {
      agent.resume();
    }
  }

  stopAgent(taskId: string): void {
    const agent = this.agents.get(taskId);
    if (agent) {
      agent.stop();
      this.agents.delete(taskId);
    }
  }

  isAgentRunning(taskId: string): boolean {
    return this.agents.has(taskId);
  }
}

// Singleton agent manager
export const agentManager = new AgentManager();