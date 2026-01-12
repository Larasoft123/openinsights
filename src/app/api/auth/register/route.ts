import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '@/lib/db';
import { createTenantSchema, tenantSchemaExists, withTenantSchema } from '@/lib/db/tenant';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const result = registerSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json({ error: result.error.issues[0].message }, { status: 400 });
    }

    const { name, email, password } = result.data;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      return NextResponse.json({ error: 'Email already registered' }, { status: 409 });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // For self-hosted, use the "default" organization with tenant_default schema
    // Find or create the default organization
    let organization = await prisma.organization.findUnique({
      where: { schemaName: 'tenant_default' },
    });

    if (!organization) {
      // Create default organization for self-hosted
      organization = await prisma.organization.create({
        data: {
          name: 'Default Organization',
          slug: 'default',
          schemaName: 'tenant_default',
        },
      });
    }

    // Ensure tenant schema exists
    const schemaExists = await tenantSchemaExists('tenant_default');
    if (!schemaExists) {
      await createTenantSchema('default');
    }

    // Create user (without workspaceId - that's legacy)
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
      },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });

    // Check if this is the first member (make them OWNER)
    const memberCount = await prisma.organizationMember.count({
      where: { organizationId: organization.id },
    });

    // Add user as organization member
    await prisma.organizationMember.create({
      data: {
        organizationId: organization.id,
        userId: user.id,
        role: memberCount === 0 ? 'OWNER' : 'MEMBER',
        joinedAt: new Date(),
      },
    });

    // Create workspace and member in tenant schema
    const workspaceSlug = email
      .split('@')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-');
    const uniqueSlug = `${workspaceSlug}-${Date.now().toString(36)}`;

    await withTenantSchema('tenant_default', async (client) => {
      // Create workspace
      const workspaceResult = await client.query(
        `INSERT INTO workspaces (name, slug)
         VALUES ($1, $2)
         RETURNING id`,
        [`${name}'s Workspace`, uniqueSlug]
      );
      const workspaceId = workspaceResult.rows[0].id;

      // Create workspace member
      await client.query(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES ($1, $2, $3)`,
        [workspaceId, user.id, 'OWNER']
      );
    });

    return NextResponse.json(user, { status: 201 });
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({ error: 'Registration failed' }, { status: 500 });
  }
}
