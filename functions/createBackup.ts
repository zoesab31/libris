import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const email = user.email;
    const backupData = {
      user_info: {
        email: user.email,
        full_name: user.full_name,
        display_name: user.display_name,
        profile_picture: user.profile_picture,
        theme: user.theme,
        notification_preferences: user.notification_preferences
      },
      user_books: await base44.entities.UserBook.filter({ created_by: email }),
      reading_comments: await base44.entities.ReadingComment.filter({ created_by: email }),
      friendships: await base44.entities.Friendship.filter({ created_by: email }),
      shared_readings: await base44.entities.SharedReading.filter({ created_by: email }),
      shared_reading_messages: await base44.entities.SharedReadingMessage.filter({ created_by: email }),
      quotes: await base44.entities.Quote.filter({ created_by: email }),
      fan_arts: await base44.entities.FanArt.filter({ created_by: email }),
      nail_inspos: await base44.entities.NailInspo.filter({ created_by: email }),
      custom_shelves: await base44.entities.CustomShelf.filter({ created_by: email }),
      book_boyfriends: await base44.entities.BookBoyfriend.filter({ created_by: email }),
      favorite_couples: await base44.entities.FavoriteCouple.filter({ created_by: email }),
      reading_goals: await base44.entities.ReadingGoal.filter({ created_by: email }),
      bingo_challenges: await base44.entities.BingoChallenge.filter({ created_by: email }),
      reading_locations: await base44.entities.ReadingLocation.filter({ created_by: email }),
      books_of_the_year: await base44.entities.BookOfTheYear.filter({ created_by: email }),
      monthly_votes: await base44.entities.MonthlyBookVote.filter({ created_by: email }),
      reading_lists: await base44.entities.ReadingList.filter({ created_by: email }),
      book_series: await base44.entities.BookSeries.filter({ created_by: email }),
      chat_rooms: await base44.entities.ChatRoom.filter({ created_by: email }),
      chat_messages: await base44.entities.ChatMessage.filter({ sender_email: email }),
      notifications: await base44.entities.Notification.filter({ created_by: email }),
      wishlist_items: await base44.entities.SharedReadingWishlist.filter({ created_by: email })
    };

    // Count total items
    const totalItems = Object.values(backupData).reduce((sum, items) => {
      if (Array.isArray(items)) return sum + items.length;
      return sum + 1;
    }, 0) - 1; // -1 for user_info which is an object

    const backupName = `Sauvegarde ${new Date().toLocaleDateString('fr-FR')} ${new Date().toLocaleTimeString('fr-FR')}`;
    
    await base44.entities.UserBackup.create({
      backup_name: backupName,
      backup_date: new Date().toISOString(),
      data_snapshot: backupData,
      entities_included: Object.keys(backupData),
      total_items: totalItems
    });

    return Response.json({
      success: true,
      backup_name: backupName,
      total_items: totalItems,
      data: backupData
    });
  } catch (error) {
    console.error('Backup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});