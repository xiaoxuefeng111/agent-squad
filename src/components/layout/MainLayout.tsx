import React, { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Task } from '@/types';

interface MainLayoutProps {
  children: ReactNode;
  tasks: Task[];
  selectedTaskId: string | null;
  onSelectTask: (taskId: string) => void;
  onNewTask: () => void;
  onSettings: () => void;
  hasApiKey?: boolean;
}

export function MainLayout({
  children,
  tasks,
  selectedTaskId,
  onSelectTask,
  onNewTask,
  onSettings,
  hasApiKey,
}: MainLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-950">
      <Header onNewTask={onNewTask} onSettings={onSettings} hasApiKey={hasApiKey} />
      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          tasks={tasks}
          selectedTaskId={selectedTaskId}
          onSelectTask={onSelectTask}
        />
        <main className="flex-1 overflow-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}