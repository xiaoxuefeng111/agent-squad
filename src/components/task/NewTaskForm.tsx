'use client';

import React, { useState, useEffect } from 'react';
import { ScenarioTemplate, PermissionMode } from '@/types';
import { SkillExecutor } from '@/components/skills';

interface NewTaskFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (task: {
    title: string;
    description: string;
    templateId: string;
    permissionMode: PermissionMode;
    workspacePath: string;
  }) => void;
}

export function NewTaskForm({ isOpen, onClose, onSubmit }: NewTaskFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [templateId, setTemplateId] = useState('');
  const [permissionMode, setPermissionMode] = useState<PermissionMode>('standard');
  const [workspacePath, setWorkspacePath] = useState(process.cwd());
  const [templates, setTemplates] = useState<ScenarioTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  // 强制头脑风暴状态
  const [phase, setPhase] = useState<'input' | 'brainstorming' | 'complete'>('input');
  const [brainstormOutput, setBrainstormOutput] = useState<string>('');
  const [skillCompleted, setSkillCompleted] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setPhase('input');
      setBrainstormOutput('');
      setSkillCompleted(false);
    }
  }, [isOpen]);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/templates');
      const data = await response.json();
      setTemplates(data);
      if (data.length > 0 && !templateId) {
        setTemplateId(data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  // 开始头脑风暴 (强制步骤)
  const handleStartBrainstorming = () => {
    if (!title || !templateId) {
      alert('请填写标题并选择模板');
      return;
    }
    setPhase('brainstorming');
  };

  // 头脑风暴完成
  const handleBrainstormComplete = (output: string) => {
    setBrainstormOutput(output);
    setSkillCompleted(true);
  };

  // 确认创建任务
  const handleConfirm = () => {
    if (!skillCompleted) {
      alert('请先完成头脑风暴');
      return;
    }

    setLoading(true);
    try {
      onSubmit({ title, description, templateId, permissionMode, workspacePath });
      setTitle('');
      setDescription('');
      setPhase('input');
      setBrainstormOutput('');
      setSkillCompleted(false);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-white">创建新任务</h2>
          <div className="text-sm text-gray-400">
            {phase === 'input' && '第 1 步：填写基本信息'}
            {phase === 'brainstorming' && '第 2 步：头脑风暴 (必须完成)'}
            {phase === 'complete' && '第 3 步：确认创建'}
          </div>
        </div>

        {/* Phase 1: 输入基本信息 */}
        {phase === 'input' && (
          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 mb-2">任务标题 *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="输入任务标题"
                required
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">任务描述</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 h-20"
                placeholder="描述你的任务需求"
              />
            </div>

            <div>
              <label className="block text-gray-300 mb-2">场景模板 *</label>
              <select
                value={templateId}
                onChange={(e) => setTemplateId(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                required
              >
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} - {t.description}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">权限模式</label>
              <div className="grid grid-cols-3 gap-2">
                {(['strict', 'standard', 'trusted'] as PermissionMode[]).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => setPermissionMode(mode)}
                    className={`px-3 py-2 rounded-md text-sm transition-colors ${
                      permissionMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                    }`}
                  >
                    {mode === 'strict' ? '严格' : mode === 'standard' ? '标准' : '信任'}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-gray-300 mb-2">工作路径</label>
              <input
                type="text"
                value={workspacePath}
                onChange={(e) => setWorkspacePath(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            {/* 强制提示 */}
            <div className="bg-yellow-900/30 border border-yellow-600 rounded-md p-3">
              <p className="text-yellow-400 text-sm">
                ⚠ 重要提示：创建任务前必须完成头脑风暴分析
              </p>
              <p className="text-gray-400 text-xs mt-1">
                系统将使用 superpowers:brainstorming 技能进行需求分析和设计
              </p>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleStartBrainstorming}
                disabled={!title || !templateId}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                🧠 开始头脑风暴 →
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors">
                取消
              </button>
            </div>
          </div>
        )}

        {/* Phase 2: 头脑风暴 Skill 执行 */}
        {phase === 'brainstorming' && (
          <div className="space-y-4">
            <SkillExecutor
              skillId="brainstorming"
              context={{ title, description, templateId }}
              onComplete={handleBrainstormComplete}
              onCancel={() => setPhase('input')}
            />

            {skillCompleted && (
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setPhase('complete')}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md text-sm font-medium transition-colors"
                >
                  ✓ 分析完成，继续创建 →
                </button>
                <button
                  type="button"
                  onClick={() => setPhase('input')}
                  className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
                >
                  返回修改
                </button>
              </div>
            )}
          </div>
        )}

        {/* Phase 3: 确认创建 */}
        {phase === 'complete' && (
          <div className="space-y-4">
            <div className="bg-gray-700 rounded-md p-4">
              <h3 className="text-white font-medium mb-2">任务信息</h3>
              <div className="space-y-2 text-sm">
                <p className="text-gray-300"><span className="text-gray-500">标题:</span> {title}</p>
                <p className="text-gray-300"><span className="text-gray-500">模板:</span> {templates.find(t => t.id === templateId)?.name}</p>
                <p className="text-gray-300"><span className="text-gray-500">权限:</span> {permissionMode}</p>
              </div>
            </div>

            <div className="bg-gray-700 rounded-md p-4">
              <h3 className="text-white font-medium mb-2">分析结果摘要</h3>
              <div className="text-gray-300 text-sm max-h-48 overflow-y-auto">
                <pre className="whitespace-pre-wrap">{brainstormOutput.slice(0, 500)}...</pre>
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={handleConfirm}
                disabled={loading}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
              >
                {loading ? '创建中...' : '✓ 确认创建任务'}
              </button>
              <button
                type="button"
                onClick={() => setPhase('brainstorming')}
                className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
              >
                返回分析
              </button>
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors">
                取消
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}