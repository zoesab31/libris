import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { recipient_email, title, body, data } = await req.json();

        if (!recipient_email || !title || !body) {
            return Response.json({ 
                error: 'recipient_email, title, and body are required' 
            }, { status: 400 });
        }

        // Récupérer le token FCM du destinataire
        const allUsers = await base44.asServiceRole.entities.User.list();
        const recipient = allUsers.find(u => u.email === recipient_email);

        if (!recipient || !recipient.fcm_token) {
            return Response.json({ 
                error: 'Recipient not found or has no FCM token' 
            }, { status: 404 });
        }

        const fcmServerKey = Deno.env.get("FCM_SERVER_KEY");

        if (!fcmServerKey) {
            return Response.json({ 
                error: 'FCM_SERVER_KEY not configured' 
            }, { status: 500 });
        }

        // Envoyer la notification via FCM
        const fcmResponse = await fetch('https://fcm.googleapis.com/fcm/send', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `key=${fcmServerKey}`
            },
            body: JSON.stringify({
                to: recipient.fcm_token,
                notification: {
                    title,
                    body,
                    icon: '/icon.png',
                    badge: '/badge.png'
                },
                data: data || {}
            })
        });

        const fcmResult = await fcmResponse.json();

        if (!fcmResponse.ok) {
            return Response.json({ 
                error: 'Failed to send FCM notification',
                details: fcmResult
            }, { status: 500 });
        }

        return Response.json({ 
            success: true,
            message: 'Notification sent successfully',
            fcm_response: fcmResult
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});