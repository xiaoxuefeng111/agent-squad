import React, { useState, useEffect } from 'react';
import { ScenarioTemplate, PermissionMode } from '@/types';

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

  // Fetch templates on mount
  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !templateId) return;

    setLoading(true);
    try {
      onSubmit({
        title,
        description,
        templateId,
        permissionMode,
        workspacePath,
      });

      // Reset form
      setTitle('');
      setDescription('');
      onClose();
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-white mb-4">创建新任务</h2>

        <form onSubmit={handleSubmit}>
          {/* Task Title */}
          <div className="mb-4">
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

          {/* Task Description */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">任务描述</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 h-20"
              placeholder="详细描述任务需求"
            />
          </div>

          {/* Template Selection */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">场景模板 *</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name} - {template.description}
                </option>
              ))}
            </select>
          </div>

          {/* Permission Mode */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">权限模式</label>
            <div className="grid grid-cols-3 gap-2">
              {(['strict', 'standard', 'trusted'] as PermissionMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPermissionMode(mode)}
                  className={`px-3 py-2 rounded-md text-sm transition-colors ${
                    permissionMode === mode
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {mode === 'strict' && '严格'}
                  {mode === 'standard' && '标准'}
                  {mode === 'trusted' && '信任'}
                </button>
              ))}
            </div>
            <p className="text-gray-400 text-xs mt-2">
              {permissionMode === 'strict' && '严格模式：所有操作需确认，只能读取文件'}
              {permissionMode === 'standard' && '标准模式：常规操作自主执行，敏感操作需确认'}
              {permissionMode === 'trusted' && '信任模式：全自主执行，无需确认'}
            </p>
          </div>

          {/* Workspace Path */}
          <div className="mb-6">
            <label className="block text-gray-300 mb-2">工作目录</label>
            <input
              type="text"
              value={workspacePath}
              onChange={(e) => setWorkspacePath(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="工作目录路径"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              disabled={loading || !title || !templateId}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '创建中...' : '创建任务'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}