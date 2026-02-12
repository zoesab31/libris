import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all users
    const allUsers = await base44.asServiceRole.entities.User.list();
    const notifications = [];
    
    for (const user of allUsers) {
      if (!user.email) continue;
      
      // Get user's books
      const userBooks = await base44.asServiceRole.entities.UserBook.filter({ 
        created_by: user.email 
      });
      
      // Get all books details
      const bookIds = [...new Set(userBooks.map(ub => ub.book_id))];
      const books = await base44.asServiceRole.entities.Book.list();
      const booksMap = books.reduce((map, book) => {
        map[book.id] = book;
        return map;
      }, {});
      
      // 1. Check for books in progress
      const booksInProgress = userBooks.filter(ub => ub.status === "En cours");
      if (booksInProgress.length > 0) {
        const bookTitles = booksInProgress
          .map(ub => booksMap[ub.book_id]?.title)
          .filter(Boolean)
          .slice(0, 3)
          .join(", ");
        
        await base44.asServiceRole.entities.Notification.create({
          created_by: user.email,
          type: "milestone",
          title: "📖 Lectures en cours",
          message: `N'oubliez pas de continuer vos ${booksInProgress.length} lecture${booksInProgress.length > 1 ? 's' : ''} en cours : ${bookTitles}${booksInProgress.length > 3 ? '...' : ''}`,
          link_type: "book",
          is_read: false
        });
        
        notifications.push({
          user: user.email,
          type: "in_progress",
          count: booksInProgress.length
        });
      }
      
      // 2. Check for PAL books
      const readingLists = await base44.asServiceRole.entities.ReadingList.filter({
        created_by: user.email
      });
      
      const currentMonth = new Date().getMonth() + 1;
      const currentYear = new Date().getFullYear();
      
      const currentPAL = readingLists.find(pal => 
        pal.month === currentMonth && pal.year === currentYear
      );
      
      if (currentPAL && currentPAL.book_ids && currentPAL.book_ids.length > 0) {
        const palBooksToRead = userBooks.filter(ub => 
          currentPAL.book_ids.includes(ub.book_id) && ub.status === "À lire"
        );
        
        if (palBooksToRead.length > 0) {
          await base44.asServiceRole.entities.Notification.create({
            created_by: user.email,
            type: "milestone",
            title: "📚 PAL du mois",
            message: `Il vous reste ${palBooksToRead.length} livre${palBooksToRead.length > 1 ? 's' : ''} à lire dans votre PAL "${currentPAL.name}"`,
            link_type: "book",
            is_read: false
          });
          
          notifications.push({
            user: user.email,
            type: "pal_reminder",
            count: palBooksToRead.length
          });
        }
      }
      
      // 3. Check for recently finished books without review
      const recentlyFinished = userBooks.filter(ub => {
        if (ub.status !== "Lu" || !ub.end_date) return false;
        
        const endDate = new Date(ub.end_date);
        const daysSinceFinished = Math.floor((Date.now() - endDate.getTime()) / (1000 * 60 * 60 * 24));
        
        // Books finished in the last 7 days without a review
        return daysSinceFinished <= 7 && daysSinceFinished >= 1 && !ub.review;
      });
      
      if (recentlyFinished.length > 0) {
        const book = booksMap[recentlyFinished[0].book_id];
        if (book) {
          await base44.asServiceRole.entities.Notification.create({
            created_by: user.email,
            type: "milestone",
            title: "✨ Livre terminé !",
            message: `Vous avez terminé "${book.title}" ! Ajoutez votre avis et votre note 📝`,
            link_type: "book",
            link_id: book.id,
            is_read: false
          });
          
          notifications.push({
            user: user.email,
            type: "review_reminder",
            book: book.title
          });
        }
      }
    }
    
    return Response.json({
      success: true,
      notifications_sent: notifications.length,
      details: notifications
    });
    
  } catch (error) {
    console.error("Error sending reading reminders:", error);
    return Response.json({ 
      success: false,
      error: error.message 
    }, { status: 500 });
  }
});