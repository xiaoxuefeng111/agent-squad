import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { loadAllSkills, LoadedSkill } from '@/lib/skills/loader';

const CUSTOM_DIR = path.join(process.cwd(), 'skills', 'custom');

// 确保目录存在
function ensureCustomDir() {
  if (!fs.existsSync(CUSTOM_DIR)) {
    fs.mkdirSync(CUSTOM_DIR, { recursive: true });
  }
}

// GET /api/skills/import - 获取已导入的自定义skill列表
export async function GET() {
  try {
    const allSkills = loadAllSkills();
    const customSkills = allSkills.filter(s => !s.isBuiltIn);

    return NextResponse.json({
      skills: customSkills.map(s => ({
        id: s.id,
        name: s.name,
        description: s.description,
        category: s.category,
        trigger: s.trigger,
        stepsCount: s.steps.length,
        filePath: s.filePath,
      }))
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to list custom skills' },
      { status: 500 }
    );
  }
}

// POST /api/skills/import - 扫描和导入skill目录
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { action, directoryPath, skillData } = body;

    // action: 'scan' | 'import' | 'import-all'

    if (action === 'scan') {
      // 扫描用户指定的目录
      if (!directoryPath || !fs.existsSync(directoryPath)) {
        return NextResponse.json({ error: '目录不存在' }, { status: 400 });
      }

      const existingSkills = loadAllSkills();
      const existingIds = new Set(existingSkills.map(s => s.id));

      const scannedSkills: {
        name: string;
        path: string;
        skillId: string;
        isDuplicate: boolean;
        hasSKILLMd: boolean;
        error?: string;
      }[] = [];

      const entries = fs.readdirSync(directoryPath, { withFileTypes: true });

      for (const entry of entries) {
        if (!entry.isDirectory()) continue;

        const skillDir = path.join(directoryPath, entry.name);
        const skillMdPath = path.join(skillDir, 'SKILL.md');

        const result: typeof scannedSkills[0] = {
          name: entry.name,
          path: skillDir,
          skillId: entry.name,
          isDuplicate: false,
          hasSKILLMd: false,
        };

        // 检查是否有SKILL.md
        if (fs.existsSync(skillMdPath)) {
          result.hasSKILLMd = true;

          // 尝试解析获取skill id
          try {
            const content = fs.readFileSync(skillMdPath, 'utf-8');
            const nameMatch = content.match(/^name:\s*["']?(\S+)["']?/m);
            if (nameMatch) {
              result.skillId = nameMatch[1];
            }

            // 检查是否重复
            result.isDuplicate = existingIds.has(result.skillId);
          } catch (e) {
            result.error = '解析失败';
          }
        } else {
          result.error = '缺少SKILL.md文件';
        }

        scannedSkills.push(result);
      }

      return NextResponse.json({
        skills: scannedSkills,
        summary: {
          total: scannedSkills.length,
          valid: scannedSkills.filter(s => s.hasSKILLMd && !s.isDuplicate).length,
          duplicates: scannedSkills.filter(s => s.isDuplicate).length,
          invalid: scannedSkills.filter(s => s.error).length,
        }
      });
    }

    if (action === 'import' || action === 'import-all') {
      ensureCustomDir();

      let skillsToImport: { path: string; skillId: string }[] = [];

      if (action === 'import-all') {
        const { skills } = body;
        skillsToImport = skills.filter((s: any) => !s.isDuplicate && s.hasSKILLMd);
      } else {
        // 导入单个
        if (!skillData?.path) {
          return NextResponse.json({ error: '缺少skill路径' }, { status: 400 });
        }
        skillsToImport = [{ path: skillData.path, skillId: skillData.skillId }];
      }

      const imported: { id: string; name: string }[] = [];
      const skipped: { id: string; reason: string }[] = [];

      const existingSkills = loadAllSkills();
      const existingIds = new Set(existingSkills.map(s => s.id));

      for (const skillInfo of skillsToImport) {
        // 再次检查重复
        if (existingIds.has(skillInfo.skillId)) {
          skipped.push({ id: skillInfo.skillId, reason: '与现有skill重复' });
          continue;
        }

        // 检查源目录
        if (!fs.existsSync(skillInfo.path)) {
          skipped.push({ id: skillInfo.skillId, reason: '源目录不存在' });
          continue;
        }

        // 复制整个目录到custom
        const targetDir = path.join(CUSTOM_DIR, skillInfo.skillId);

        try {
          // 如果目标已存在，先删除
          if (fs.existsSync(targetDir)) {
            fs.rmSync(targetDir, { recursive: true });
          }

          // 复制目录
          fs.cpSync(skillInfo.path, targetDir, { recursive: true });

          // 获取skill名称
          const skillMdPath = path.join(targetDir, 'SKILL.md');
          let skillName = skillInfo.skillId;
          if (fs.existsSync(skillMdPath)) {
            const content = fs.readFileSync(skillMdPath, 'utf-8');
            const nameMatch = content.match(/^name:\s*["']?(.+?)["']?$/m);
            if (nameMatch) {
              skillName = nameMatch[1];
            }
          }

          imported.push({ id: skillInfo.skillId, name: skillName });
          existingIds.add(skillInfo.skillId); // 避免重复导入
        } catch (e) {
          skipped.push({ id: skillInfo.skillId, reason: `复制失败: ${e instanceof Error ? e.message : 'Unknown'}` });
        }
      }

      return NextResponse.json({
        success: true,
        imported: imported.length,
        skipped: skipped.length,
        importedSkills: imported,
        skippedSkills: skipped,
        message: `成功导入 ${imported.length} 个skill，跳过 ${skipped.length} 个`
      });
    }

    return NextResponse.json({ error: '无效的操作' }, { status: 400 });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// DELETE /api/skills/import - 删除自定义skill
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skillId = searchParams.get('id');

    if (!skillId) {
      return NextResponse.json({ error: '缺少skill id' }, { status: 400 });
    }

    const skillDir = path.join(CUSTOM_DIR, skillId);

    if (!fs.existsSync(skillDir)) {
      return NextResponse.json({ error: 'Skill不存在' }, { status: 404 });
    }

    fs.rmSync(skillDir, { recursive: true });

    return NextResponse.json({ success: true, message: `已删除skill: ${skillId}` });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}