'use client';

import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyPreview, setApiKeyPreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      fetchSettings();
    }
  }, [isOpen]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setHasApiKey(data.hasApiKey);
      setApiKeyPreview(data.apiKeyPreview);
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleSave = async () => {
    if (!apiKey) {
      setMessage('请输入 API Key');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('API Key 已保存!');
        setHasApiKey(true);
        setApiKeyPreview(data.apiKeyPreview);
        setApiKey('');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setMessage(data.error || '保存失败');
      }
    } catch (error) {
      setMessage('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
        <h2 className="text-xl font-bold text-white mb-4">系统设置</h2>

        {/* API Key 状态 */}
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">Claude API Key</label>
          {hasApiKey && apiKeyPreview && (
            <div className="bg-gray-700 rounded-md px-3 py-2 mb-3">
              <span className="text-green-400">✓ 已设置: </span>
              <span className="text-gray-300">{apiKeyPreview}</span>
            </div>
          )}
          {!hasApiKey && (
            <div className="bg-yellow-900 rounded-md px-3 py-2 mb-3">
              <span className="text-yellow-400">⚠ 未设置 API Key</span>
            </div>
          )}
        </div>

        {/* API Key 输入 */}
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">输入新的 API Key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            placeholder="sk-ant-..."
          />
          <p className="text-gray-400 text-xs mt-2">
            API Key 将保存到本地 .env.local 文件
          </p>
        </div>

        {/* 获取 API Key 链接 */}
        <div className="mb-4">
          <a
            href="https://console.anthropic.com/settings/keys"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-400 hover:text-blue-300 text-sm"
          >
            → 点击获取 Claude API Key
          </a>
        </div>

        {/* 消息提示 */}
        {message && (
          <div className={`mb-4 rounded-md px-3 py-2 ${
            message.includes('已保存') ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
          }`}>
            {message}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end space-x-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors"
          >
            取消
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !apiKey}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>
    </div>
  );
}