'use client';

import React, { useState, useEffect } from 'react';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// 预设的 API 提供商
const API_PROVIDERS = [
  { id: 'anthropic', name: 'Anthropic (官方)', baseUrl: '', defaultModel: 'claude-3-5-haiku-20241022', keyPrefix: 'sk-ant-' },
  { id: 'aliyun', name: '阿里云百炼', baseUrl: 'https://coding.dashscope.aliyuncs.com/apps/anthropic', defaultModel: 'qwen-plus', keyPrefix: 'sk-' },
  { id: 'custom', name: '自定义', baseUrl: '', defaultModel: '', keyPrefix: '' },
];

type ConnectionStatus = 'unknown' | 'testing' | 'connected' | 'failed';

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  const [model, setModel] = useState('');
  const [hasApiKey, setHasApiKey] = useState(false);
  const [apiKeyPreview, setApiKeyPreview] = useState<string | null>(null);
  const [currentBaseUrl, setCurrentBaseUrl] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [selectedProvider, setSelectedProvider] = useState('anthropic');
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('unknown');
  const [connectionMessage, setConnectionMessage] = useState('');
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
      setCurrentBaseUrl(data.baseUrl);
      setCurrentModel(data.model);
      setModel(data.model || '');

      // 根据当前 baseUrl 设置提供商
      if (data.baseUrl) {
        if (data.baseUrl.includes('dashscope.aliyuncs.com')) {
          setSelectedProvider('aliyun');
          setBaseUrl(data.baseUrl);
        } else {
          setSelectedProvider('custom');
          setBaseUrl(data.baseUrl);
        }
      } else {
        setSelectedProvider('anthropic');
        setBaseUrl('');
      }

      // 如果有配置，自动测试连接
      if (data.hasApiKey) {
        testConnection('saved', data.model);
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId);
    setConnectionStatus('unknown');
    const provider = API_PROVIDERS.find(p => p.id === providerId);
    if (provider) {
      if (provider.baseUrl) {
        setBaseUrl(provider.baseUrl);
      } else {
        setBaseUrl('');
      }
      if (provider.defaultModel) {
        setModel(provider.defaultModel);
      }
    }
  };

  const testConnection = async (type: 'saved' | 'new' = 'new', testModel?: string) => {
    setTesting(true);
    setConnectionStatus('testing');
    setConnectionMessage('');

    try {
      const body = type === 'saved' && hasApiKey
        ? { model: testModel }
        : { apiKey, baseUrl: baseUrl || undefined, model: model || undefined };

      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.success) {
        setConnectionStatus('connected');
        setConnectionMessage(data.message);
      } else {
        setConnectionStatus('failed');
        setConnectionMessage(data.error);
      }
    } catch (error) {
      setConnectionStatus('failed');
      setConnectionMessage('测试失败');
    } finally {
      setTesting(false);
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
        body: JSON.stringify({ apiKey, baseUrl: baseUrl || undefined, model: model || undefined }),
      });

      const data = await response.json();

      if (data.success) {
        setMessage('设置已保存!');
        setHasApiKey(true);
        setApiKeyPreview(data.apiKeyPreview);
        setCurrentBaseUrl(data.baseUrl);
        setCurrentModel(data.model);
        setApiKey('');
        // 保存后测试连接
        testConnection('saved', data.model);
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

  const selectedProviderInfo = API_PROVIDERS.find(p => p.id === selectedProvider);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">系统设置</h2>

        {/* API 提供商选择 */}
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">API 提供商</label>
          <div className="grid grid-cols-3 gap-2">
            {API_PROVIDERS.map((provider) => (
              <button
                key={provider.id}
                type="button"
                onClick={() => handleProviderChange(provider.id)}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  selectedProvider === provider.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
              >
                {provider.name}
              </button>
            ))}
          </div>
        </div>

        {/* API Key 状态 */}
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">API Key</label>
          {hasApiKey && apiKeyPreview && (
            <div className="bg-gray-700 rounded-md px-3 py-2 mb-3">
              <span className="text-green-400">✓ 已设置: </span>
              <span className="text-gray-300">{apiKeyPreview}</span>
              {currentBaseUrl && (
                <div className="text-gray-400 text-xs mt-1">
                  Base URL: {currentBaseUrl}
                </div>
              )}
              {currentModel && (
                <div className="text-gray-400 text-xs">
                  模型: {currentModel}
                </div>
              )}
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
            onChange={(e) => {
              setApiKey(e.target.value);
              setConnectionStatus('unknown');
            }}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            placeholder={selectedProviderInfo?.keyPrefix ? `${selectedProviderInfo.keyPrefix}...` : '输入 API Key'}
          />
        </div>

        {/* Base URL 输入 */}
        {selectedProvider !== 'anthropic' && (
          <div className="mb-4">
            <label className="block text-gray-300 mb-2">Base URL</label>
            <input
              type="text"
              value={baseUrl}
              onChange={(e) => {
                setBaseUrl(e.target.value);
                setConnectionStatus('unknown');
              }}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="https://api.example.com"
            />
          </div>
        )}

        {/* 模型输入 */}
        <div className="mb-4">
          <label className="block text-gray-300 mb-2">模型名称</label>
          <input
            type="text"
            value={model}
            onChange={(e) => {
              setModel(e.target.value);
              setConnectionStatus('unknown');
            }}
            className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            placeholder={selectedProviderInfo?.defaultModel || '输入模型名称'}
          />
          <p className="text-gray-400 text-xs mt-2">
            {selectedProvider === 'aliyun' && '阿里云百炼模型: qwen-plus, qwen-turbo, qwen-max 等'}
            {selectedProvider === 'anthropic' && 'Claude 模型: claude-3-5-sonnet-20241022, claude-3-5-haiku-20241022 等'}
            {selectedProvider === 'custom' && '请输入您的 API 提供商支持的模型名称'}
          </p>
        </div>

        {/* 连接状态 */}
        <div className="mb-4">
          <div className="flex items-center justify-between">
            <label className="text-gray-300">连接状态</label>
            <button
              type="button"
              onClick={() => testConnection(apiKey ? 'new' : 'saved')}
              disabled={testing || (!apiKey && !hasApiKey)}
              className="px-3 py-1 bg-gray-700 text-gray-300 rounded-md text-sm hover:bg-gray-600 transition-colors disabled:opacity-50"
            >
              {testing ? '测试中...' : '测试连接'}
            </button>
          </div>
          <div className="mt-2 rounded-md px-3 py-2 flex items-center space-x-2">
            {connectionStatus === 'unknown' && (
              <>
                <span className="w-3 h-3 rounded-full bg-gray-500"></span>
                <span className="text-gray-400">未测试</span>
              </>
            )}
            {connectionStatus === 'testing' && (
              <>
                <span className="w-3 h-3 rounded-full bg-blue-500 animate-pulse"></span>
                <span className="text-blue-400">正在测试...</span>
              </>
            )}
            {connectionStatus === 'connected' && (
              <>
                <span className="w-3 h-3 rounded-full bg-green-500"></span>
                <span className="text-green-400">连接成功 ✓</span>
              </>
            )}
            {connectionStatus === 'failed' && (
              <>
                <span className="w-3 h-3 rounded-full bg-red-500"></span>
                <span className="text-red-400">连接失败 ✗</span>
              </>
            )}
          </div>
          {connectionMessage && (
            <p className={`text-sm mt-1 ${
              connectionStatus === 'connected' ? 'text-green-400' : 'text-red-400'
            }`}>
              {connectionMessage}
            </p>
          )}
        </div>

        {/* 提示信息 */}
        <div className="mb-4 bg-gray-700 rounded-md p-3">
          <p className="text-gray-300 text-sm">
            {selectedProvider === 'anthropic' && (
              <>
                官方 API，需从{' '}
                <a href="https://console.anthropic.com/settings/keys" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  console.anthropic.com
                </a>
                {' '}获取 API Key
              </>
            )}
            {selectedProvider === 'aliyun' && (
              <>
                阿里云百炼 API，需从{' '}
                <a href="https://bailian.console.aliyun.com/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
                  阿里云百炼控制台
                </a>
                {' '}获取 API Key
              </>
            )}
            {selectedProvider === 'custom' && (
              <>使用自定义 API 提供商，请确保兼容 Anthropic 协议</>
            )}
          </p>
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