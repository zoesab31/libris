import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { fcm_token } = await req.json();

        if (!fcm_token) {
            return Response.json({ error: 'fcm_token is required' }, { status: 400 });
        }

        await base44.auth.updateMe({ fcm_token });

        return Response.json({ 
            success: true, 
            message: 'FCM token updated successfully' 
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});