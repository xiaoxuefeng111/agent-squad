import { NextRequest, NextResponse } from 'next/server';
import { getTemplates, getTemplateById, updateTemplate, removeTemplate, addCustomRole, removeCustomRole, getConfig } from '@/lib/storage/config';
import { AgentRole, ScenarioTemplate } from '@/types';

// GET /api/templates - List all templates
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const config = searchParams.get('config');

  try {
    if (config === 'true') {
      // Return full configuration
      const config = getConfig();
      return NextResponse.json(config);
    }

    if (id) {
      // Return specific template
      const template = getTemplateById(id);
      if (!template) {
        return NextResponse.json({ error: 'Template not found' }, { status: 404 });
      }
      return NextResponse.json(template);
    }

    // Return all templates
    const templates = getTemplates();
    return NextResponse.json(templates);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch templates' },
      { status: 500 }
    );
  }
}

// POST /api/templates - Add or update a template
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { template } = body as { template: ScenarioTemplate };

    if (!template || !template.id || !template.name) {
      return NextResponse.json(
        { error: 'Missing required fields: template with id and name' },
        { status: 400 }
      );
    }

    // Validate roles
    if (!template.roles || !Array.isArray(template.roles) || template.roles.length === 0) {
      return NextResponse.json(
        { error: 'Template must have at least one role' },
        { status: 400 }
      );
    }

    // Validate flow
    if (!template.flow || !Array.isArray(template.flow) || template.flow.length === 0) {
      return NextResponse.json(
        { error: 'Template must have at least one role in flow' },
        { status: 400 }
      );
    }

    // Ensure all flow roles exist in roles array
    const roleIds = template.roles.map(r => r.id);
    for (const flowRoleId of template.flow) {
      if (!roleIds.includes(flowRoleId)) {
        return NextResponse.json(
          { error: `Flow role ${flowRoleId} not found in roles array` },
          { status: 400 }
        );
      }
    }

    updateTemplate(template);

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create/update template' },
      { status: 500 }
    );
  }
}

// DELETE /api/templates - Remove a template
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Missing required parameter: id' },
        { status: 400 }
      );
    }

    // Prevent deleting default templates
    const defaultIds = ['software-dev', 'project-mgmt', 'content-creation', 'generic'];
    if (defaultIds.includes(id)) {
      return NextResponse.json(
        { error: 'Cannot delete default templates' },
        { status: 400 }
      );
    }

    removeTemplate(id);

    return NextResponse.json({ success: true, templateId: id });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete template' },
      { status: 500 }
    );
  }
}

// Role management endpoints (via PUT with action parameter)
// PUT /api/templates?action=addRole - Add a custom role
// PUT /api/templates?action=removeRole - Remove a custom role
export async function PUT(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');

    const body = await request.json();

    if (action === 'addRole') {
      const { role } = body as { role: AgentRole };

      if (!role || !role.id || !role.name) {
        return NextResponse.json(
          { error: 'Missing required fields: role with id and name' },
          { status: 400 }
        );
      }

      addCustomRole(role);

      return NextResponse.json({ success: true, role });
    }

    if (action === 'removeRole') {
      const { roleId } = body;

      if (!roleId) {
        return NextResponse.json(
          { error: 'Missing required field: roleId' },
          { status: 400 }
        );
      }

      removeCustomRole(roleId);

      return NextResponse.json({ success: true, roleId });
    }

    return NextResponse.json(
      { error: 'Invalid action. Use addRole or removeRole' },
      { status: 400 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to perform action' },
      { status: 500 }
    );
  }
}