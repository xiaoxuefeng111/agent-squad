import React, { useEffect, useRef } from 'react';
import { ChatMessage } from '@/types';

interface ChatPanelProps {
  messages: ChatMessage[];
  isConnected: boolean;
}

export function ChatPanel({ messages, isConnected }: ChatPanelProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Auto scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getMessageStyle = (type: ChatMessage['type']): string => {
    switch (type) {
      case 'thinking':
        return 'bg-gray-700 border-gray-600';
      case 'speaking':
        return 'bg-blue-900 border-blue-700';
      case 'tool_use':
        return 'bg-purple-900 border-purple-700';
      case 'tool_result':
        return 'bg-purple-800 border-purple-600';
      case 'error':
        return 'bg-red-900 border-red-700';
      default:
        return 'bg-gray-700 border-gray-600';
    }
  };

  const getTypeLabel = (type: ChatMessage['type']): string => {
    switch (type) {
      case 'thinking':
        return '思考';
      case 'speaking':
        return '发言';
      case 'tool_use':
        return '工具调用';
      case 'tool_result':
        return '工具结果';
      case 'error':
        return '错误';
      default:
        return '消息';
    }
  };

  const getTypeColor = (type: ChatMessage['type']): string => {
    switch (type) {
      case 'thinking':
        return 'text-gray-400';
      case 'speaking':
        return 'text-blue-400';
      case 'tool_use':
        return 'text-purple-400';
      case 'tool_result':
        return 'text-purple-300';
      case 'error':
        return 'text-red-400';
      default:
        return 'text-gray-400';
    }
  };

  return (
    <div className="h-full bg-gray-900 flex flex-col">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-4 py-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Agent对话</h2>
        <div className="flex items-center space-x-2">
          <span
            className={`w-2 h-2 rounded-full ${
              isConnected ? 'bg-green-500' : 'bg-red-500'
            }`}
          />
          <span className="text-sm text-gray-400">
            {isConnected ? '已连接' : '未连接'}
          </span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            暂无消息，开始执行任务后将显示Agent对话
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`${getMessageStyle(message.type)} border rounded-md p-4`}
            >
              {/* Message Header */}
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  <span className="font-medium text-white">
                    {message.agentName}
                  </span>
                  <span className={`${getTypeColor(message.type)} text-xs`}>
                    [{getTypeLabel(message.type)}]
                  </span>
                </div>
                <span className="text-gray-400 text-xs">
                  {new Date(message.timestamp).toLocaleTimeString('zh-CN')}
                </span>
              </div>

              {/* Message Content */}
              <div className="text-gray-300 whitespace-pre-wrap break-words">
                {message.content}
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Footer Stats */}
      <div className="bg-gray-800 border-t border-gray-700 px-4 py-2">
        <span className="text-gray-400 text-sm">
          共 {messages.length} 条消息
        </span>
      </div>
    </div>
  );
}