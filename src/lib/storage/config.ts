import { ScenarioTemplate, AgentRole, AppConfig } from '@/types';
import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'data', 'config.json');

// Default agent roles for each scenario
const SOFTWARE_DEV_ROLES: AgentRole[] = [
  {
    id: 'architect',
    name: '架构师',
    description: '分析需求，设计系统架构和技术方案',
    capabilities: ['需求分析', '架构设计', '技术选型', '风险评估'],
    tools: ['read', 'glob', 'grep', 'webSearch'],
  },
  {
    id: 'developer',
    name: '开发工程师',
    description: '实现代码，编写单元测试，进行代码重构',
    capabilities: ['代码实现', '单元测试', '代码重构', '调试修复'],
    tools: ['read', 'write', 'edit', 'bash'],
  },
  {
    id: 'reviewer',
    name: '代码审查员',
    description: '审查代码质量，发现潜在问题，提出改进建议',
    capabilities: ['代码审查', '安全检查', '性能分析', '最佳实践'],
    tools: ['read', 'glob', 'grep'],
  },
  {
    id: 'tester',
    name: '测试工程师',
    description: '编写测试用例，执行测试，验证功能正确性',
    capabilities: ['测试设计', '自动化测试', '集成测试', '回归测试'],
    tools: ['read', 'write', 'bash'],
  },
];

const PROJECT_MGMT_ROLES: AgentRole[] = [
  {
    id: 'pm',
    name: '项目经理',
    description: '规划项目进度，分配任务，监控执行状态',
    capabilities: ['进度规划', '任务分配', '状态跟踪', '风险管理'],
    tools: ['read', 'write', 'webSearch'],
  },
  {
    id: 'coordinator',
    name: '协调员',
    description: '协调团队沟通，处理冲突，促进协作',
    capabilities: ['团队协调', '沟通管理', '冲突解决', '资源调配'],
    tools: ['read', 'write'],
  },
  {
    id: 'tracker',
    name: '进度跟踪员',
    description: '跟踪任务进度，生成报告，预警延期风险',
    capabilities: ['进度跟踪', '报告生成', '风险预警', '数据分析'],
    tools: ['read', 'write', 'bash'],
  },
];

const CONTENT_CREATION_ROLES: AgentRole[] = [
  {
    id: 'researcher',
    name: '内容研究员',
    description: '调研主题，收集素材，分析受众需求',
    capabilities: ['主题调研', '素材收集', '受众分析', '竞品分析'],
    tools: ['read', 'webSearch', 'webFetch'],
  },
  {
    id: 'writer',
    name: '内容创作者',
    description: '撰写内容，优化表达，保持风格一致',
    capabilities: ['内容撰写', '文案优化', '风格调整', '多语言支持'],
    tools: ['read', 'write', 'edit'],
  },
  {
    id: 'editor',
    name: '编辑审核员',
    description: '审核内容质量，校对错误，提出修改建议',
    capabilities: ['质量审核', '错误校对', '风格统一', '合规检查'],
    tools: ['read', 'edit'],
  },
  {
    id: 'publisher',
    name: '发布协调员',
    description: '准备发布物料，协调发布流程，跟踪发布效果',
    capabilities: ['发布准备', '流程协调', '效果跟踪', '反馈收集'],
    tools: ['read', 'write', 'bash'],
  },
];

const GENERIC_ROLES: AgentRole[] = [
  {
    id: 'analyst',
    name: '任务分析师',
    description: '分析任务需求，分解复杂问题，制定执行计划',
    capabilities: ['需求分析', '问题分解', '计划制定', '可行性评估'],
    tools: ['read', 'glob', 'grep', 'webSearch'],
  },
  {
    id: 'executor',
    name: '执行者',
    description: '执行具体操作，完成分配任务，报告执行结果',
    capabilities: ['任务执行', '操作实施', '结果报告', '异常处理'],
    tools: ['read', 'write', 'edit', 'bash'],
  },
  {
    id: 'validator',
    name: '验证员',
    description: '验证任务完成度，检查结果质量，确认目标达成',
    capabilities: ['结果验证', '质量检查', '目标确认', '反馈整理'],
    tools: ['read', 'glob', 'grep'],
  },
];

// Default templates for the four scenarios
export const DEFAULT_TEMPLATES: ScenarioTemplate[] = [
  {
    id: 'software-dev',
    name: '软件开发',
    description: '完整的软件开发生命周期，从需求分析到测试验收',
    roles: SOFTWARE_DEV_ROLES,
    flow: ['architect', 'developer', 'reviewer', 'tester'],
  },
  {
    id: 'project-mgmt',
    name: '项目管理',
    description: '项目规划、进度跟踪和团队协调',
    roles: PROJECT_MGMT_ROLES,
    flow: ['pm', 'coordinator', 'tracker'],
  },
  {
    id: 'content-creation',
    name: '内容创作',
    description: '从调研到发布的内容创作流程',
    roles: CONTENT_CREATION_ROLES,
    flow: ['researcher', 'writer', 'editor', 'publisher'],
  },
  {
    id: 'generic',
    name: '通用任务',
    description: '适用于各种通用任务的协作流程',
    roles: GENERIC_ROLES,
    flow: ['analyst', 'executor', 'validator'],
  },
];

// Default configuration
export const DEFAULT_CONFIG: AppConfig = {
  templates: DEFAULT_TEMPLATES,
  customRoles: [],
  defaultPermissionMode: 'standard',
  storageLimits: {
    maxConversationLogSize: 1073741824, // 1GB
    maxTaskHistory: 1000,
    maxTotalStorage: 10737418240, // 10GB
  },
};

export function getConfig(): AppConfig {
  try {
    if (!fs.existsSync(CONFIG_PATH)) {
      // Create default config file
      const dataDir = path.dirname(CONFIG_PATH);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
      return DEFAULT_CONFIG;
    }
    const content = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(content) as AppConfig;

    // Merge with defaults to ensure all fields exist
    return {
      ...DEFAULT_CONFIG,
      ...config,
      storageLimits: {
        ...DEFAULT_CONFIG.storageLimits,
        ...config.storageLimits,
      },
    };
  } catch (error) {
    console.error('Error loading config:', error);
    return DEFAULT_CONFIG;
  }
}

export function saveConfig(config: AppConfig): void {
  const dataDir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export function getTemplates(): ScenarioTemplate[] {
  const config = getConfig();
  return config.templates.length > 0 ? config.templates : DEFAULT_TEMPLATES;
}

export function getTemplateById(id: string): ScenarioTemplate | null {
  const templates = getTemplates();
  return templates.find(t => t.id === id) || null;
}

export function addCustomRole(role: AgentRole): void {
  const config = getConfig();
  config.customRoles.push(role);
  saveConfig(config);
}

export function removeCustomRole(roleId: string): void {
  const config = getConfig();
  config.customRoles = config.customRoles.filter(r => r.id !== roleId);
  saveConfig(config);
}

export function updateTemplate(template: ScenarioTemplate): void {
  const config = getConfig();
  const index = config.templates.findIndex(t => t.id === template.id);
  if (index >= 0) {
    config.templates[index] = template;
  } else {
    config.templates.push(template);
  }
  saveConfig(config);
}

export function removeTemplate(templateId: string): void {
  const config = getConfig();
  config.templates = config.templates.filter(t => t.id !== templateId);
  saveConfig(config);
}