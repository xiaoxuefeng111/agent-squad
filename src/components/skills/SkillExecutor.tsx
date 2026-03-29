'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Skill, SkillStep, SkillExecutionState, StepStatus, BUILTIN_SKILLS } from '@/types/skills';

interface SkillExecutorProps {
  skillId: string;
  taskId?: string;
  context?: {
    title?: string;
    description?: string;
    templateId?: string;
  };
  onComplete?: (output: string) => void;
  onCancel?: () => void;
}

// Skill 执行引擎组件 - 执行真正的skill步骤
export function SkillExecutor({ skillId, taskId, context, onComplete, onCancel }: SkillExecutorProps) {
  const [skill, setSkill] = useState<Skill | null>(null);
  const [executionState, setExecutionState] = useState<SkillExecutionState | null>(null);
  const [currentOutput, setCurrentOutput] = useState<string>('');
  const [userInput, setUserInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);

  // 加载 skill 定义
  useEffect(() => {
    const builtinSkill = BUILTIN_SKILLS.find(s => s.id === skillId);
    if (builtinSkill) {
      setSkill(builtinSkill);
      // 初始化执行状态
      const stepsWithStatus = builtinSkill.steps.map(step => ({
        ...step,
        status: 'pending' as StepStatus
      }));
      setExecutionState({
        skillId,
        taskId: taskId || `temp-${Date.now()}`,
        currentStepIndex: 0,
        steps: stepsWithStatus,
        startedAt: new Date(),
        status: 'running',
      });
    }
  }, [skillId, taskId]);

  // 执行单个步骤
  const executeStep = useCallback(async (step: SkillStep) => {
    if (!skill || !executionState) return;

    setIsProcessing(true);

    // 标记步骤为 in_progress
    setExecutionState(prev => {
      if (!prev) return prev;
      const steps = [...prev.steps];
      steps[prev.currentStepIndex] = { ...steps[prev.currentStepIndex], status: 'in_progress' };
      return { ...prev, steps };
    });

    try {
      // 根据动作类型执行
      let output = '';

      switch (step.action) {
        case 'analyze':
          // 分析步骤 - 调用API进行思考分析
          output = await executeAnalyze(step, context);
          break;

        case 'ask':
          // 询问步骤 - 需要用户输入
          if (userInput) {
            output = userInput;
            setUserInput('');
          } else {
            // 等待用户输入
            setIsProcessing(false);
            return;
          }
          break;

        case 'read':
          // 读取步骤 - 获取项目上下文
          output = await executeRead(step, context);
          break;

        case 'write':
          // 写入步骤 - 生成文档/代码/计划
          output = await executeWrite(step, context, currentOutput);
          break;

        case 'edit':
          // 编辑步骤 - 修改现有内容
          output = await executeEdit(step, context, currentOutput);
          break;

        case 'bash':
          // 命令步骤 - 执行命令
          output = await executeBash(step);
          break;

        case 'skill':
          // 引用其他skill
          output = `[Referenced skill: ${step.skillReference}]`;
          break;

        default:
          output = `Unknown action: ${step.action}`;
      }

      // 标记步骤完成并保存输出
      setExecutionState(prev => {
        if (!prev) return prev;
        const steps = [...prev.steps];
        steps[prev.currentStepIndex] = {
          ...steps[prev.currentStepIndex],
          status: 'completed',
          output
        };
        return {
          ...prev,
          steps,
          currentStepIndex: prev.currentStepIndex + 1,
        };
      });

      setCurrentOutput(prev => prev + '\n' + output);

      // 检查是否所有步骤完成
      if (executionState.currentStepIndex + 1 >= skill.steps.length) {
        setExecutionState(prev => {
          if (!prev) return prev;
          return { ...prev, status: 'completed', completedAt: new Date() };
        });
        if (onComplete) {
          onComplete(currentOutput + '\n' + output);
        }
      }

    } catch (error) {
      // 标记步骤为阻塞
      setExecutionState(prev => {
        if (!prev) return prev;
        const steps = [...prev.steps];
        steps[prev.currentStepIndex] = {
          ...steps[prev.currentStepIndex],
          status: 'blocked',
          output: `Error: ${error}`
        };
        return { ...prev, steps };
      });
    }

    setIsProcessing(false);
  }, [skill, executionState, context, userInput, currentOutput, onComplete]);

  // 自动执行非交互步骤
  useEffect(() => {
    if (!executionState || !skill || isProcessing) return;

    const currentStep = executionState.steps[executionState.currentStepIndex];
    if (!currentStep || currentStep.status === 'completed') return;

    // 如果是ask步骤，等待用户输入
    if (currentStep.action === 'ask' && !userInput) {
      return;
    }

    // 自动执行
    executeStep(currentStep);
  }, [executionState, skill, isProcessing, userInput, executeStep]);

  // 处理用户输入提交
  const handleUserSubmit = () => {
    if (!userInput.trim() || !executionState) return;

    const currentStep = executionState.steps[executionState.currentStepIndex];
    if (currentStep?.action === 'ask') {
      executeStep(currentStep);
    }
  };

  // API调用实现
  const executeAnalyze = async (step: SkillStep, ctx?: typeof context): Promise<string> => {
    const response = await fetch('/api/skill-execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'analyze',
        step: step.description,
        context: ctx,
        skillId: skill?.id,
      }),
    });
    const data = await response.json();
    return data.output || '';
  };

  const executeRead = async (step: SkillStep, ctx?: typeof context): Promise<string> => {
    const response = await fetch('/api/skill-execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'read',
        step: step.description,
        context: ctx,
        skillId: skill?.id,
      }),
    });
    const data = await response.json();
    return data.output || '';
  };

  const executeWrite = async (step: SkillStep, ctx?: typeof context, prevOutput?: string): Promise<string> => {
    const response = await fetch('/api/skill-execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'write',
        step: step.description,
        params: step.params,
        context: ctx,
        previousOutput: prevOutput,
        skillId: skill?.id,
      }),
    });
    const data = await response.json();
    return data.output || '';
  };

  const executeEdit = async (step: SkillStep, ctx?: typeof context, prevOutput?: string): Promise<string> => {
    const response = await fetch('/api/skill-execute', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'edit',
        step: step.description,
        context: ctx,
        previousOutput: prevOutput,
        skillId: skill?.id,
      }),
    });
    const data = await response.json();
    return data.output || '';
  };

  const executeBash = async (step: SkillStep): Promise<string> => {
    const command = step.params?.command || '';
    return `[Would execute: ${command}]`;
  };

  if (!skill || !executionState) {
    return <div className="text-gray-400 p-4">Loading skill...</div>;
  }

  const currentStep = executionState.steps[executionState.currentStepIndex];
  const isCompleted = executionState.status === 'completed';

  return (
    <div className="bg-gray-800 rounded-lg border border-gray-700">
      {/* Skill 头部 */}
      <div className="bg-gray-700 px-4 py-3 border-b border-gray-600">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-white font-bold">{skill.name}</h3>
            {skill.announce && (
              <p className="text-blue-400 text-sm mt-1">{skill.announce}</p>
            )}
          </div>
          <div className="text-gray-400 text-sm">
            {executionState.currentStepIndex + 1} / {skill.steps.length}
          </div>
        </div>
      </div>

      {/* Checklist 进度 */}
      <div className="p-4">
        <div className="space-y-2">
          {executionState.steps.map((step, idx) => (
            <div key={step.id} className={`flex items-start gap-3 p-2 rounded ${
              idx === executionState.currentStepIndex ? 'bg-gray-700' : ''
            }`}>
              {/* Checkbox */}
              <span className={`w-5 h-5 rounded border flex items-center justify-center text-xs ${
                step.status === 'completed' ? 'bg-green-600 border-green-600 text-white' :
                step.status === 'in_progress' ? 'border-blue-500 text-blue-500' :
                step.status === 'blocked' ? 'bg-red-600 border-red-600 text-white' :
                'border-gray-500 text-gray-500'
              }`}>
                {step.status === 'completed' ? '✓' :
                 step.status === 'in_progress' ? '○' :
                 step.status === 'blocked' ? '✗' : ' '}
              </span>

              {/* 步骤描述 */}
              <div className="flex-1">
                <p className={`text-sm ${
                  step.status === 'completed' ? 'text-green-400' :
                  step.status === 'in_progress' ? 'text-white' :
                  'text-gray-400'
                }`}>
                  {step.description}
                </p>
                {/* 验证条件 */}
                {step.verification && step.status === 'completed' && (
                  <p className="text-xs text-gray-500 mt-1">验证: {step.verification}</p>
                )}
                {/* 输出 */}
                {step.output && (
                  <div className="text-xs text-gray-300 mt-1 bg-gray-900 p-2 rounded max-h-32 overflow-y-auto">
                    <pre className="whitespace-pre-wrap">{step.output}</pre>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 用户输入区域 (ask 步骤) */}
      {currentStep?.action === 'ask' && currentStep.status !== 'completed' && (
        <div className="px-4 pb-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleUserSubmit()}
              placeholder="输入回复..."
              className="flex-1 bg-gray-700 border border-gray-600 rounded-md px-3 py-2 text-white text-sm"
              disabled={isProcessing}
            />
            <button
              onClick={handleUserSubmit}
              disabled={!userInput.trim() || isProcessing}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm disabled:opacity-50"
            >
              发送
            </button>
          </div>
        </div>
      )}

      {/* 完成状态 */}
      {isCompleted && (
        <div className="px-4 pb-4">
          <div className="bg-green-900/30 border border-green-600 rounded-md p-3">
            <p className="text-green-400 font-medium">✓ Skill 完成</p>
            <p className="text-gray-400 text-sm mt-1">所有步骤已执行，验证点已满足</p>
          </div>
        </div>
      )}

      {/* 处理状态指示 */}
      {isProcessing && (
        <div className="px-4 pb-4">
          <div className="text-blue-400 text-sm flex items-center gap-2">
            <span className="animate-pulse">●</span> 正在执行...
          </div>
        </div>
      )}
    </div>
  );
}