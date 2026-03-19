import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

function truncate(str, n) {
  if (!str) return '';
  return str.length > n ? str.slice(0, n - 1) + '…' : str;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    if (payload?.event?.entity_name !== 'SharedReadingMessage' || payload?.event?.type !== 'create') {
      return Response.json({ ok: true, skipped: true });
    }

    const msg = payload?.data || null;
    const sender = msg?.created_by || null;
    const sharedReadingId = msg?.shared_reading_id;

    if (!sharedReadingId) {
      return Response.json({ ok: false, reason: 'missing_shared_reading_id' }, { status: 400 });
    }

    // Fetch the related SharedReading to get participants & title
    const srs = await base44.asServiceRole.entities.SharedReading.filter({ id: sharedReadingId });
    const sr = Array.isArray(srs) ? srs[0] : null;
    const participants = Array.isArray(sr?.participants) ? sr.participants : [];
    const title = sr?.title || 'Lecture commune';

    // Helper to check friendship (either direction) between sender and recipient
    async function areFriends(a, b) {
      if (!a || !b) return false;
      const f1 = await base44.asServiceRole.entities.Friendship.filter({ created_by: a, friend_email: b, status: 'Acceptée' });
      if (Array.isArray(f1) && f1.length > 0) return true;
      const f2 = await base44.asServiceRole.entities.Friendship.filter({ created_by: b, friend_email: a, status: 'Acceptée' });
      return Array.isArray(f2) && f2.length > 0;
    }

    const preview = truncate(msg?.message || '', 100);

    const results = [];
    for (const recipient of participants) {
      if (!recipient || recipient === sender) continue; // do not notify self
      const ok = await areFriends(sender, recipient);
      if (!ok) continue; // only notify friends

      const created = await base44.asServiceRole.entities.Notification.create({
        type: 'shared_reading_update',
        title: `${title} · Nouveau message`,
        message: preview ? `${sender || 'Une amie'}: "${preview}"` : `${sender || 'Une amie'} a envoyé un message`,
        link_type: 'shared_reading',
        link_id: sharedReadingId,
        from_user: sender || undefined,
        recipient_email: recipient,
      });
      results.push(created?.id || null);
    }

    return Response.json({ ok: true, created: results.filter(Boolean).length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});