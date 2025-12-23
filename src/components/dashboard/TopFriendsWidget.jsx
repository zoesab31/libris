import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, MessageCircle, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function TopFriendsWidget({ user, compact = false }) {
  const navigate = useNavigate();

  // Fetch friends
  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ 
      created_by: user?.email, 
      status: "Acceptée" 
    }),
    enabled: !!user,
  });

  // Fetch all chat messages
  const { data: allMessages = [] } = useQuery({
    queryKey: ['allChatMessages'],
    queryFn: () => base44.entities.ChatMessage.list(),
    enabled: !!user && myFriends.length > 0,
  });

  // Fetch all chat rooms
  const { data: allRooms = [] } = useQuery({
    queryKey: ['allChatRooms'],
    queryFn: () => base44.entities.ChatRoom.list(),
    enabled: !!user && myFriends.length > 0,
  });

  // Fetch all users to get profile pictures
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: myFriends.length > 0,
  });

  // Calculate top 2 friends by message count
  const topFriends = React.useMemo(() => {
    if (myFriends.length === 0 || allMessages.length === 0) return [];

    const friendMessageCounts = {};

    myFriends.forEach(friend => {
      const friendEmail = friend.friend_email;
      
      // Find private chat room with this friend
      const privateRoom = allRooms.find(room => 
        room.type === "PRIVATE" &&
        room.participants?.includes(user?.email) &&
        room.participants?.includes(friendEmail)
      );

      if (!privateRoom) {
        friendMessageCounts[friendEmail] = 0;
        return;
      }

      // Count messages in this room
      const messagesCount = allMessages.filter(msg => 
        msg.chat_room_id === privateRoom.id
      ).length;

      friendMessageCounts[friendEmail] = messagesCount;
    });

    // Sort friends by message count and get top 2
    const sortedFriends = myFriends
      .map(friend => ({
        ...friend,
        messageCount: friendMessageCounts[friend.friend_email] || 0
      }))
      .sort((a, b) => b.messageCount - a.messageCount)
      .slice(0, 2);

    return sortedFriends;
  }, [myFriends, allMessages, allRooms, user]);

  if (topFriends.length === 0) return null;

  return (
    <Card className={`shadow-lg border-0 overflow-hidden ${compact ? 'rounded-2xl' : 'rounded-3xl'}`}>
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="flex items-center gap-2 mb-3">
          <Users className={`${compact ? 'w-4 h-4' : 'w-5 h-5'}`} style={{ color: 'var(--deep-pink)' }} />
          <h3 className={`${compact ? 'text-sm' : 'text-lg'} font-bold`} style={{ color: 'var(--dark-text)' }}>
            👭 Mes meilleures amies
          </h3>
        </div>
        
        <div className={compact ? "space-y-2" : "space-y-3"}>
          {topFriends.map((friend) => {
            const friendUser = allUsers.find(u => u.email === friend.friend_email);
            
            return (
              <div
                key={friend.id}
                onClick={() => navigate(createPageUrl("UserProfile") + `?userEmail=${friend.friend_email}`)}
                className={`flex items-center gap-2 ${compact ? 'p-2' : 'p-3'} rounded-xl cursor-pointer transition-all hover:shadow-md hover:-translate-y-1`}
                style={{ backgroundColor: 'var(--cream)' }}
              >
                {/* Profile Picture */}
                <div className={`${compact ? 'w-10 h-10' : 'w-14 h-14'} rounded-full overflow-hidden flex-shrink-0`}
                     style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
                  {friendUser?.profile_picture ? (
                    <img src={friendUser.profile_picture} 
                         alt={friend.friend_name} 
                         className="w-full h-full object-cover" />
                  ) : (
                    <div className={`w-full h-full flex items-center justify-center text-white font-bold ${compact ? 'text-base' : 'text-xl'}`}>
                      {friend.friend_name?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Friend Info */}
                <div className="flex-1 min-w-0">
                  <p className={`font-bold ${compact ? 'text-xs' : 'text-sm'} truncate`} style={{ color: 'var(--dark-text)' }}>
                    {friend.friend_name}
                  </p>
                  <div className={`flex items-center gap-1 ${compact ? 'text-[10px]' : 'text-xs'}`} style={{ color: 'var(--warm-pink)' }}>
                    <MessageCircle className={`${compact ? 'w-2.5 h-2.5' : 'w-3 h-3'}`} />
                    <span>{friend.messageCount} msg</span>
                  </div>
                </div>

                {/* Arrow */}
                <ArrowRight className={`${compact ? 'w-4 h-4' : 'w-5 h-5'} flex-shrink-0`} style={{ color: 'var(--deep-pink)' }} />
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}