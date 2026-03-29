/**
 * Skill Loader - 从文件系统加载skill定义
 * 支持两种格式：
 * 1. 目录格式: skills/built-in/brainstorming/SKILL.md (superpowers格式)
 * 2. 单文件格式: skills/custom/my-skill.skill.md
 */

import fs from 'fs';
import path from 'path';

const SKILLS_DIR = path.join(process.cwd(), 'skills');
const BUILTIN_DIR = path.join(SKILLS_DIR, 'built-in');
const CUSTOM_DIR = path.join(SKILLS_DIR, 'custom');

export interface SkillMetadata {
  name: string;
  description: string;
  type?: string;
  trigger?: 'auto' | 'manual';
  isRequired?: boolean;
  requiredSkills?: string[];
}

export interface LoadedSkill {
  id: string;
  name: string;
  description: string;
  category: string;
  trigger: 'auto' | 'manual';
  announce?: string;
  applicableRoles: string[];
  applicableTemplates: string[];
  steps: {
    id: string;
    description: string;
    action: string;
    params?: Record<string, any>;
    verification?: string;
    skillReference?: string;
    isRequired?: boolean;
  }[];
  verificationPoints?: string[];
  requiredSkills?: string[];
  isBuiltIn: boolean;
  isRequired?: boolean;
  content: string; // 完整的skill markdown内容
  filePath: string;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * 解析skill markdown文件的frontmatter和内容
 */
function parseSkillFile(content: string, filePath: string): { metadata: SkillMetadata; body: string } {
  // 默认元数据
  const defaultMetadata: SkillMetadata = {
    name: path.basename(path.dirname(filePath)),
    description: '',
    trigger: 'manual',
    isRequired: false,
  };

  // 检查是否有frontmatter
  const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

  if (!frontmatterMatch) {
    return { metadata: defaultMetadata, body: content };
  }

  const frontmatter = frontmatterMatch[1];
  const body = frontmatterMatch[2];

  // 解析frontmatter
  const metadata: SkillMetadata = { ...defaultMetadata };
  const lines = frontmatter.split('\n');

  for (const line of lines) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim();
    let value: any = line.slice(colonIndex + 1).trim();

    // 移除引号
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }

    switch (key) {
      case 'name':
        metadata.name = value;
        break;
      case 'description':
        metadata.description = value;
        break;
      case 'type':
        metadata.type = value;
        break;
      case 'trigger':
        metadata.trigger = value === 'auto' ? 'auto' : 'manual';
        break;
      case 'isRequired':
        metadata.isRequired = value === 'true';
        break;
      case 'requiredSkills':
        if (Array.isArray(value)) {
          metadata.requiredSkills = value;
        } else if (typeof value === 'string') {
          metadata.requiredSkills = value.split(',').map(s => s.trim());
        }
        break;
    }
  }

  return { metadata, body };
}

/**
 * 从skill内容提取checklist步骤
 */
function extractChecklistSteps(body: string): LoadedSkill['steps'] {
  const steps: LoadedSkill['steps'] = [];
  const lines = body.split('\n');
  let stepIndex = 0;

  for (const line of lines) {
    // 匹配 - [ ] 或 * [ ] 格式的checklist项
    const checkboxMatch = line.match(/^\s*[-*]\s*\[([ x])\]\s*\*\*(.+?)\*\*\s*[—-]\s*(.+)$/);
    if (checkboxMatch) {
      const stepName = checkboxMatch[2].trim();
      const stepDesc = checkboxMatch[3].trim();
      steps.push({
        id: `step-${stepIndex++}`,
        description: `${stepName}: ${stepDesc}`,
        action: inferActionFromDescription(stepDesc),
        isRequired: true,
      });
      continue;
    }

    // 简单的checklist格式
    const simpleMatch = line.match(/^\s*[-*]\s*\[([ x])\]\s*(.+)$/);
    if (simpleMatch) {
      const description = simpleMatch[2].trim();
      // 跳过验证点类型的checklist
      if (description.toLowerCase().includes('verification') || description.toLowerCase().includes('验证')) {
        continue;
      }
      steps.push({
        id: `step-${stepIndex++}`,
        description,
        action: inferActionFromDescription(description),
        isRequired: true,
      });
    }
  }

  return steps;
}

/**
 * 根据描述推断动作类型
 */
function inferActionFromDescription(description: string): string {
  const lower = description.toLowerCase();

  if (lower.includes('read') || lower.includes('读取') || lower.includes('check file')) {
    return 'read';
  }
  if (lower.includes('write') || lower.includes('写入') || lower.includes('create')) {
    return 'write';
  }
  if (lower.includes('edit') || lower.includes('修改') || lower.includes('update')) {
    return 'edit';
  }
  if (lower.includes('run') || lower.includes('执行') || lower.includes('command')) {
    return 'bash';
  }
  if (lower.includes('ask') || lower.includes('询问') || lower.includes('question')) {
    return 'ask';
  }
  if (lower.includes('invoke') || lower.includes('call') || lower.includes('skill')) {
    return 'skill';
  }

  return 'analyze';
}

/**
 * 从内容提取验证点
 */
function extractVerificationPoints(body: string): string[] {
  const points: string[] = [];
  const lines = body.split('\n');

  let inVerificationSection = false;

  for (const line of lines) {
    const lower = line.toLowerCase();

    // 检查是否进入验证点部分
    if (lower.includes('verification point') || lower.includes('验证点')) {
      inVerificationSection = true;
      continue;
    }

    // 遇到新标题，退出验证点部分
    if (line.startsWith('## ') && inVerificationSection) {
      inVerificationSection = false;
      continue;
    }

    // 提取checklist项作为验证点
    if (inVerificationSection) {
      const match = line.match(/^\s*[-*]\s*\[[ x]\]\s*(.+)$/);
      if (match) {
        points.push(match[1].trim());
      }
    }
  }

  return points;
}

/**
 * 加载单个skill文件
 */
function loadSkillFile(skillPath: string, isBuiltIn: boolean): LoadedSkill | null {
  try {
    if (!fs.existsSync(skillPath)) {
      return null;
    }

    const content = fs.readFileSync(skillPath, 'utf-8');
    const stats = fs.statSync(skillPath);
    const { metadata, body } = parseSkillFile(content, skillPath);

    // 提取步骤和验证点
    const steps = extractChecklistSteps(body);
    const verificationPoints = extractVerificationPoints(body);

    // 从目录名或文件名推断skill id
    let skillId: string;
    if (skillPath.includes('SKILL.md')) {
      skillId = path.basename(path.dirname(skillPath));
    } else {
      skillId = path.basename(skillPath, '.skill.md');
    }

    // 查找announce声明
    const announceMatch = body.match(/\*\*Announce at start:\*\*\s*["']?(.+?)["']?(?:\n|$)/i);
    const announce = announceMatch ? announceMatch[1].trim() : undefined;

    return {
      id: skillId,
      name: metadata.name || skillId,
      description: metadata.description || '',
      category: (metadata.type as any) || 'custom',
      trigger: metadata.trigger || 'manual',
      announce,
      applicableRoles: [],
      applicableTemplates: [],
      steps,
      verificationPoints,
      requiredSkills: metadata.requiredSkills,
      isBuiltIn,
      isRequired: metadata.isRequired,
      content,
      filePath: skillPath,
      createdAt: stats.birthtime,
      updatedAt: stats.mtime,
    };
  } catch (error) {
    console.error(`Failed to load skill from ${skillPath}:`, error);
    return null;
  }
}

/**
 * 加载所有内置skills
 */
export function loadBuiltinSkills(): LoadedSkill[] {
  const skills: LoadedSkill[] = [];

  if (!fs.existsSync(BUILTIN_DIR)) {
    return skills;
  }

  const entries = fs.readdirSync(BUILTIN_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      // 目录格式: brainstorming/SKILL.md
      const skillPath = path.join(BUILTIN_DIR, entry.name, 'SKILL.md');
      const skill = loadSkillFile(skillPath, true);
      if (skill) {
        skills.push(skill);
      }
    } else if (entry.name.endsWith('.skill.md')) {
      // 单文件格式: my-skill.skill.md
      const skillPath = path.join(BUILTIN_DIR, entry.name);
      const skill = loadSkillFile(skillPath, true);
      if (skill) {
        skills.push(skill);
      }
    }
  }

  return skills;
}

/**
 * 加载所有自定义skills
 */
export function loadCustomSkills(): LoadedSkill[] {
  const skills: LoadedSkill[] = [];

  if (!fs.existsSync(CUSTOM_DIR)) {
    return skills;
  }

  const entries = fs.readdirSync(CUSTOM_DIR, { withFileTypes: true });

  for (const entry of entries) {
    if (entry.isDirectory()) {
      const skillPath = path.join(CUSTOM_DIR, entry.name, 'SKILL.md');
      const skill = loadSkillFile(skillPath, false);
      if (skill) {
        skills.push(skill);
      }
    } else if (entry.name.endsWith('.skill.md') || entry.name.endsWith('.json')) {
      const skillPath = path.join(CUSTOM_DIR, entry.name);
      const skill = loadSkillFile(skillPath, false);
      if (skill) {
        skills.push(skill);
      }
    }
  }

  return skills;
}

/**
 * 加载所有skills（内置 + 自定义）
 */
export function loadAllSkills(): LoadedSkill[] {
  return [...loadBuiltinSkills(), ...loadCustomSkills()];
}

/**
 * 根据ID获取单个skill
 */
export function getSkillById(skillId: string): LoadedSkill | null {
  const allSkills = loadAllSkills();
  return allSkills.find(s => s.id === skillId) || null;
}

/**
 * 获取skill的完整内容（用于Agent执行）
 */
export function getSkillContent(skillId: string): string | null {
  const skill = getSkillById(skillId);
  return skill?.content || null;
}

/**
 * 获取强制执行的skill IDs
 */
export function getRequiredSkillIds(): string[] {
  const skills = loadAllSkills();
  return skills.filter(s => s.isRequired).map(s => s.id);
}