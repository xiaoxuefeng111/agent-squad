import { DEFAULT_TEMPLATES, DEFAULT_CONFIG } from '@/lib/storage/config';

describe('Config Module', () => {
  describe('Default Templates', () => {
    it('should have 4 default templates', () => {
      expect(DEFAULT_TEMPLATES).toHaveLength(4);
    });

    it('should have software-dev template', () => {
      const template = DEFAULT_TEMPLATES.find(t => t.id === 'software-dev');
      expect(template).toBeDefined();
      expect(template?.name).toBe('软件开发');
      expect(template?.roles).toHaveLength(4);
      expect(template?.flow).toContain('architect');
    });

    it('should have project-mgmt template', () => {
      const template = DEFAULT_TEMPLATES.find(t => t.id === 'project-mgmt');
      expect(template).toBeDefined();
      expect(template?.name).toBe('项目管理');
      expect(template?.roles).toHaveLength(3);
    });

    it('should have content-creation template', () => {
      const template = DEFAULT_TEMPLATES.find(t => t.id === 'content-creation');
      expect(template).toBeDefined();
      expect(template?.name).toBe('内容创作');
      expect(template?.roles).toHaveLength(4);
    });

    it('should have generic template', () => {
      const template = DEFAULT_TEMPLATES.find(t => t.id === 'generic');
      expect(template).toBeDefined();
      expect(template?.name).toBe('通用任务');
      expect(template?.roles).toHaveLength(3);
    });

    it('should have valid flow order matching roles', () => {
      for (const template of DEFAULT_TEMPLATES) {
        const roleIds = template.roles.map(r => r.id);
        for (const flowRoleId of template.flow) {
          expect(roleIds).toContain(flowRoleId);
        }
      }
    });
  });

  describe('Default Config', () => {
    it('should have correct storage limits', () => {
      expect(DEFAULT_CONFIG.storageLimits.maxConversationLogSize).toBe(1073741824); // 1GB
      expect(DEFAULT_CONFIG.storageLimits.maxTaskHistory).toBe(1000);
      expect(DEFAULT_CONFIG.storageLimits.maxTotalStorage).toBe(10737418240); // 10GB
    });

    it('should have standard as default permission mode', () => {
      expect(DEFAULT_CONFIG.defaultPermissionMode).toBe('standard');
    });

    it('should reference default templates', () => {
      expect(DEFAULT_CONFIG.templates).toEqual(DEFAULT_TEMPLATES);
    });
  });
});