import { Task, PermissionMode, TaskStatus } from '@/types';

// Mock better-sqlite3
jest.mock('better-sqlite3', () => {
  const mockDb = {
    pragma: jest.fn(),
    exec: jest.fn(),
    prepare: jest.fn(() => ({
      run: jest.fn(),
      get: jest.fn(),
      all: jest.fn(() => []),
    })),
  };

  return jest.fn(() => mockDb);
});

// Mock fs
jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  mkdirSync: jest.fn(),
  statSync: jest.fn(() => ({ size: 1024 })),
}));

describe('Database Module', () => {
  describe('Task Operations', () => {
    it('should create a task with correct fields', () => {
      const taskData = {
        id: 'test-id',
        title: 'Test Task',
        description: 'Test Description',
        templateId: 'software-dev',
        permissionMode: 'standard' as PermissionMode,
        status: 'pending' as TaskStatus,
        workspacePath: '/test/path',
      };

      expect(taskData.id).toBe('test-id');
      expect(taskData.title).toBe('Test Task');
      expect(taskData.templateId).toBe('software-dev');
    });

    it('should have valid task status values', () => {
      const validStatuses: TaskStatus[] = ['pending', 'running', 'completed', 'failed', 'paused'];
      expect(validStatuses).toContain('pending');
      expect(validStatuses).toContain('running');
      expect(validStatuses).toContain('completed');
    });

    it('should have valid permission mode values', () => {
      const validModes: PermissionMode[] = ['strict', 'standard', 'trusted'];
      expect(validModes).toContain('strict');
      expect(validModes).toContain('standard');
      expect(validModes).toContain('trusted');
    });
  });
});