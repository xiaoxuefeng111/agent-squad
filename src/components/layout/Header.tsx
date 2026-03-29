import React from 'react';

interface HeaderProps {
  onNewTask: () => void;
  onSettings: () => void;
  onSkills: () => void;
  hasApiKey?: boolean;
  isConnected?: boolean;
  model?: string | null;
  provider?: string;
}

export function Header({ onNewTask, onSettings, onSkills, hasApiKey, isConnected, model, provider }: HeaderProps) {
  const getProviderName = () => {
    if (!provider) return null;
    switch (provider) {
      case 'aliyun': return '阿里云百炼';
      case 'anthropic': return 'Anthropic';
      default: return provider;
    }
  };

  const providerName = getProviderName();

  return (
    <header className="bg-gray-800 border-b border-gray-700 px-4 py-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="text-2xl font-bold text-white">
            龙虾军团
          </div>
          <span className="text-gray-400 text-sm">
            Agent Squad - 多Agent协作系统
          </span>
        </div>
        <div className="flex items-center space-x-4">
          {hasApiKey && (
            <div className="flex items-center space-x-3 px-3 py-1.5 bg-gray-700 rounded-md">
              <div className="flex items-center space-x-2">
                <span className={`w-2.5 h-2.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></span>
                <span className={`text-sm ${isConnected ? 'text-green-400' : 'text-red-400'}`}>
                  {isConnected ? '已连接' : '未连接'}
                </span>
              </div>
              <div className="w-px h-4 bg-gray-600"></div>
              {model && (
                <div className="flex items-center space-x-2 text-sm text-gray-300">
                  {providerName && <span className="text-gray-400">{providerName}</span>}
                  <span className="font-mono bg-gray-600 px-2 py-0.5 rounded text-xs">{model}</span>
                </div>
              )}
            </div>
          )}
          {!hasApiKey && (
            <span className="text-yellow-400 text-sm">⚠ 未设置 API Key</span>
          )}
          <button
            onClick={onSkills}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            🎯 Skills
          </button>
          <button
            onClick={onSettings}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            ⚙ 设置
          </button>
          <button
            onClick={onNewTask}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            + 新任务
          </button>
        </div>
      </div>
    </header>
  );
}