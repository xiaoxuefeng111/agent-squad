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
  onSkills: () => void;
  hasApiKey?: boolean;
  isConnected?: boolean;
  model?: string | null;
  provider?: string;
}

export function MainLayout({
  children,
  tasks,
  selectedTaskId,
  onSelectTask,
  onNewTask,
  onSettings,
  onSkills,
  hasApiKey,
  isConnected,
  model,
  provider,
}: MainLayoutProps) {
  return (
    <div className="h-screen flex flex-col bg-gray-950">
      <Header
        onNewTask={onNewTask}
        onSettings={onSettings}
        onSkills={onSkills}
        hasApiKey={hasApiKey}
        isConnected={isConnected}
        model={model}
        provider={provider}
      />
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