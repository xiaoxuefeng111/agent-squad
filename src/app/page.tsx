'use client';

import React, { useState, useEffect } from 'react';
import { MainLayout } from '@/components/layout';
import { NewTaskForm, TaskDetail } from '@/components/task';
import { ChatPanel } from '@/components/chat';
import { SettingsModal } from '@/components/settings';
import { SkillManager } from '@/components/skills';
import { useWebSocket } from '@/lib/websocket/hooks';
import { Task, ScenarioTemplate, ChatMessage, PermissionMode } from '@/types';

export default function HomePage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [template, setTemplate] = useState<ScenarioTemplate | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isSkillsOpen, setIsSkillsOpen] = useState(false);
  const [hasApiKey, setHasApiKey] = useState(false);
  const [isApiConnected, setIsApiConnected] = useState(false);
  const [currentModel, setCurrentModel] = useState<string | null>(null);
  const [currentProvider, setCurrentProvider] = useState<string>('');
  const [isRunning, setIsRunning] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  const { isConnected, lastMessage } = useWebSocket();

  // Fetch tasks and settings on mount
  useEffect(() => {
    fetchTasks();
    fetchSettings();
  }, []);

  // Fetch selected task details when selection changes
  useEffect(() => {
    if (selectedTaskId) {
      fetchTaskDetail(selectedTaskId);
      fetchMessages(selectedTaskId);
      checkRunningStatus(selectedTaskId);
    }
  }, [selectedTaskId]);

  // Handle WebSocket messages
  useEffect(() => {
    if (lastMessage && selectedTaskId) {
      if (lastMessage.type === 'chat_message' && lastMessage.data.taskId === selectedTaskId) {
        setMessages((prev) => [...prev, lastMessage.data]);
      }
      if (lastMessage.type === 'task_status' && lastMessage.data.taskId === selectedTaskId) {
        fetchTasks();
        fetchTaskDetail(selectedTaskId);
      }
    }
  }, [lastMessage, selectedTaskId]);

  const fetchSettings = async () => {
    try {
      const response = await fetch('/api/settings');
      const data = await response.json();
      setHasApiKey(data.hasApiKey);
      setCurrentModel(data.model);

      // 判断提供商
      if (data.baseUrl) {
        if (data.baseUrl.includes('dashscope')) {
          setCurrentProvider('aliyun');
        } else {
          setCurrentProvider('custom');
        }
      } else {
        setCurrentProvider('anthropic');
      }

      // 如果有配置，自动测试连接
      if (data.hasApiKey) {
        testApiConnection();
      }
    } catch (error) {
      console.error('Failed to fetch settings:', error);
    }
  };

  const testApiConnection = async () => {
    try {
      const response = await fetch('/api/test-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      setIsApiConnected(data.success);
    } catch (error) {
      setIsApiConnected(false);
    }
  };

  const fetchTasks = async () => {
    try {
      setIsLoading(true);
      const response = await fetch('/api/tasks');
      const data = await response.json();
      setTasks(data);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTaskDetail = async (taskId: string) => {
    try {
      const response = await fetch(`/api/tasks?id=${taskId}`);
      const task = await response.json();
      setSelectedTask(task);

      const templateResponse = await fetch(`/api/templates?id=${task.templateId}`);
      const templateData = await templateResponse.json();
      setTemplate(templateData);
    } catch (error) {
      console.error('Failed to fetch task detail:', error);
    }
  };

  const fetchMessages = async (taskId: string) => {
    try {
      const response = await fetch(`/api/messages?taskId=${taskId}`);
      const data = await response.json();
      setMessages(data);
    } catch (error) {
      console.error('Failed to fetch messages:', error);
    }
  };

  const checkRunningStatus = async (taskId: string) => {
    try {
      const response = await fetch(`/api/execute?taskId=${taskId}`);
      const data = await response.json();
      setIsRunning(data.isRunning);
    } catch (error) {
      console.error('Failed to check running status:', error);
    }
  };

  const handleCreateTask = async (taskData: {
    title: string;
    description: string;
    templateId: string;
    permissionMode: PermissionMode;
    workspacePath: string;
  }) => {
    try {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(taskData),
      });
      const newTask = await response.json();
      setTasks((prev) => [newTask, ...prev]);
      setSelectedTaskId(newTask.id);
      setIsNewTaskOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    }
  };

  const handleStartExecution = async () => {
    if (!selectedTaskId) return;
    try {
      await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selectedTaskId, action: 'start' }),
      });
      setIsRunning(true);
      fetchTasks();
      fetchTaskDetail(selectedTaskId);
    } catch (error) {
      console.error('Failed to start execution:', error);
    }
  };

  const handlePauseExecution = async () => {
    if (!selectedTaskId) return;
    try {
      await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selectedTaskId, action: 'pause' }),
      });
      setIsRunning(false);
      fetchTasks();
      fetchTaskDetail(selectedTaskId);
    } catch (error) {
      console.error('Failed to pause execution:', error);
    }
  };

  const handleResumeExecution = async () => {
    if (!selectedTaskId) return;
    try {
      await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selectedTaskId, action: 'resume' }),
      });
      setIsRunning(true);
      fetchTasks();
      fetchTaskDetail(selectedTaskId);
    } catch (error) {
      console.error('Failed to resume execution:', error);
    }
  };

  const handleStopExecution = async () => {
    if (!selectedTaskId) return;
    try {
      await fetch('/api/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ taskId: selectedTaskId, action: 'stop' }),
      });
      setIsRunning(false);
      fetchTasks();
      fetchTaskDetail(selectedTaskId);
    } catch (error) {
      console.error('Failed to stop execution:', error);
    }
  };

  const handleSettingsClose = () => {
    setIsSettingsOpen(false);
    fetchSettings(); // Refresh settings after closing
    testApiConnection(); // 重新测试连接
  };

  return (
    <MainLayout
      tasks={tasks}
      selectedTaskId={selectedTaskId}
      onSelectTask={setSelectedTaskId}
      onNewTask={() => setIsNewTaskOpen(true)}
      onSettings={() => setIsSettingsOpen(true)}
      onSkills={() => setIsSkillsOpen(true)}
      hasApiKey={hasApiKey}
      isConnected={isApiConnected}
      model={currentModel}
      provider={currentProvider}
    >
      <div className="h-full flex">
        <div className="w-1/2 border-r border-gray-700 overflow-y-auto">
          <TaskDetail
            task={selectedTask}
            template={template}
            onStart={handleStartExecution}
            onPause={handlePauseExecution}
            onResume={handleResumeExecution}
            onStop={handleStopExecution}
            isRunning={isRunning}
          />
        </div>
        <div className="w-1/2">
          <ChatPanel messages={messages} isConnected={isConnected} />
        </div>
      </div>
      <NewTaskForm
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        onSubmit={handleCreateTask}
      />
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={handleSettingsClose}
      />
      <SkillManager
        isOpen={isSkillsOpen}
        onClose={() => setIsSkillsOpen(false)}
      />
    </MainLayout>
  );
}