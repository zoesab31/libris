import React from "react";
import { Button } from "@/components/ui/button";
import { Users, Star, Heart, Music, Calendar, Sparkles, Play } from "lucide-react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const LANGUAGE_FLAGS = {
  "Français": "🇫🇷", "Anglais": "🇬🇧", "Espagnol": "🇪🇸",
  "Italien": "🇮🇹", "Allemand": "🇩🇪", "Portugais": "🇵🇹",
  "Japonais": "🇯🇵", "Coréen": "🇰🇷", "Chinois": "🇨🇳", "Autre": "🌍"
};

const statusColors = {
  "Lu": "bg-green-100 text-green-800",
  "En cours": "bg-blue-100 text-blue-800",
  "À lire": "bg-yellow-100 text-yellow-800",
  "Abandonné": "bg-red-100 text-red-800",
  "Wishlist": "bg-purple-100 text-purple-800",
};

export default function FriendReviewsList({ friendsUserBooks, myFriends, allUsers, friendsShelves }) {
  if (friendsUserBooks.length === 0) return null;

  return (
    <div className="space-y-4 md:space-y-6">
      {friendsUserBooks.map((friendBook) => {
        const friend = myFriends.find((f) => f.friend_email === friendBook.created_by);
        const friendUser = allUsers.find((u) => u.email === friendBook.created_by);
        const friendShelf = friendsShelves.find((s) =>
          s.name === friendBook.custom_shelf && s.created_by === friendBook.created_by
        );

        return (
          <div key={friendBook.id} className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
            <div className="flex items-start gap-4 mb-4">
              <div className="w-16 h-16 rounded-full overflow-hidden flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
                {friendUser?.profile_picture ?
                  <img src={friendUser.profile_picture} alt={friend?.friend_name || friendBook.created_by} className="w-full h-full object-cover" /> :
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                    {(friend?.friend_name || friendBook.created_by)?.[0]?.toUpperCase()}
                  </div>
                }
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                  {friendUser?.display_name || friendUser?.username || 'Amie'}
                </h3>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColors[friendBook.status] || ''}`}>
                    {friendBook.status}
                  </span>
                  {friendBook.reading_language &&
                    <span className="px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-800">
                      {LANGUAGE_FLAGS[friendBook.reading_language]} {friendBook.reading_language}
                    </span>
                  }
                </div>
              </div>
              {friendBook.rating &&
                <div className="flex items-center gap-1 bg-gradient-to-r from-yellow-50 to-orange-50 px-4 py-2 rounded-xl shadow-sm">
                  <Star className="w-6 h-6 fill-current" style={{ color: '#FFD700' }} />
                  <span className="text-2xl font-bold" style={{ color: '#FFD700' }}>{friendBook.rating}</span>
                  <span className="text-sm text-gray-600">/5</span>
                </div>
              }
            </div>

            {friendShelf &&
              <div className="mb-4 p-3 rounded-xl flex items-center gap-2"
                style={{
                  backgroundColor: friendShelf.color === 'rose' ? '#FFE4EC' : friendShelf.color === 'bleu' ? '#E6F3FF' :
                    friendShelf.color === 'vert' ? '#E6FFF2' : friendShelf.color === 'violet' ? '#F0E6FF' :
                    friendShelf.color === 'orange' ? '#FFE8D9' : '#FFE4EC'
                }}>
                <span className="text-2xl">{friendShelf.icon}</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: 'var(--dark-text)' }}>Étagère : {friendShelf.name}</p>
                  {friendShelf.description && <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>{friendShelf.description}</p>}
                </div>
              </div>
            }

            {(friendBook.start_date || friendBook.end_date) &&
              <div className="flex items-center gap-4 mb-4 text-sm" style={{ color: 'var(--warm-pink)' }}>
                {friendBook.start_date && <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /><span>Début : {format(new Date(friendBook.start_date), 'dd/MM/yyyy', { locale: fr })}</span></div>}
                {friendBook.end_date && <div className="flex items-center gap-1"><Calendar className="w-4 h-4" /><span>Fin : {format(new Date(friendBook.end_date), 'dd/MM/yyyy', { locale: fr })}</span></div>}
              </div>
            }

            {friendBook.review &&
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                <h4 className="font-bold mb-2 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                  <Sparkles className="w-4 h-4" />Avis
                </h4>
                <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: 'var(--dark-text)' }}>{friendBook.review}</p>
              </div>
            }

            {friendBook.favorite_character &&
              <div className="mt-4 p-3 rounded-xl flex items-center gap-2" style={{ backgroundColor: '#FFF0F6' }}>
                <Heart className="w-5 h-5" style={{ color: 'var(--deep-pink)' }} />
                <p className="text-sm" style={{ color: 'var(--dark-text)' }}>
                  <span className="font-bold">Personnage préféré :</span> {friendBook.favorite_character}
                </p>
              </div>
            }

            {friendBook.music_playlist && friendBook.music_playlist.length > 0 &&
              <div className="mt-4 p-4 rounded-xl" style={{ backgroundColor: '#E6B3E8' }}>
                <h4 className="font-bold mb-3 flex items-center gap-2 text-white">
                  <Music className="w-5 h-5" />Playlist musicale ({friendBook.music_playlist.length})
                </h4>
                <div className="space-y-2">
                  {friendBook.music_playlist.slice(0, 3).map((music, idx) =>
                    <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-white/20 backdrop-blur-sm">
                      <Music className="w-4 h-4 text-white flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-white line-clamp-1">{music.title}</p>
                        {music.artist && <p className="text-xs text-white/80 line-clamp-1">{music.artist}</p>}
                      </div>
                      {music.link &&
                        <a href={music.link} target="_blank" rel="noopener noreferrer">
                          <Button size="sm" variant="ghost" className="text-white hover:bg-white/10"><Play className="w-4 h-4" /></Button>
                        </a>
                      }
                    </div>
                  )}
                  {friendBook.music_playlist.length > 3 && <p className="text-xs text-center text-white/80">+{friendBook.music_playlist.length - 3} autres musiques</p>}
                </div>
              </div>
            }
          </div>
        );
      })}
    </div>
  );
}