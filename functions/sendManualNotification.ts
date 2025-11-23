import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Vérifier que l'utilisateur est administrateur
        if (user.role !== 'admin') {
            return Response.json({ 
                error: 'Forbidden - Admin access required' 
            }, { status: 403 });
        }

        const { recipient_email, title, body } = await req.json();

        if (!recipient_email || !title || !body) {
            return Response.json({ 
                error: 'recipient_email, title, and body are required' 
            }, { status: 400 });
        }

        // Appeler la fonction sendFCMNotification
        const result = await base44.functions.invoke('sendFCMNotification', {
            recipient_email,
            title,
            body,
            data: {
                type: 'manual',
                from_admin: user.email
            }
        });

        return Response.json({ 
            success: true,
            message: 'Manual notification sent successfully',
            result
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});