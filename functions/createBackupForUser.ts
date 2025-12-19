import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const adminUser = await base44.auth.me();

    if (!adminUser || adminUser.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin only' }, { status: 403 });
    }

    const { user_email } = await req.json();
    
    if (!user_email) {
      return Response.json({ error: 'user_email is required' }, { status: 400 });
    }

    // Use service role to access all user data
    const backupData = {
      user_info: (() => {
        const targetUser = base44.asServiceRole.entities.User.filter({ email: user_email });
        if (targetUser.length === 0) throw new Error('User not found');
        return {
          email: targetUser[0].email,
          full_name: targetUser[0].full_name,
          display_name: targetUser[0].display_name,
          profile_picture: targetUser[0].profile_picture,
          theme: targetUser[0].theme,
          notification_preferences: targetUser[0].notification_preferences
        };
      })(),
      user_books: await base44.asServiceRole.entities.UserBook.filter({ created_by: user_email }),
      reading_comments: await base44.asServiceRole.entities.ReadingComment.filter({ created_by: user_email }),
      friendships: await base44.asServiceRole.entities.Friendship.filter({ created_by: user_email }),
      shared_readings: await base44.asServiceRole.entities.SharedReading.filter({ created_by: user_email }),
      shared_reading_messages: await base44.asServiceRole.entities.SharedReadingMessage.filter({ created_by: user_email }),
      quotes: await base44.asServiceRole.entities.Quote.filter({ created_by: user_email }),
      fan_arts: await base44.asServiceRole.entities.FanArt.filter({ created_by: user_email }),
      nail_inspos: await base44.asServiceRole.entities.NailInspo.filter({ created_by: user_email }),
      custom_shelves: await base44.asServiceRole.entities.CustomShelf.filter({ created_by: user_email }),
      book_boyfriends: await base44.asServiceRole.entities.BookBoyfriend.filter({ created_by: user_email }),
      favorite_couples: await base44.asServiceRole.entities.FavoriteCouple.filter({ created_by: user_email }),
      reading_goals: await base44.asServiceRole.entities.ReadingGoal.filter({ created_by: user_email }),
      bingo_challenges: await base44.asServiceRole.entities.BingoChallenge.filter({ created_by: user_email }),
      reading_locations: await base44.asServiceRole.entities.ReadingLocation.filter({ created_by: user_email }),
      books_of_the_year: await base44.asServiceRole.entities.BookOfTheYear.filter({ created_by: user_email }),
      monthly_votes: await base44.asServiceRole.entities.MonthlyBookVote.filter({ created_by: user_email }),
      reading_lists: await base44.asServiceRole.entities.ReadingList.filter({ created_by: user_email }),
      book_series: await base44.asServiceRole.entities.BookSeries.filter({ created_by: user_email }),
      chat_rooms: await base44.asServiceRole.entities.ChatRoom.filter({ created_by: user_email }),
      chat_messages: await base44.asServiceRole.entities.ChatMessage.filter({ sender_email: user_email }),
      notifications: await base44.asServiceRole.entities.Notification.filter({ created_by: user_email }),
      wishlist_items: await base44.asServiceRole.entities.SharedReadingWishlist.filter({ created_by: user_email })
    };

    const totalItems = Object.values(backupData).reduce((sum, items) => {
      if (Array.isArray(items)) return sum + items.length;
      return sum + 1;
    }, 0) - 1;

    const backupName = `[Admin] ${user_email} - ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}`;
    
    await base44.asServiceRole.entities.UserBackup.create({
      backup_name: backupName,
      backup_date: new Date().toISOString(),
      data_snapshot: backupData,
      entities_included: Object.keys(backupData),
      total_items: totalItems,
      created_by: user_email
    });

    return Response.json({
      success: true,
      backup_name: backupName,
      total_items: totalItems
    });
  } catch (error) {
    console.error('Backup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});