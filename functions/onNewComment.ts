import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { book_id, comment } = await req.json();

        if (!book_id || !comment) {
            return Response.json({ 
                error: 'book_id and comment are required' 
            }, { status: 400 });
        }

        // Récupérer le livre
        const allBooks = await base44.entities.Book.list();
        const book = allBooks.find(b => b.id === book_id);

        if (!book) {
            return Response.json({ error: 'Book not found' }, { status: 404 });
        }

        // Récupérer les amies de l'utilisateur
        const friendships = await base44.entities.Friendship.filter({ 
            created_by: user.email, 
            status: "Acceptée" 
        });

        // Récupérer toutes les UserBooks de ce livre
        const userBooks = await base44.asServiceRole.entities.UserBook.list();
        const friendsWithBook = userBooks.filter(ub => 
            ub.book_id === book_id && 
            ub.created_by !== user.email &&
            friendships.some(f => f.friend_email === ub.created_by)
        );

        // Envoyer des notifications à chaque amie ayant ce livre
        const notificationPromises = friendsWithBook.map(async (userBook) => {
            try {
                await base44.functions.invoke('sendFCMNotification', {
                    recipient_email: userBook.created_by,
                    title: `💬 Nouveau commentaire de ${user.display_name || user.full_name}`,
                    body: `Sur "${book.title}": ${comment.substring(0, 100)}${comment.length > 100 ? '...' : ''}`,
                    data: {
                        type: 'comment',
                        book_id,
                        comment_id: comment.id || '',
                        from_user: user.email
                    }
                });

                // Créer aussi une notification dans l'app
                await base44.asServiceRole.entities.Notification.create({
                    created_by: userBook.created_by,
                    type: 'friend_comment',
                    title: `${user.display_name || user.full_name} a commenté`,
                    message: `Sur "${book.title}"`,
                    link_type: 'book',
                    link_id: book_id,
                    from_user: user.email,
                    is_read: false
                });
            } catch (error) {
                console.error(`Failed to notify ${userBook.created_by}:`, error);
            }
        });

        await Promise.all(notificationPromises);

        return Response.json({ 
            success: true,
            notifications_sent: friendsWithBook.length
        });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});