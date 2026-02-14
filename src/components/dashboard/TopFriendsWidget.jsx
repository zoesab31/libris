import React, { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function TopFriendsWidget({ user, compact = false }) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [hoveredFriend, setHoveredFriend] = useState(null);

  // Fetch friends
  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ 
      created_by: user?.email, 
      status: "Acceptée" 
    }),
    enabled: !!user,
  });

  // Fetch all users to get profile pictures
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: myFriends.length > 0,
  });

  const hideFriendMutation = useMutation({
    mutationFn: async (friendshipId) => {
      await base44.entities.Friendship.update(friendshipId, {
        is_hidden: true
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myFriends'] });
      toast.success("Amie masquée");
    },
  });

  // Get visible friends with profile pictures
  const visibleFriends = React.useMemo(() => {
    return myFriends
      .filter(friend => !friend.is_hidden)
      .map(friend => {
        const friendUser = allUsers.find(u => u.email === friend.friend_email);
        return {
          ...friend,
          profile_picture: friendUser?.profile_picture
        };
      })
      .slice(0, 4);
  }, [myFriends, allUsers]);

  if (visibleFriends.length === 0) return null;

  return (
    <Card className="border-0 rounded-3xl overflow-hidden dash-card"
          style={{ 
            backgroundColor: 'white',
            boxShadow: '0 4px 16px rgba(255, 105, 180, 0.08)'
          }}>
      <CardContent className="p-6 md:p-8">
        <h2 className="text-lg font-bold mb-6 flex items-center gap-3" style={{ color: '#2D3748' }}>
          <div className="w-9 h-9 rounded-xl flex items-center justify-center"
               style={{ backgroundColor: '#FFE9F0' }}>
            <Users className="w-5 h-5" style={{ color: '#FF1493' }} />
          </div>
          Mes meilleures amies
        </h2>
        <div className="grid grid-cols-2 gap-4">
          {visibleFriends.map((friend) => (
            <div 
              key={friend.id}
              className="relative"
              onMouseEnter={() => setHoveredFriend(friend.id)}
              onMouseLeave={() => setHoveredFriend(null)}
            >
              <div 
                onClick={() => navigate(createPageUrl("UserProfile") + `?email=${friend.friend_email}`)}
                className="flex flex-col items-center gap-3 p-4 rounded-2xl hover:bg-pink-50 transition-all cursor-pointer dash-card"
                style={{ backgroundColor: '#FFF5F8' }}
              >
                <div className="w-20 h-20 rounded-full overflow-hidden flex-shrink-0"
                     style={{ 
                       backgroundColor: '#FF69B4',
                       boxShadow: '0 4px 12px rgba(255, 105, 180, 0.25)'
                     }}>
                  {friend.profile_picture ? (
                    <img src={friend.profile_picture} alt={friend.friend_name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                      {friend.friend_name?.[0]?.toUpperCase() || 'A'}
                    </div>
                  )}
                </div>
                <p className="font-bold text-sm text-center line-clamp-2 w-full" style={{ color: '#2D3748' }}>
                  @{friendUser?.pseudo || friendUser?.display_name || friend.friend_email?.split('@')[0] || 'amie'}
                </p>
              </div>
              
              {hoveredFriend === friend.id && (
                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    if (window.confirm(`Masquer ${friend.friend_name} de vos meilleures amies ?`)) {
                      hideFriendMutation.mutate(friend.id);
                    }
                  }}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center transition-all hover:scale-110 z-10"
                  style={{ 
                    backgroundColor: '#EF4444',
                    boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)'
                  }}
                >
                  <X className="w-4 h-4 text-white" />
                </button>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}