'use client';

import React, { useState, useEffect } from 'react';
import { Skill, SkillCategory, SkillStep } from '@/types/skills';

interface SkillManagerProps {
  isOpen: boolean;
  onClose: () => void;
  roleId?: string;
  templateId?: string;
}

interface ScannedSkill {
  name: string;
  path: string;
  skillId: string;
  isDuplicate: boolean;
  hasSKILLMd: boolean;
  error?: string;
}

const CATEGORIES: { value: SkillCategory; label: string }[] = [
  { value: 'planning', label: '规划' },
  { value: 'development', label: '开发' },
  { value: 'testing', label: '测试' },
  { value: 'review', label: '审查' },
  { value: 'debugging', label: '调试' },
  { value: 'documentation', label: '文档' },
  { value: 'analysis', label: '分析' },
  { value: 'execution', label: '执行' },
  { value: 'completion', label: '完成' },
  { value: 'custom', label: '自定义' },
];

export function SkillManager({ isOpen, onClose, roleId, templateId }: SkillManagerProps) {
  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(false);
  const [showImporter, setShowImporter] = useState(false);

  // 导入状态
  const [importPath, setImportPath] = useState('');
  const [scannedSkills, setScannedSkills] = useState<ScannedSkill[]>([]);
  const [scanning, setScanning] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ message: string; imported: number; skipped: number } | null>(null);

  useEffect(() => {
    if (isOpen) fetchSkills();
  }, [isOpen, roleId, templateId]);

  const fetchSkills = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (roleId) params.set('roleId', roleId);
      if (templateId) params.set('templateId', templateId);

      const response = await fetch(`/api/skills?${params}`);
      const data = await response.json();
      setSkills(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch skills:', error);
    } finally {
      setLoading(false);
    }
  };

  // 扫描目录
  const handleScanDirectory = async () => {
    if (!importPath.trim()) {
      alert('请输入目录路径');
      return;
    }

    setScanning(true);
    setImportResult(null);

    try {
      const response = await fetch('/api/skills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'scan',
          directoryPath: importPath
        }),
      });

      const data = await response.json();

      if (data.skills) {
        setScannedSkills(data.skills);
      } else if (data.error) {
        alert(data.error);
      }
    } catch (error) {
      alert('扫描失败: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setScanning(false);
    }
  };

  // 执行导入
  const handleImport = async () => {
    setImporting(true);

    try {
      const validSkills = scannedSkills.filter(s => s.hasSKILLMd && !s.isDuplicate && !s.error);

      if (validSkills.length === 0) {
        alert('没有可导入的skill（全部重复或有错误）');
        setImporting(false);
        return;
      }

      const response = await fetch('/api/skills/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import-all',
          skills: validSkills
        }),
      });

      const data = await response.json();

      if (data.success) {
        setImportResult({
          message: data.message,
          imported: data.imported,
          skipped: data.skipped
        });
        fetchSkills();
      } else {
        alert(data.error || '导入失败');
      }
    } catch (error) {
      alert('导入失败: ' + (error instanceof Error ? error.message : 'Unknown'));
    } finally {
      setImporting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除此 Skill？')) return;

    try {
      await fetch(`/api/skills/import?id=${id}`, { method: 'DELETE' });
      fetchSkills();
    } catch (error) {
      console.error('Failed to delete skill:', error);
    }
  };

  if (!isOpen) return null;

  const getCategoryLabel = (cat: SkillCategory) => {
    return CATEGORIES.find(c => c.value === cat)?.label || cat;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">Skill 管理</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">✕</button>
        </div>

        {/* 主列表 */}
        {!showImporter ? (
          <>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => {
                  setShowImporter(true);
                  setScannedSkills([]);
                  setImportPath('');
                  setImportResult(null);
                }}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
              >
                📥 导入 Skill 目录
              </button>
            </div>

            {/* Skill 列表 */}
            {loading ? (
              <div className="text-gray-400 text-center py-8">加载中...</div>
            ) : skills.length === 0 ? (
              <div className="text-gray-400 text-center py-8">暂无 Skill</div>
            ) : (
              <div className="space-y-3">
                {skills.map((skill) => (
                  <div key={skill.id} className="bg-gray-700 rounded-md p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-white font-medium">{skill.name}</span>
                          {skill.isBuiltIn && (
                            <span className="bg-blue-600 text-xs px-2 py-0.5 rounded">内置</span>
                          )}
                          {!skill.isBuiltIn && (
                            <span className="bg-purple-600 text-xs px-2 py-0.5 rounded">自定义</span>
                          )}
                          {skill.isRequired && (
                            <span className="bg-red-600 text-xs px-2 py-0.5 rounded">强制</span>
                          )}
                          <span className="bg-gray-600 text-xs px-2 py-0.5 rounded">
                            {getCategoryLabel(skill.category)}
                          </span>
                        </div>
                        <p className="text-gray-400 text-sm mt-1">{skill.description}</p>
                        {skill.announce && (
                          <p className="text-blue-400 text-xs mt-1 italic">{skill.announce}</p>
                        )}
                        <div className="text-gray-500 text-xs mt-2">
                          {(skill.stepsCount || skill.steps?.length || 0)} 个步骤 · 触发: {skill.trigger === 'auto' ? '自动' : '手动'}
                          {skill.requiredSkills && skill.requiredSkills.length > 0 && (
                            <span className="ml-2">· 依赖: {skill.requiredSkills.join(', ')}</span>
                          )}
                        </div>
                        {/* 显示步骤checklist */}
                        {skill.steps && skill.steps.length > 0 && (
                          <div className="mt-2 text-xs text-gray-400 max-h-20 overflow-y-auto">
                            {skill.steps.slice(0, 5).map((step, i) => (
                              <div key={step.id || i} className="flex items-center gap-1">
                                <span className="text-gray-500">☐</span>
                                <span>{step.description}</span>
                              </div>
                            ))}
                            {skill.steps.length > 5 && (
                              <span className="text-gray-500">... 还有 {skill.steps.length - 5} 步</span>
                            )}
                          </div>
                        )}
                      </div>
                      {!skill.isBuiltIn && (
                        <button
                          onClick={() => handleDelete(skill.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          删除
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          /* 导入面板 */
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-md p-4">
              <h3 className="text-white font-medium mb-3">导入本地 Skill 目录</h3>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={importPath}
                  onChange={(e) => setImportPath(e.target.value)}
                  placeholder="输入包含 skill 目录的路径（每个skill是一个包含SKILL.md的目录）"
                  className="flex-1 bg-gray-600 border border-gray-500 rounded-md px-3 py-2 text-white text-sm"
                />
                <button
                  onClick={handleScanDirectory}
                  disabled={scanning}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
                >
                  {scanning ? '扫描中...' : '扫描'}
                </button>
              </div>

              <p className="text-gray-400 text-xs mt-2">
                目录结构要求：每个skill是一个子目录，包含SKILL.md文件
              </p>
              <pre className="text-gray-500 text-xs mt-1 bg-gray-800 p-2 rounded">
{`skills-to-import/
├── my-skill/
│   ├── SKILL.md          # 必须有
│   └── references/       # 可选
│       └── guide.md
└── another-skill/
    └── SKILL.md`}
              </pre>
            </div>

            {/* 扫描结果 */}
            {scannedSkills.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-gray-300 font-medium">扫描结果 ({scannedSkills.length} 个目录)</h4>

                {scannedSkills.map((item) => (
                  <div key={item.skillId} className={`bg-gray-700 rounded-md p-3 ${
                    item.isDuplicate ? 'border border-yellow-600' :
                    item.error ? 'border border-red-600' : 'border border-green-600'
                  }`}>
                    <div className="flex justify-between items-center">
                      <div>
                        <span className="text-white font-medium">{item.name}</span>
                        {item.isDuplicate && (
                          <span className="text-yellow-400 text-xs ml-2">⚠ 与现有skill重复 (已跳过)</span>
                        )}
                        {item.error && (
                          <span className="text-red-400 text-xs ml-2">✗ {item.error}</span>
                        )}
                        {!item.isDuplicate && !item.error && item.hasSKILLMd && (
                          <span className="text-green-400 text-xs ml-2">✓ 可导入</span>
                        )}
                      </div>
                      <span className="text-gray-400 text-xs">{item.skillId}</span>
                    </div>
                  </div>
                ))}

                {/* 导入统计 */}
                <div className="bg-gray-700 rounded-md p-3 mt-4">
                  <div className="text-sm text-gray-300">
                    <span className="text-green-400">
                      可导入: {scannedSkills.filter(s => s.hasSKILLMd && !s.isDuplicate && !s.error).length}
                    </span>
                    <span className="text-yellow-400 ml-4">
                      重复跳过: {scannedSkills.filter(s => s.isDuplicate).length}
                    </span>
                    <span className="text-red-400 ml-4">
                      格式错误: {scannedSkills.filter(s => s.error || !s.hasSKILLMd).length}
                    </span>
                  </div>
                </div>

                {/* 导入按钮 */}
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={handleImport}
                    disabled={importing || scannedSkills.filter(s => s.hasSKILLMd && !s.isDuplicate && !s.error).length === 0}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
                  >
                    {importing ? '导入中...' : `导入全部 (${scannedSkills.filter(s => s.hasSKILLMd && !s.isDuplicate && !s.error).length})`}
                  </button>
                  <button
                    onClick={() => setShowImporter(false)}
                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 text-sm"
                  >
                    取消
                  </button>
                </div>
              </div>
            )}

            {/* 导入结果 */}
            {importResult && (
              <div className="bg-green-900/30 border border-green-600 rounded-md p-3">
                <p className="text-green-400 font-medium">{importResult.message}</p>
                <p className="text-gray-400 text-sm mt-1">
                  导入: {importResult.imported} · 跳过: {importResult.skipped}
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}