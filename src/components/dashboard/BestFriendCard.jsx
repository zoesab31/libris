import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Users, Pencil, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";

export default function BestFriendCard({ user }) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const queryClient = useQueryClient();

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

  const selected = myFriends.filter((f) => !f.is_hidden);

  const toggleFriend = async (friend, checked) => {
    await base44.entities.Friendship.update(friend.id, { is_hidden: !checked });
    queryClient.invalidateQueries({ queryKey: ['myFriends'] });
  };

  const renderAvatar = (friendUser, friendName, size) => (
    <div className={`${size} rounded-full overflow-hidden flex-shrink-0`} style={{ boxShadow: '0 4px 12px rgba(255, 105, 180, 0.25)' }}>
      {friendUser?.profile_picture ? (
        <img src={friendUser.profile_picture} alt={friendName} className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-white font-bold" style={{ background: 'linear-gradient(135deg, #FF69B4, #FFB6C1)', fontSize: '1.1rem' }}>
          {friendName?.[0]?.toUpperCase() || 'A'}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="border-0 rounded-3xl overflow-hidden dash-card" style={{ backgroundColor: 'white', boxShadow: '0 4px 16px rgba(255, 105, 180, 0.08)' }}>
        <div className="p-6 md:p-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold flex items-center gap-3" style={{ color: '#2D3748' }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#FFE9F0' }}>
                <Users className="w-5 h-5" style={{ color: '#FF1493' }} />
              </div>
              Mes meilleures amies
            </h2>
            <button
              onClick={() => setPickerOpen(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold"
              style={{ backgroundColor: '#FFE9F0', color: '#FF1493' }}>
              <Pencil className="w-3.5 h-3.5" />
              Choisir
            </button>
          </div>

          {selected.length === 0 ?
            <div className="text-center py-6">
              <p className="text-sm mb-4" style={{ color: '#A78BBA' }}>
                Tu n'as pas encore choisi tes meilleures amies
              </p>
              <Button onClick={() => setPickerOpen(true)} className="text-white font-bold rounded-xl" style={{ backgroundColor: '#FF1493' }}>
                <Plus className="w-4 h-4 mr-1" /> Choisir mes meilleures amies
              </Button>
            </div>
            :
            <div className="grid grid-cols-2 gap-2">
              {selected.map((friend) => {
                const friendUser = allUsers.find((u) => u.email === friend.friend_email);
                return (
                  <Link
                    key={friend.id}
                    to={createPageUrl('UserProfile') + `?email=${friend.friend_email}`}
                    className="flex items-center gap-2.5 p-2.5 rounded-2xl hover:bg-pink-50 transition-all"
                    style={{ backgroundColor: '#FFF5F8' }}>
                    {renderAvatar(friendUser, friend.friend_name, 'w-10 h-10')}
                    <span className="font-bold text-xs truncate" style={{ color: '#2D3748' }}>
                      @{friendUser?.pseudo || friendUser?.display_name || friend.friend_name || friend.friend_email?.split('@')[0] || 'amie'}
                    </span>
                  </Link>
                );
              })}
            </div>
          }
        </div>
      </div>

      {/* Sélecteur des meilleures amies */}
      <Dialog open={pickerOpen} onOpenChange={setPickerOpen}>
        <DialogContent className="max-w-sm rounded-3xl">
          <DialogHeader>
            <DialogTitle style={{ color: '#FF1493' }}>Choisir mes meilleures amies</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 max-h-80 overflow-y-auto">
            {myFriends.map((friend) => {
              const friendUser = allUsers.find((u) => u.email === friend.friend_email);
              return (
                <div key={friend.id} className="flex items-center gap-3 p-2.5 rounded-2xl" style={{ backgroundColor: '#FFF5F8' }}>
                  {renderAvatar(friendUser, friend.friend_name, 'w-10 h-10')}
                  <span className="flex-1 font-semibold text-sm truncate" style={{ color: '#2D3748' }}>
                    {friend.friend_name || friend.friend_email}
                  </span>
                  <Switch
                    checked={!friend.is_hidden}
                    onCheckedChange={(checked) => toggleFriend(friend, checked)} />
                </div>
              );
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}