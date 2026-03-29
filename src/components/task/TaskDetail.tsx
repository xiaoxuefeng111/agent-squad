import React, { useState } from 'react';
import { Task, ScenarioTemplate } from '@/types';

interface TaskDetailProps {
  task: Task | null;
  template: ScenarioTemplate | null;
  onStart: () => void;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
  isRunning: boolean;
}

export function TaskDetail({
  task,
  template,
  onStart,
  onPause,
  onResume,
  onStop,
  isRunning,
}: TaskDetailProps) {
  if (!task) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        选择左侧任务查看详情
      </div>
    );
  }

  const statusLabels: Record<Task['status'], string> = {
    pending: '待执行',
    running: '执行中',
    completed: '已完成',
    failed: '失败',
    paused: '暂停',
  };

  const permissionLabels: Record<string, string> = {
    strict: '严格模式',
    standard: '标准模式',
    trusted: '信任模式',
  };

  return (
    <div className="h-full bg-gray-900 p-6">
      <div className="max-w-2xl">
        {/* Task Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-2">{task.title}</h1>
          <div className="flex items-center space-x-4 text-sm">
            <span className="text-gray-400">
              状态: <span className="text-white">{statusLabels[task.status]}</span>
            </span>
            <span className="text-gray-400">
              权限: <span className="text-white">{permissionLabels[task.permissionMode]}</span>
            </span>
          </div>
        </div>

        {/* Task Description */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">任务描述</h2>
          <p className="text-gray-300 bg-gray-800 rounded-md p-4">
            {task.description || '暂无描述'}
          </p>
        </div>

        {/* Template Info */}
        {template && (
          <div className="mb-6">
            <h2 className="text-lg font-semibold text-white mb-2">场景模板</h2>
            <div className="bg-gray-800 rounded-md p-4">
              <div className="mb-3">
                <span className="text-gray-400">模板名称: </span>
                <span className="text-white">{template.name}</span>
              </div>
              <div className="mb-3">
                <span className="text-gray-400">描述: </span>
                <span className="text-white">{template.description}</span>
              </div>
              <div className="mb-3">
                <span className="text-gray-400">执行流程: </span>
                <div className="flex items-center mt-2 space-x-1">
                  {template.flow.map((roleId, index) => {
                    const role = template.roles.find(r => r.id === roleId);
                    return (
                      <React.Fragment key={roleId}>
                        <span className="bg-blue-600 px-3 py-1 rounded text-white text-sm">
                          {role?.name || roleId}
                        </span>
                        {index < template.flow.length - 1 && (
                          <span className="text-gray-500">→</span>
                        )}
                      </React.Fragment>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Workspace Path */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">工作目录</h2>
          <p className="text-gray-300 bg-gray-800 rounded-md p-4">
            {task.workspacePath}
          </p>
        </div>

        {/* Timestamps */}
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-white mb-2">时间信息</h2>
          <div className="bg-gray-800 rounded-md p-4 text-gray-300">
            <div className="mb-2">
              创建时间: {new Date(task.createdAt).toLocaleString('zh-CN')}
            </div>
            <div>
              更新时间: {new Date(task.updatedAt).toLocaleString('zh-CN')}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3">
          {task.status === 'pending' && (
            <button
              onClick={onStart}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              开始执行
            </button>
          )}
          {task.status === 'running' && (
            <button
              onClick={onPause}
              className="bg-yellow-600 hover:bg-yellow-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              暂停
            </button>
          )}
          {task.status === 'paused' && (
            <button
              onClick={onResume}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              继续
            </button>
          )}
          {(task.status === 'running' || task.status === 'paused') && (
            <button
              onClick={onStop}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              停止
            </button>
          )}
        </div>
      </div>
    </div>
  );
}