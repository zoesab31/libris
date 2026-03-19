import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    // payload: { event: { type, entity_name, entity_id }, data, old_data, payload_too_large }

    // Ensure it's a Suggestion create event (defensive)
    if (payload?.event?.entity_name !== 'Suggestion' || payload?.event?.type !== 'create') {
      return Response.json({ ok: true, skipped: true });
    }

    const suggestion = payload?.data || null;

    // Fetch author (from_user) and a small preview
    const fromUser = suggestion?.created_by || null;
    const preview = truncate(suggestion?.title || suggestion?.message || suggestion?.content || '', 80);

    // Get all admin users
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });

    // Create a notification for each admin
    const promises = admins.map((admin) =>
      base44.asServiceRole.entities.Notification.create({
        type: 'suggestion',
        title: 'Nouveau message - Mur des idées',
        message: preview ? `Un nouveau message a été ajouté${fromUser ? ` par ${fromUser}` : ''}: "${preview}"` : `Un nouveau message a été ajouté${fromUser ? ` par ${fromUser}` : ''}.`,
        link_type: 'suggestion',
        link_id: payload?.event?.entity_id || null,
        from_user: fromUser || undefined,
        recipient_email: admin.email,
      })
    );

    await Promise.all(promises);

    return Response.json({ ok: true, notified: admins.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});