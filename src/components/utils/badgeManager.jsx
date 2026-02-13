import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import confetti from 'canvas-confetti';
import { ALL_BADGES } from '@/components/utils/badgeDefinitions';

export class BadgeManager {
  constructor(user) {
    this.user = user;
  }

  async checkAndUnlockBadges(actionType, actionData = {}) {
    try {
      const userBadges = await base44.entities.UserBadge.filter({
        created_by: this.user.email
      });
      
      const unlockedBadgeIds = userBadges.map(ub => ub.badge_id);
      const lockedBadges = ALL_BADGES.filter(
        badge => !unlockedBadgeIds.includes(badge.id)
      );
      
      const userStats = await this.getUserStats();
      const newlyUnlocked = [];
      
      for (const badge of lockedBadges) {
        const shouldUnlock = this.checkBadgeRequirement(
          badge,
          userStats,
          actionType,
          actionData
        );
        
        if (shouldUnlock) {
          await this.unlockBadge(badge);
          newlyUnlocked.push(badge);
        }
      }
      
      if (newlyUnlocked.length > 0) {
        this.showBadgeUnlockNotifications(newlyUnlocked);
      }
      
      return newlyUnlocked;
    } catch (error) {
      console.error('Error checking badges:', error);
      return [];
    }
  }

  async getUserStats() {
    const [myBooks, friends, readingComments, sharedReadings] = await Promise.all([
      base44.entities.UserBook.filter({ created_by: this.user.email }),
      base44.entities.Friendship.filter({ created_by: this.user.email, status: 'Acceptée' }),
      base44.entities.ReadingComment.filter({ created_by: this.user.email }),
      base44.entities.SharedReading.filter({})
    ]);
    
    const booksRead = myBooks.filter(b => b.status === 'Lu');
    
    const bookIds = [...new Set(booksRead.map(b => b.book_id))];
    const books = await Promise.all(
      bookIds.map(id => base44.entities.Book.get(id).catch(() => null))
    );
    const booksMap = {};
    books.forEach(book => {
      if (book) booksMap[book.id] = book;
    });
    
    const genresRead = [...new Set(booksRead.map(b => booksMap[b.book_id]?.genre).filter(Boolean))];
    const totalPages = booksRead.reduce((sum, book) => {
      const bookData = booksMap[book.book_id];
      return sum + (bookData?.page_count || 0);
    }, 0);
    const fiveStarBooks = booksRead.filter(b => b.rating === 5);
    
    const streak = await this.calculateReadingStreak();
    
    const mySharedReadings = sharedReadings.filter(sr => 
      sr.created_by === this.user.email
    );
    
    const joinedSharedReadings = sharedReadings.filter(sr =>
      sr.participants?.includes(this.user.email) && sr.created_by !== this.user.email
    );
    
    const completedBingos = await base44.entities.BingoChallenge.filter({
      created_by: this.user.email,
      is_completed: true
    });
    
    return {
      totalBooksRead: booksRead.length,
      totalPages,
      genreCount: genresRead.length,
      friendCount: friends.length,
      reviewCount: readingComments.filter(c => c.comment).length,
      sharedReadingCount: joinedSharedReadings.length,
      sharedReadingCreatedCount: mySharedReadings.length,
      fiveStarCount: fiveStarBooks.length,
      streakDays: streak.current,
      completedBingosCount: completedBingos.length
    };
  }

  checkBadgeRequirement(badge, userStats, actionType, actionData) {
    const { requirement_type, requirement_value } = badge;
    
    switch (requirement_type) {
      case 'book_count':
        return userStats.totalBooksRead >= requirement_value;
      
      case 'total_pages':
        return userStats.totalPages >= requirement_value;
      
      case 'genre_count':
        return userStats.genreCount >= requirement_value;
      
      case 'friend_count':
        return userStats.friendCount >= requirement_value;
      
      case 'review_count':
        return userStats.reviewCount >= requirement_value;
      
      case 'streak_days':
        return userStats.streakDays >= requirement_value;
      
      case 'five_star_count':
        return userStats.fiveStarCount >= requirement_value;
      
      case 'bingo_complete':
        return userStats.completedBingosCount >= requirement_value;
      
      case 'yearly_goal':
        return actionType === 'goal_achieved';
      
      case 'finish_after_midnight':
        if (actionType === 'book_finished' && actionData.end_date) {
          const finishHour = new Date(actionData.end_date).getHours();
          return finishHour >= 0 && finishHour < 6;
        }
        return false;
      
      case 'book_in_24h':
        if (actionType === 'book_finished' && actionData.start_date && actionData.end_date) {
          const startDate = new Date(actionData.start_date);
          const endDate = new Date(actionData.end_date);
          const hoursDiff = (endDate - startDate) / (1000 * 60 * 60);
          return actionData.page_count >= requirement_value && hoursDiff <= 24;
        }
        return false;
      
      case 'shared_reading_join':
        return userStats.sharedReadingCount >= requirement_value;
      
      case 'shared_reading_create':
        return userStats.sharedReadingCreatedCount >= requirement_value;
      
      default:
        return false;
    }
  }

  async unlockBadge(badge) {
    try {
      await base44.entities.UserBadge.create({
        badge_id: badge.id,
        unlocked_at: new Date().toISOString(),
        is_new: true,
        created_by: this.user.email
      });
      
      await base44.entities.ActivityFeed.create({
        activity_type: 'badge_unlocked',
        content: `${this.user.full_name} a débloqué le badge "${badge.name}" ${badge.icon}`,
        metadata: JSON.stringify({ badge_id: badge.id }),
        is_visible: true,
        created_by: this.user.email
      });
      
      console.log(`Badge unlocked: ${badge.name}`);
    } catch (error) {
      console.error('Error unlocking badge:', error);
    }
  }

  showBadgeUnlockNotifications(badges) {
    badges.forEach((badge, index) => {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
          colors: [badge.color_primary, badge.color_secondary]
        });
        
        toast.success(
          `🏆 Badge débloqué ! ${badge.icon} ${badge.name}`,
          {
            duration: 5000,
            style: {
              background: `linear-gradient(135deg, ${badge.color_primary}, ${badge.color_secondary})`,
              color: 'white',
              fontWeight: 'bold',
              border: 'none'
            }
          }
        );
      }, index * 2000);
    });
  }

  async calculateReadingStreak() {
    try {
      const streakData = await base44.entities.ReadingStreak.filter({
        created_by: this.user.email
      });
      
      if (streakData.length > 0) {
        return {
          current: streakData[0].current_streak || 0,
          longest: streakData[0].longest_streak || 0
        };
      }
      
      return { current: 0, longest: 0 };
    } catch (error) {
      return { current: 0, longest: 0 };
    }
  }
}