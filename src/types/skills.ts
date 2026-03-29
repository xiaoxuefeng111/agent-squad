// Skill 类型定义 - 遵循 superpowers 模式
export type SkillTrigger = 'auto' | 'manual'; // auto: Agent自动选择, manual: 用户手动触发

export type SkillCategory =
  | 'planning'      // 规划类 (brainstorming, writing-plans)
  | 'development'   // 开发类
  | 'testing'       // 测试类
  | 'review'        // 审查类
  | 'debugging'     // 调试类
  | 'documentation' // 文档类
  | 'analysis'      // 分析类
  | 'execution'     // 执行类
  | 'completion'    // 完成类
  | 'custom';       // 自定义

// 步骤状态
export type StepStatus = 'pending' | 'in_progress' | 'completed' | 'blocked' | 'skipped';

// 带checklist的步骤定义
export interface SkillStep {
  id: string;                 // 步骤ID
  description: string;        // 步骤描述 (checkbox label)
  action: string;             // 动作类型: read|write|edit|bash|ask|analyze|skill
  params?: Record<string, any>; // 参数
  verification?: string;      // 验证条件
  skillReference?: string;    // 引用其他skill (如 @writing-plans)
  isRequired?: boolean;       // 是否必须 (默认true)
  status?: StepStatus;        // 执行状态
  output?: string;            // 执行输出/结果
}

// Skill 执行状态
export interface SkillExecutionState {
  skillId: string;
  taskId: string;
  currentStepIndex: number;
  steps: SkillStep[];
  startedAt: Date;
  completedAt?: Date;
  status: 'running' | 'completed' | 'blocked' | 'cancelled';
  output?: string;
}

export interface Skill {
  id: string;
  name: string;
  description: string;
  category: SkillCategory;
  trigger: SkillTrigger;

  // 执行流程声明
  announce?: string;          // "Announce at start" 声明语

  // 适用条件
  applicableRoles: string[];  // 哪些角色可以使用
  applicableTemplates: string[]; // 哪些模板可用

  // Checklist 步骤
  steps: SkillStep[];
  stepsCount?: number;         // 步骤数量（用于列表显示）

  // 验证检查点
  verificationPoints?: string[]; // 关键验证点

  // 必要的子skill
  requiredSkills?: string[]; // 需要先执行的skill

  // 元数据
  isBuiltIn: boolean;        // 是否内置
  isRequired?: boolean;      // 是否强制执行 (如 brainstorming)
  createdAt: Date;
  updatedAt: Date;
}

// 内置 Skill 定义 - 遵循 superpowers 模式
export const BUILTIN_SKILLS: Skill[] = [
  // === 规划类 Skills ===
  {
    id: 'brainstorming',
    name: 'Brainstorming',
    description: 'Help turn ideas into fully formed designs and specs through natural collaborative dialogue. MANDATORY before implementation.',
    category: 'planning',
    trigger: 'manual',
    isRequired: true, // 强制执行
    announce: 'I\'m using the brainstorming skill to design this feature.',
    applicableRoles: ['coordinator', 'architect', 'pm'],
    applicableTemplates: ['software-dev', 'project-mgmt', 'content-creation', 'generic'],
    requiredSkills: [],
    verificationPoints: [
      'Design document created',
      'User approved the design',
      'Spec saved to docs/superpowers/specs/'
    ],
    steps: [
      { id: 'explore', description: 'Explore project context — check files, docs, recent commits', action: 'analyze', isRequired: true },
      { id: 'clarify-1', description: 'Ask clarifying questions — one at a time, understand purpose/constraints/success criteria', action: 'ask', isRequired: true },
      { id: 'clarify-2', description: 'Continue clarifying until fully understood', action: 'ask', isRequired: true },
      { id: 'propose', description: 'Propose 2-3 approaches — with trade-offs and recommendation', action: 'analyze', isRequired: true },
      { id: 'design', description: 'Present design — in sections scaled to complexity, get approval after each', action: 'write', params: { type: 'design' }, isRequired: true },
      { id: 'write-spec', description: 'Write design doc — save to docs/superpowers/specs/YYYY-MM-DD-<topic>-design.md', action: 'write', params: { type: 'spec' }, isRequired: true },
      { id: 'self-review', description: 'Spec self-review — check for placeholders, contradictions, ambiguity', action: 'analyze', verification: 'No TBD/TODO, internally consistent', isRequired: true },
      { id: 'user-review', description: 'User reviews written spec — get approval before proceeding', action: 'ask', verification: 'User approved spec', isRequired: true },
      { id: 'handoff', description: 'Transition to implementation — invoke writing-plans skill', action: 'skill', skillReference: 'writing-plans', isRequired: true },
    ],
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'writing-plans',
    name: 'Writing Plans',
    description: 'Write comprehensive implementation plans assuming the engineer has zero context. Document everything: files, code, testing, how to test.',
    category: 'planning',
    trigger: 'auto',
    announce: 'I\'m using the writing-plans skill to create the implementation plan.',
    applicableRoles: ['coordinator', 'architect'],
    applicableTemplates: ['software-dev', 'project-mgmt', 'generic'],
    requiredSkills: ['brainstorming'], // 需要先完成 brainstorming
    verificationPoints: [
      'Plan saved to docs/superpowers/plans/',
      'Each task has exact file paths',
      'Each task has complete code',
      'Each task has verification commands'
    ],
    steps: [
      { id: 'scope-check', description: 'Scope check — verify single subsystem coverage', action: 'analyze', isRequired: true },
      { id: 'file-structure', description: 'Map file structure — which files to create/modify', action: 'analyze', isRequired: true },
      { id: 'decompose', description: 'Decpose into bite-sized tasks — each step is 2-5 min action', action: 'analyze', isRequired: true },
      { id: 'write-header', description: 'Write plan header — goal, architecture, tech stack', action: 'write', params: { type: 'plan-header' }, isRequired: true },
      { id: 'write-tasks', description: 'Write task structure — files, steps with checklists, code', action: 'write', params: { type: 'plan-tasks' }, isRequired: true },
      { id: 'save-plan', description: 'Save plan to docs/superpowers/plans/YYYY-MM-DD-<feature>.md', action: 'write', params: { type: 'plan' }, isRequired: true },
      { id: 'review', description: 'Review loop — dispatch plan-document-reviewer, fix issues', action: 'skill', skillReference: 'plan-review', isRequired: true },
      { id: 'handoff', description: 'Execution handoff — offer subagent-driven or inline execution', action: 'ask', isRequired: true },
    ],
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'executing-plans',
    name: 'Executing Plans',
    description: 'Load plan, review critically, execute all tasks, report when complete.',
    category: 'execution',
    trigger: 'auto',
    announce: 'I\'m using the executing-plans skill to implement this plan.',
    applicableRoles: ['coordinator', 'developer'],
    applicableTemplates: ['software-dev', 'generic'],
    requiredSkills: ['writing-plans'],
    verificationPoints: [
      'All tasks completed',
      'All verifications passed',
      'Tests passing',
      'Committed to git'
    ],
    steps: [
      { id: 'load-plan', description: 'Load and review plan — identify concerns before starting', action: 'read', isRequired: true },
      { id: 'create-todos', description: 'Create TodoWrite — one todo per task', action: 'write', params: { type: 'todos' }, isRequired: true },
      { id: 'execute-tasks', description: 'Execute tasks — mark in_progress, follow steps exactly', action: 'analyze', isRequired: true },
      { id: 'run-verification', description: 'Run verifications — tests, commands as specified', action: 'bash', isRequired: true },
      { id: 'handle-blockers', description: 'Handle blockers — stop and ask when stuck, don\'t guess', action: 'ask', verification: 'Blocker resolved or escalated', isRequired: false },
      { id: 'complete', description: 'Complete development — invoke finishing-a-development-branch', action: 'skill', skillReference: 'finishing-branch', isRequired: true },
    ],
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // === 开发类 Skills ===
  {
    id: 'tdd-development',
    name: 'TDD Development',
    description: 'Test-driven development: write test first, then implement minimal code to pass.',
    category: 'development',
    trigger: 'auto',
    announce: 'I\'m using the TDD development skill to implement this feature.',
    applicableRoles: ['developer', 'architect'],
    applicableTemplates: ['software-dev'],
    verificationPoints: [
      'Test written before code',
      'Test initially fails',
      'Minimal implementation passes test',
      'Refactored code still passes'
    ],
    steps: [
      { id: 'understand', description: 'Understand requirement — determine feature to implement', action: 'analyze', isRequired: true },
      { id: 'write-test', description: 'Write failing test — [ ] Write the failing test', action: 'write', params: { type: 'test' }, isRequired: true },
      { id: 'run-fail', description: 'Run test to verify it fails — Expected: FAIL', action: 'bash', params: { command: 'npm test' }, verification: 'Test fails as expected', isRequired: true },
      { id: 'implement', description: 'Write minimal implementation — just enough to pass', action: 'write', params: { type: 'code' }, isRequired: true },
      { id: 'run-pass', description: 'Run test to verify it passes — Expected: PASS', action: 'bash', params: { command: 'npm test' }, verification: 'Test passes', isRequired: true },
      { id: 'refactor', description: 'Refactor for clarity — improve code quality', action: 'edit', isRequired: false },
      { id: 'verify-again', description: 'Run tests again — ensure refactor didn\'t break', action: 'bash', params: { command: 'npm test' }, verification: 'All tests pass', isRequired: true },
      { id: 'commit', description: 'Commit changes — git add & commit', action: 'bash', params: { command: 'git commit' }, isRequired: true },
    ],
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // === 审查类 Skills ===
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Systematically review code quality, security, and best practices.',
    category: 'review',
    trigger: 'auto',
    announce: 'I\'m using the code-review skill to review this implementation.',
    applicableRoles: ['reviewer', 'architect'],
    applicableTemplates: ['software-dev'],
    verificationPoints: [
      'Code style compliant',
      'No security vulnerabilities',
      'No performance issues',
      'Proper error handling'
    ],
    steps: [
      { id: 'read-code', description: 'Read code to review — [ ] Read the target files', action: 'read', isRequired: true },
      { id: 'check-style', description: 'Check code style and format — [ ] Verify against project conventions', action: 'analyze', verification: 'Follows project style guide', isRequired: true },
      { id: 'check-security', description: 'Check security vulnerabilities — [ ] Scan for OWASP issues', action: 'analyze', verification: 'No security risks found', isRequired: true },
      { id: 'check-performance', description: 'Check performance issues — [ ] Identify bottlenecks', action: 'analyze', isRequired: true },
      { id: 'check-errors', description: 'Check error handling — [ ] Verify proper error handling', action: 'analyze', verification: 'Errors handled gracefully', isRequired: true },
      { id: 'generate-report', description: 'Generate review report — [ ] Write findings and recommendations', action: 'write', params: { type: 'report' }, isRequired: true },
    ],
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // === 调试类 Skills ===
  {
    id: 'debugging',
    name: 'Debugging',
    description: 'Systematically investigate and fix issues. Stop when blocked, ask for help.',
    category: 'debugging',
    trigger: 'manual',
    announce: 'I\'m using the debugging skill to investigate this issue.',
    applicableRoles: ['developer', 'tester'],
    applicableTemplates: ['software-dev', 'generic'],
    verificationPoints: [
      'Root cause identified',
      'Fix implemented',
      'Tests pass',
      'No regression'
    ],
    steps: [
      { id: 'collect-info', description: 'Collect error info and logs — [ ] Gather context', action: 'read', isRequired: true },
      { id: 'reproduce', description: 'Reproduce the issue — [ ] Verify it\'s reproducible', action: 'bash', verification: 'Issue reproduced', isRequired: true },
      { id: 'locate', description: 'Locate root cause — [ ] Analyze and find source', action: 'analyze', isRequired: true },
      { id: 'propose-fix', description: 'Propose fix approach — [ ] Decide on solution', action: 'ask', isRequired: true },
      { id: 'implement-fix', description: 'Implement the fix — [ ] Make changes', action: 'edit', isRequired: true },
      { id: 'verify-fix', description: 'Verify fix works — [ ] Run tests', action: 'bash', params: { command: 'npm test' }, verification: 'Tests pass', isRequired: true },
      { id: 'check-regression', description: 'Check for regression — [ ] Ensure no side effects', action: 'bash', isRequired: true },
    ],
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // === 完成类 Skills ===
  {
    id: 'finishing-branch',
    name: 'Finishing a Development Branch',
    description: 'Complete development work: verify tests, present options, execute choice.',
    category: 'completion',
    trigger: 'auto',
    announce: 'I\'m using the finishing-a-development-branch skill to complete this work.',
    applicableRoles: ['coordinator', 'developer'],
    applicableTemplates: ['software-dev'],
    requiredSkills: ['executing-plans'],
    verificationPoints: [
      'All tests passing',
      'No uncommitted changes',
      'Branch ready for merge'
    ],
    steps: [
      { id: 'verify-tests', description: 'Verify all tests pass — [ ] Run full test suite', action: 'bash', params: { command: 'npm test' }, verification: 'All tests pass', isRequired: true },
      { id: 'check-changes', description: 'Check for uncommitted changes — [ ] Git status', action: 'bash', params: { command: 'git status' }, isRequired: true },
      { id: 'present-options', description: 'Present completion options — merge/PR/stash', action: 'ask', isRequired: true },
      { id: 'execute-choice', description: 'Execute user\'s choice — merge/PR/stash as requested', action: 'bash', isRequired: true },
    ],
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // === 测试类 Skills ===
  {
    id: 'create-tests',
    name: 'Create Tests',
    description: 'Create comprehensive test cases for features.',
    category: 'testing',
    trigger: 'auto',
    announce: 'I\'m using the create-tests skill to write test cases.',
    applicableRoles: ['tester', 'developer'],
    applicableTemplates: ['software-dev'],
    verificationPoints: [
      'Unit tests cover edge cases',
      'Integration tests cover flows',
      'All tests pass'
    ],
    steps: [
      { id: 'analyze-feature', description: 'Analyze feature requirements — [ ] Read feature spec', action: 'read', isRequired: true },
      { id: 'design-tests', description: 'Design test cases — [ ] Plan coverage', action: 'analyze', isRequired: true },
      { id: 'write-unit', description: 'Write unit tests — [ ] Cover edge cases', action: 'write', params: { type: 'test' }, isRequired: true },
      { id: 'write-integration', description: 'Write integration tests — [ ] Cover user flows', action: 'write', params: { type: 'test' }, isRequired: true },
      { id: 'run-tests', description: 'Run all tests — [ ] Verify coverage', action: 'bash', params: { command: 'npm test' }, verification: 'All tests pass', isRequired: true },
    ],
    isBuiltIn: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// 强制执行的Skills列表 (任务创建时必须调用)
export const REQUIRED_SKILLS_FOR_TASK_CREATION: string[] = ['brainstorming'];

// Skill 工具名称映射 (用于Agent调用)
export const SKILL_TOOL_NAMES: Record<string, string> = {
  'brainstorming': 'brainstorming',
  'writing-plans': 'writing-plans',
  'executing-plans': 'executing-plans',
  'tdd-development': 'tdd-development',
  'code-review': 'code-review',
  'debugging': 'debugging',
  'finishing-branch': 'finishing-branch',
  'create-tests': 'create-tests',
};