import React from 'react';
import { Task } from '@/types';

interface SidebarProps {
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
}

export function Sidebar({ tasks, selectedTaskId, onSelectTask }: SidebarProps) {
  const statusColors: Record<Task['status'], string> = {
    pending: 'bg-gray-500',
    running: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
    paused: 'bg-yellow-500',
  };

  const statusLabels: Record<Task['status'], string> = {
    pending: '待执行',
    running: '执行中',
    completed: '已完成',
    failed: '失败',
    paused: '暂停',
  };

  const sortedTasks = [...tasks].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  return (
    <aside className="w-64 bg-gray-900 border-r border-gray-700 flex flex-col">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">任务列表</h2>
        <p className="text-gray-400 text-sm mt-1">
          共 {tasks.length} 个任务
        </p>
      </div>

      <div className="flex-1 overflow-y-auto">
        {sortedTasks.length === 0 ? (
          <div className="p-4 text-gray-400 text-center">
            暂无任务，点击上方"新任务"按钮创建
          </div>
        ) : (
          <ul className="divide-y divide-gray-800">
            {sortedTasks.map((task) => (
              <li
                key={task.id}
                onClick={() => onSelectTask(task.id)}
                className={`p-4 cursor-pointer transition-colors ${
                  selectedTaskId === task.id
                    ? 'bg-gray-800 border-l-2 border-blue-500'
                    : 'hover:bg-gray-850'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white font-medium truncate">
                    {task.title}
                  </h3>
                  <span
                    className={`${statusColors[task.status]} px-2 py-0.5 rounded text-xs text-white`}
                  >
                    {statusLabels[task.status]}
                  </span>
                </div>
                <p className="text-gray-400 text-sm truncate">
                  {task.description || '无描述'}
                </p>
                <div className="mt-2 text-gray-500 text-xs">
                  {new Date(task.createdAt).toLocaleDateString('zh-CN')}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </aside>
  );
}