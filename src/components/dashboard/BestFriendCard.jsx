import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function BestFriendCard({ user }) {
  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends', user?.email],
    queryFn: () => base44.entities.Friendship.filter({ created_by: user?.email, status: 'Acceptée' }),
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsersForBestFriend'],
    queryFn: () => base44.entities.User.list(),
    enabled: myFriends.length > 0,
  });

  if (!user || myFriends.length === 0) return null;

  const friend = myFriends.find(f => !f.is_hidden) || myFriends[0];
  const friendUser = allUsers.find(u => u.email === friend?.friend_email);

  return (
    <Card className="border-0 rounded-3xl overflow-hidden dash-card" style={{ backgroundColor: 'white', boxShadow: '0 4px 16px rgba(255, 105, 180, 0.08)' }}>
      <CardContent className="p-6 md:p-8">
        <h2 className="text-lg font-bold mb-4 flex items-center gap-3" style={{ color: '#2D3748' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFE9F0' }}>
            <Users className="w-5 h-5" style={{ color: '#FF1493' }} />
          </div>
          Mes meilleures amies
        </h2>

        <Link to={createPageUrl('UserProfile') + `?email=${friend.friend_email}`} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-pink-50 transition-all" style={{ backgroundColor: '#FFF5F8' }}>
          <div className="w-14 h-14 rounded-full overflow-hidden flex-shrink-0" style={{ boxShadow: '0 4px 12px rgba(255, 105, 180, 0.25)' }}>
            {friendUser?.profile_picture ? (
              <img src={friendUser.profile_picture} alt={friend.friend_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl" style={{ background: 'linear-gradient(135deg, #FF69B4, #FFB6C1)' }}>
                {friend.friend_name?.[0]?.toUpperCase() || 'A'}
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="font-bold text-base" style={{ color: '#2D3748' }}>{friend.friend_name}</p>
            <p className="text-sm" style={{ color: '#FF69B4' }}>@{friend.friend_name?.split(' ')[0]?.toLowerCase()}</p>
          </div>
        </Link>
      </CardContent>
    </Card>
  );
}