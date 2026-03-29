'use client';

import React, { useState, useEffect } from 'react';
import { ScenarioTemplate, PermissionMode } from '@/types';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

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

  const [showBrainstorm, setShowBrainstorm] = useState(false);
  const [brainstormMessages, setBrainstormMessages] = useState<Message[]>([]);
  const [userInput, setUserInput] = useState('');
  const [brainstormLoading, setBrainstormLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      fetchTemplates();
      setShowBrainstorm(false);
      setBrainstormMessages([]);
      setUserInput('');
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

  const handleStartBrainstorm = async () => {
    if (!title || !templateId) return;

    setBrainstormLoading(true);
    setShowBrainstorm(true);

    try {
      const response = await fetch('/api/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, templateId }),
      });

      const data = await response.json();

      if (data.success) {
        setBrainstormMessages([{ role: 'assistant', content: data.message }]);
      } else {
        setBrainstormMessages([{ role: 'assistant', content: `Error: ${data.error}` }]);
      }
    } catch (error) {
      setBrainstormMessages([{ role: 'assistant', content: 'Failed to analyze' }]);
    } finally {
      setBrainstormLoading(false);
    }
  };

  const handleSendUserMessage = async () => {
    if (!userInput.trim() || brainstormLoading) return;

    const newUserMessage: Message = { role: 'user', content: userInput };
    const newMessages = [...brainstormMessages, newUserMessage];
    setBrainstormMessages(newMessages);
    setUserInput('');
    setBrainstormLoading(true);

    try {
      const response = await fetch('/api/brainstorm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, templateId, messages: newMessages }),
      });

      const data = await response.json();

      if (data.success) {
        setBrainstormMessages([...newMessages, { role: 'assistant', content: data.message }]);
      } else {
        setBrainstormMessages([...newMessages, { role: 'assistant', content: `Error: ${data.error}` }]);
      }
    } catch (error) {
      setBrainstormMessages([...newMessages, { role: 'assistant', content: 'Failed to send' }]);
    } finally {
      setBrainstormLoading(false);
    }
  };

  const handleConfirm = () => {
    setLoading(true);
    try {
      onSubmit({ title, description, templateId, permissionMode, workspacePath });
      setTitle('');
      setDescription('');
      setShowBrainstorm(false);
      setBrainstormMessages([]);
      onClose();
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = () => {
    setLoading(true);
    try {
      onSubmit({ title, description, templateId, permissionMode, workspacePath });
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
      <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold text-white mb-4">Create New Task</h2>

        <div className="space-y-4 mb-4">
          <div>
            <label className="block text-gray-300 mb-2">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              placeholder="Task title"
              required
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500 h-20"
              placeholder="Describe your task"
            />
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Template *</label>
            <select
              value={templateId}
              onChange={(e) => setTemplateId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} - {t.description}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Permission</label>
            <div className="grid grid-cols-3 gap-2">
              {(['strict', 'standard', 'trusted'] as PermissionMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setPermissionMode(mode)}
                  className={`px-3 py-2 rounded-md text-sm transition-colors ${
                    permissionMode === mode ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {mode === 'strict' ? 'Strict' : mode === 'standard' ? 'Standard' : 'Trusted'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-gray-300 mb-2">Workspace</label>
            <input
              type="text"
              value={workspacePath}
              onChange={(e) => setWorkspacePath(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        {!showBrainstorm && (
          <div className="flex gap-3 mb-4">
            <button
              type="button"
              onClick={handleStartBrainstorm}
              disabled={!title || !templateId || brainstormLoading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              {brainstormLoading ? 'Analyzing...' : '🧠 Analyze Task (Recommended)'}
            </button>
            <button
              type="button"
              onClick={handleSkip}
              disabled={!title || !templateId || loading}
              className="flex-1 bg-gray-600 hover:bg-gray-500 text-white px-4 py-3 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              Skip & Create
            </button>
          </div>
        )}

        {showBrainstorm && (
          <div className="border border-gray-600 rounded-md mb-4">
            <div className="bg-gray-700 px-3 py-2 border-b border-gray-600 flex justify-between items-center">
              <span className="text-white font-medium">Task Analysis</span>
              <button type="button" onClick={() => setShowBrainstorm(false)} className="text-gray-400 hover:text-white text-sm">Close</button>
            </div>

            <div className="p-3 h-64 overflow-y-auto space-y-3">
              {brainstormMessages.map((msg, idx) => (
                <div key={idx} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
                  <div className={`inline-block max-w-[80%] px-3 py-2 rounded-lg text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-600 text-gray-100'}`}>
                    <pre className="whitespace-pre-wrap font-sans">{msg.content}</pre>
                  </div>
                </div>
              ))}
              {brainstormLoading && (
                <div className="text-left">
                  <div className="inline-block px-3 py-2 rounded-lg text-sm bg-gray-600 text-gray-300">Thinking...</div>
                </div>
              )}
            </div>

            <div className="p-3 border-t border-gray-600">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={userInput}
                  onChange={(e) => setUserInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendUserMessage()}
                  placeholder="Reply or type 'confirm' to start..."
                  className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                  disabled={brainstormLoading}
                />
                <button
                  type="button"
                  onClick={handleSendUserMessage}
                  disabled={!userInput.trim() || brainstormLoading}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm transition-colors disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          </div>
        )}

        {showBrainstorm && brainstormMessages.length > 0 && (
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleConfirm}
              disabled={loading}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-md text-sm font-medium transition-colors disabled:opacity-50"
            >
              ✓ Confirm & Start
            </button>
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors">Cancel</button>
          </div>
        )}

        {!showBrainstorm && (
          <div className="flex justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-gray-300 rounded-md hover:bg-gray-600 transition-colors">Cancel</button>
          </div>
        )}
      </div>
    </div>
  );
}