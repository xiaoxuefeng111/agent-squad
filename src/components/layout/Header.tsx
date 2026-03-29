import React from 'react';

interface HeaderProps {
  onNewTask: () => void;
  onSettings: () => void;
  hasApiKey?: boolean;
}

export function Header({ onNewTask, onSettings, hasApiKey }: HeaderProps) {
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
          {!hasApiKey && (
            <span className="text-yellow-400 text-sm">
              ⚠ 未设置 API Key
            </span>
          )}
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