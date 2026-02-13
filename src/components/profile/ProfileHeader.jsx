import { motion } from 'framer-motion';
import { Settings, MessageCircle, UserPlus, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils';
import { Link } from 'react-router-dom';

export default function ProfileHeader({ 
  user, 
  streak, 
  followersCount, 
  followingCount, 
  isOwnProfile 
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative"
    >
      {/* Background Banner */}
      <div 
        className="h-32 md:h-48 rounded-b-3xl"
        style={{ 
          background: user?.banner_url 
            ? `url(${user.banner_url}) center/cover` 
            : 'linear-gradient(135deg, #FF1493, #FF69B4, #FFB6C8)' 
        }}
      />

      {/* Profile Content */}
      <div className="px-4 md:px-6 -mt-16 relative">
        <div className="flex flex-col md:flex-row gap-4 items-start md:items-end">
          {/* Profile Picture */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            className="relative"
          >
            <div 
              className="w-28 h-28 md:w-32 md:h-32 rounded-full border-4 border-white shadow-xl overflow-hidden"
              style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}
            >
              {user?.profile_picture ? (
                <img 
                  src={user.profile_picture} 
                  alt={user.display_name || user.full_name} 
                  className="w-full h-full object-cover" 
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-white text-4xl font-bold">
                  {user?.full_name?.[0]?.toUpperCase() || 'U'}
                </div>
              )}
            </div>

            {/* Streak Badge */}
            {streak > 0 && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className="absolute -bottom-2 -right-2 bg-gradient-to-br from-orange-500 to-red-500 rounded-full px-3 py-1 shadow-lg flex items-center gap-1"
              >
                <Flame className="w-4 h-4 text-white" />
                <span className="text-white font-bold text-sm">{streak}</span>
              </motion.div>
            )}
          </motion.div>

          {/* User Info */}
          <div className="flex-1 pb-4">
            <h1 className="text-2xl md:text-3xl font-bold" style={{ color: 'var(--dark-text)' }}>
              {user?.display_name || user?.full_name}
            </h1>
            {user?.bio && (
              <p className="text-sm md:text-base mt-1" style={{ color: 'var(--warm-pink)' }}>
                {user.bio}
              </p>
            )}

            {/* Stats Row */}
            <div className="flex gap-6 mt-3">
              <div>
                <span className="font-bold text-lg" style={{ color: 'var(--dark-text)' }}>
                  {followersCount}
                </span>
                <span className="text-sm ml-1" style={{ color: 'var(--warm-pink)' }}>
                  abonnés
                </span>
              </div>
              <div>
                <span className="font-bold text-lg" style={{ color: 'var(--dark-text)' }}>
                  {followingCount}
                </span>
                <span className="text-sm ml-1" style={{ color: 'var(--warm-pink)' }}>
                  abonnements
                </span>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pb-4">
            {isOwnProfile ? (
              <Link to={createPageUrl('AccountSettings')}>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <Settings className="w-4 h-4" />
                  Modifier le profil
                </Button>
              </Link>
            ) : (
              <>
                <Button
                  size="sm"
                  className="gap-2 text-white"
                  style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                >
                  <UserPlus className="w-4 h-4" />
                  Suivre
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <MessageCircle className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
}