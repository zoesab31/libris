import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { target_email, badge_id } = await req.json();
    if (!target_email || !badge_id) {
      return Response.json({ error: 'Missing target_email or badge_id' }, { status: 400 });
    }

    // Create the badge for the target user using service role
    const created = await base44.asServiceRole.entities.UserBadge.create({
      badge_id,
      unlocked_at: new Date().toISOString(),
      created_by: target_email,
    });

    return Response.json({ success: true, badge: created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});