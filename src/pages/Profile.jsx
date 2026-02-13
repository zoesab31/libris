import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import ProfileHeader from "@/components/profile/ProfileHeader";
import KnowMeBooks from "@/components/profile/KnowMeBooks";
import ReadingHighlights from "@/components/profile/ReadingHighlights";
import SoftStats from "@/components/profile/SoftStats";
import BadgesPreview from "@/components/profile/BadgesPreview";
import ActivityTimeline from "@/components/profile/ActivityTimeline";
import LifestylePreview from "@/components/profile/LifestylePreview";
import FadeIn from "@/components/animations/FadeIn";
import { Skeleton } from "@/components/animations/SkeletonLoader";

export default function Profile() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: userBooks = [], isLoading: booksLoading } = useQuery({
    queryKey: ['userBooks', user?.email],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: userBadges = [] } = useQuery({
    queryKey: ['userBadges', user?.email],
    queryFn: () => base44.entities.UserBadge.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: friendships = [] } = useQuery({
    queryKey: ['friendships', user?.email],
    queryFn: () => base44.entities.Friendship.filter({ created_by: user?.email, status: 'Acceptée' }),
    enabled: !!user,
  });

  const { data: readingGoals = [] } = useQuery({
    queryKey: ['readingGoals', user?.email],
    queryFn: () => base44.entities.ReadingGoal.filter({ created_by: user?.email, year: new Date().getFullYear() }),
    enabled: !!user,
  });

  const { data: activityFeed = [] } = useQuery({
    queryKey: ['activityFeed', user?.email],
    queryFn: () => base44.entities.ActivityFeed.filter({ created_by: user?.email }, '-created_date', 50),
    enabled: !!user,
  });

  const { data: readingStreak = [] } = useQuery({
    queryKey: ['readingStreak', user?.email],
    queryFn: () => base44.entities.ReadingStreak.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--cream)' }}>
        <Skeleton className="w-24 h-24 rounded-full" />
      </div>
    );
  }

  const currentStreak = readingStreak[0]?.current_streak || 0;
  const completedBooks = userBooks.filter(ub => ub.status === 'Lu');
  const currentYear = new Date().getFullYear();
  const thisYearBooks = completedBooks.filter(ub => {
    const endDate = ub.end_date ? new Date(ub.end_date) : null;
    return endDate && endDate.getFullYear() === currentYear;
  });

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      {/* Desktop: Two Column Layout */}
      <div className="hidden md:block max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-6">
          {/* Left Column - Identity & Stats */}
          <div className="space-y-6">
            <ProfileHeader 
              user={user}
              streak={currentStreak}
              followersCount={friendships.length}
              followingCount={friendships.length}
              isOwnProfile={true}
            />
            <SoftStats 
              user={user}
              userBooks={userBooks}
              allBooks={allBooks}
              readingGoals={readingGoals}
              currentStreak={currentStreak}
            />
            <BadgesPreview userBadges={userBadges} />
            <LifestylePreview user={user} />
          </div>

          {/* Right Column - Highlights & Activity */}
          <div className="col-span-2 space-y-6">
            <KnowMeBooks user={user} allBooks={allBooks} />
            <ReadingHighlights 
              user={user}
              userBooks={userBooks}
              allBooks={allBooks}
            />
            <ActivityTimeline 
              activities={activityFeed}
              allBooks={allBooks}
            />
          </div>
        </div>
      </div>

      {/* Mobile: Single Column Layout */}
      <div className="md:hidden">
        <div className="space-y-4 pb-6">
          <ProfileHeader 
            user={user}
            streak={currentStreak}
            followersCount={friendships.length}
            followingCount={friendships.length}
            isOwnProfile={true}
          />
          <div className="px-4 space-y-4">
            <KnowMeBooks user={user} allBooks={allBooks} />
            <ReadingHighlights 
              user={user}
              userBooks={userBooks}
              allBooks={allBooks}
            />
            <SoftStats 
              user={user}
              userBooks={userBooks}
              allBooks={allBooks}
              readingGoals={readingGoals}
              currentStreak={currentStreak}
            />
            <BadgesPreview userBadges={userBadges} />
            <ActivityTimeline 
              activities={activityFeed}
              allBooks={allBooks}
            />
            <LifestylePreview user={user} />
          </div>
        </div>
      </div>
    </div>
  );
}