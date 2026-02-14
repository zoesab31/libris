import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { 
  Camera, Edit2, Share2, Settings, 
  BookOpen, UserPlus, MessageCircle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { toast } from 'sonner';

import ProfileBanner from '@/components/profile/ProfileBanner';
import ProfileStats from '@/components/profile/ProfileStats';
import BadgeShowcase from '@/components/profile/BadgeShowcase';
import FourBooksSection from '@/components/profile/FourBooksSection';
import FavoriteCharacters from '@/components/profile/FavoriteCharacters';
import RecentActivity from '@/components/profile/RecentActivity';
import EditProfileModal from '@/components/profile/EditProfileModal';
import { ALL_BADGES } from '@/components/utils/badgeDefinitions';

export default function EnrichedProfilePage() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [currentUser, setCurrentUser] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [adminSelectedBadge, setAdminSelectedBadge] = useState('');

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list()
  });

  const profileUser = userId 
    ? allUsers.find(u => u.id === userId)
    : currentUser;

  const isOwnProfile = !userId || userId === currentUser?.id;

  const { data: userBooks = [] } = useQuery({
    queryKey: ['userBooks', profileUser?.email],
    queryFn: () => base44.entities.UserBook.filter({ created_by: profileUser?.email }),
    enabled: !!profileUser
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list()
  });

  const { data: userBadges = [] } = useQuery({
    queryKey: ['userBadges', profileUser?.email],
    queryFn: () => base44.entities.UserBadge.filter({ created_by: profileUser?.email }),
    enabled: !!profileUser
  });

  const lockedBadges = ALL_BADGES.filter(b => !userBadges.some(ub => ub.badge_id === b.id));

  const { data: friends = [] } = useQuery({
    queryKey: ['friends', profileUser?.email],
    queryFn: () => base44.entities.Friendship.filter({ 
      created_by: profileUser?.email, 
      status: 'Acceptée' 
    }),
    enabled: !!profileUser
  });

  const { data: favoriteCharacters = [] } = useQuery({
    queryKey: ['favoriteCharacters', profileUser?.id],
    queryFn: () => base44.entities.FavoriteCharacter.filter({ user_id: profileUser?.id }),
    enabled: !!profileUser
  });

  const { data: recentActivity = [] } = useQuery({
    queryKey: ['userActivity', profileUser?.email],
    queryFn: async () => {
      const activities = await base44.entities.ActivityFeed.filter(
        { created_by: profileUser?.email },
        '-created_date',
        10
      );
      return activities;
    },
    enabled: !!profileUser
  });

  const stats = {
    totalBooksRead: userBooks.filter(b => b.status === 'Lu').length,
    totalBadges: userBadges.length,
    totalFriends: friends.length,
    currentlyReading: userBooks.filter(b => b.status === 'En cours').length,
    totalPoints: userBadges.reduce((sum, ub) => {
      const badge = ALL_BADGES.find(b => b.id === ub.badge_id);
      return sum + (badge?.points || 0);
    }, 0)
  };

  const handleShare = async () => {
    const shareText = `Découvrez le profil de ${profileUser.full_name} sur Libris !`;
    const shareUrl = `${window.location.origin}/profile/${profileUser.id}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: `Profil de ${profileUser.full_name}`,
          text: shareText,
          url: shareUrl
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Lien du profil copié !');
    }
  };

  const addFriendMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.Friendship.create({
        friend_email: profileUser.email,
        friend_name: profileUser.full_name,
        status: 'En attente'
      });
    },
    onSuccess: () => {
      toast.success('Demande d\'ami envoyée ! 🎉');
      queryClient.invalidateQueries({ queryKey: ['friends'] });
    },
    onError: (error) => {
      console.error('Error adding friend:', error);
      toast.error('Erreur lors de l\'ajout en ami');
    }
  });

  if (!profileUser) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin w-12 h-12 border-4 border-pink-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <ProfileBanner
        bannerUrl={profileUser.profile_banner}
        isOwnProfile={isOwnProfile}
        onEditBanner={() => setIsEditModalOpen(true)}
      />

      <div className="px-4 md:px-6 -mt-16 relative z-10">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end mb-6">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative"
          >
            <Avatar className="w-32 h-32 border-4 border-white shadow-xl">
              <AvatarImage src={profileUser.profile_picture} />
              <AvatarFallback className="bg-gradient-to-br from-pink-400 to-purple-500 text-white text-4xl font-bold">
                {profileUser.full_name?.[0]?.toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {isOwnProfile && (
              <button
                onClick={() => setIsEditModalOpen(true)}
                className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg hover:bg-gray-50 transition-colors"
              >
                <Camera className="w-4 h-4 text-gray-700" />
              </button>
            )}
          </motion.div>

          <div className="flex-1">
            <div className="bg-white rounded-2xl shadow-lg p-6">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-1">
                    {profileUser.full_name}
                  </h1>
                  {profileUser.pseudo && (
                    <p className="text-gray-500 mb-2">@{profileUser.pseudo}</p>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <BookOpen className="w-4 h-4" />
                    <span>{stats.totalBooksRead} livres lus</span>
                    <span className="mx-2">•</span>
                    <span>Membre depuis {new Date(profileUser.created_at).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })}</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {isOwnProfile ? (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsEditModalOpen(true)}
                      >
                        <Edit2 className="w-4 h-4 mr-2" />
                        Éditer
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate('/settings')}
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        size="sm"
                        onClick={() => addFriendMutation.mutate()}
                        className="bg-gradient-to-r from-pink-500 to-purple-500 text-white"
                      >
                        <UserPlus className="w-4 h-4 mr-2" />
                        Ajouter
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/chat/${profileUser.id}`)}
                      >
                        <MessageCircle className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShare}
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {profileUser.bio && (
                <p className="text-gray-700 mb-4 leading-relaxed">
                  {profileUser.bio}
                </p>
              )}

              {profileUser.favorite_quote && (
                <blockquote className="border-l-4 border-pink-500 pl-4 py-2 bg-pink-50 rounded-r-lg">
                  <p className="text-gray-700 italic">"{profileUser.favorite_quote}"</p>
                </blockquote>
              )}
            </div>
          </div>
        </div>

        <ProfileStats stats={stats} />

        {profileUser.show_badges !== false && (
         <div className="mt-4">
           <BadgeShowcase 
             userBadges={userBadges}
             isOwnProfile={isOwnProfile}
           />
         </div>
        )

        {currentUser?.role === 'admin' && (
          <div className="mt-2 p-3 bg-white/70 border rounded-xl flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
            <span className="text-sm font-medium text-gray-700">Admin · Débloquer un badge</span>
            <div className="flex-1">
              <Select value={adminSelectedBadge} onValueChange={setAdminSelectedBadge}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choisir un badge à débloquer" />
                </SelectTrigger>
                <SelectContent>
                  {lockedBadges.map(b => (
                    <SelectItem key={b.id} value={b.id}>{b.icon} {b.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              size="sm"
              disabled={!adminSelectedBadge}
              onClick={async () => {
                if (!adminSelectedBadge) return;
                await base44.functions.invoke('unlockBadgeForUser', { target_email: profileUser.email, badge_id: adminSelectedBadge });
                setAdminSelectedBadge('');
                toast.success('Badge débloqué');
                queryClient.invalidateQueries({ queryKey: ['userBadges', profileUser?.email] });
              }}
              className="bg-pink-500 hover:bg-pink-600 text-white"
            >
              Débloquer
            </Button>
          </div>
        )}

        <div className="space-y-6 mt-6">
          <FourBooksSection
            title="📚 En 4 livres pour me connaître"
            description="Ces livres définissent ma personnalité de lectrice"
            bookIds={profileUser.books_to_know_me || []}
            allBooks={allBooks}
            isOwnProfile={isOwnProfile}
            onEdit={() => setIsEditModalOpen(true)}
            emptyMessage="Ajoutez les 4 livres qui vous définissent le mieux !"
          />

          <FourBooksSection
            title="⭐ Mes 4 coups de cœur 2024"
            description="Mes lectures préférées de cette année"
            bookIds={profileUser.favorite_books_2024 || []}
            allBooks={allBooks}
            isOwnProfile={isOwnProfile}
            onEdit={() => setIsEditModalOpen(true)}
            emptyMessage="Sélectionnez vos 4 coups de cœur de l'année !"
          />

          <FavoriteCharacters
            characters={favoriteCharacters}
            allBooks={allBooks}
            isOwnProfile={isOwnProfile}
            userId={profileUser.id}
            onEdit={() => setIsEditModalOpen(true)}
          />
        </div>

        <div className="mt-6">
          <RecentActivity
            activities={recentActivity}
            allBooks={allBooks}
            userName={profileUser.full_name}
          />
        </div>
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        profileUser={profileUser}
        userBooks={userBooks}
        allBooks={allBooks}
      />
    </div>
  );
}