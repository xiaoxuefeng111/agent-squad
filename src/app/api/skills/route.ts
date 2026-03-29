import { NextRequest, NextResponse } from 'next/server';
import { loadAllSkills, getSkillById, LoadedSkill } from '@/lib/skills/loader';

// GET /api/skills - 获取所有 skills
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const roleId = searchParams.get('roleId');
  const templateId = searchParams.get('templateId');
  const category = searchParams.get('category');
  const skillId = searchParams.get('id');

  try {
    // 如果指定了ID，返回单个skill
    if (skillId) {
      const skill = getSkillById(skillId);
      if (!skill) {
        return NextResponse.json({ error: 'Skill not found' }, { status: 404 });
      }
      return NextResponse.json(skill);
    }

    // 加载所有skills
    let skills = loadAllSkills();

    // 过滤
    if (roleId) {
      skills = skills.filter(s => s.applicableRoles.includes(roleId));
    }
    if (templateId) {
      skills = skills.filter(s => s.applicableTemplates.includes(templateId));
    }
    if (category) {
      skills = skills.filter(s => s.category === category);
    }

    // 返回简化的skill列表（不包含完整content）
    return NextResponse.json(skills.map(s => ({
      id: s.id,
      name: s.name,
      description: s.description,
      category: s.category,
      trigger: s.trigger,
      announce: s.announce,
      applicableRoles: s.applicableRoles,
      applicableTemplates: s.applicableTemplates,
      steps: s.steps,
      verificationPoints: s.verificationPoints,
      requiredSkills: s.requiredSkills,
      isBuiltIn: s.isBuiltIn,
      isRequired: s.isRequired,
      stepsCount: s.steps.length,
    })));
  } catch (error) {
    console.error('Failed to fetch skills:', error);
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
  }
}