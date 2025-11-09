import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Music, BookOpen, Play, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function MusicPlaylist() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [], isLoading } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  // Filter books that have music
  const booksWithMusic = myBooks
    .filter(ub => ub.music && ub.music_link)
    .map(ub => ({
      ...ub,
      book: allBooks.find(b => b.id === ub.book_id)
    }))
    .filter(item => item.book); // Remove entries where book wasn't found

  // Apply search filter
  const filteredMusic = booksWithMusic.filter(item =>
    item.book.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.book.author.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.music.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.music_artist?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Detect platform from link
  const getPlatform = (link) => {
    if (link.includes('youtube.com') || link.includes('youtu.be')) return 'YouTube';
    if (link.includes('spotify.com')) return 'Spotify';
    if (link.includes('deezer.com')) return 'Deezer';
    if (link.includes('apple.com')) return 'Apple Music';
    return 'Lien externe';
  };

  const getPlatformColor = (platform) => {
    switch(platform) {
      case 'YouTube': return '#FF0000';
      case 'Spotify': return '#1DB954';
      case 'Deezer': return '#FF6600';
      case 'Apple Music': return '#FA243C';
      default: return '#9B59B6';
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
               style={{ background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)' }}>
            <Music className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
              🎵 Ma Playlist Littéraire
            </h1>
            <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
              {booksWithMusic.length} musique{booksWithMusic.length > 1 ? 's' : ''} associée{booksWithMusic.length > 1 ? 's' : ''} à vos lectures
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Rechercher une musique, un livre ou un artiste..."
            className="py-6 text-lg bg-white shadow-md rounded-xl border-0"
          />
        </div>

        {/* Music List */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--beige)' }} />
            ))}
          </div>
        ) : filteredMusic.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {filteredMusic.map((item) => {
              const platform = getPlatform(item.music_link);
              const platformColor = getPlatformColor(platform);

              return (
                <Card key={item.id} className="shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
                  <div className="h-3" style={{ background: `linear-gradient(90deg, ${platformColor}, ${platformColor}88)` }} />
                  <CardContent className="p-6">
                    <div className="flex gap-4 mb-4">
                      {/* Book Cover */}
                      <div className="w-20 h-28 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {item.book.cover_url ? (
                          <img 
                            src={item.book.cover_url} 
                            alt={item.book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-6 h-6" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                      </div>

                      {/* Book Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg mb-1 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                          {item.book.title}
                        </h3>
                        <p className="text-sm mb-2" style={{ color: 'var(--warm-pink)' }}>
                          {item.book.author}
                        </p>
                        {item.rating && (
                          <div className="flex items-center gap-1">
                            <span className="text-lg">⭐</span>
                            <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                              {item.rating}/5
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Music Info */}
                    <div className="p-4 rounded-xl mb-4" 
                         style={{ 
                           background: `linear-gradient(135deg, ${platformColor}15, ${platformColor}08)`,
                           borderLeft: `4px solid ${platformColor}`
                         }}>
                      <div className="flex items-start gap-3">
                        <Music className="w-5 h-5 flex-shrink-0 mt-1" style={{ color: platformColor }} />
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-lg mb-1" style={{ color: 'var(--dark-text)' }}>
                            {item.music}
                          </p>
                          {item.music_artist && (
                            <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                              {item.music_artist}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Play Button */}
                    <a 
                      href={item.music_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <button
                        className="w-full py-3 rounded-xl font-bold text-white shadow-lg hover:shadow-xl transition-all flex items-center justify-center gap-2"
                        style={{ backgroundColor: platformColor }}
                      >
                        <Play className="w-5 h-5" />
                        Écouter sur {platform}
                        <ExternalLink className="w-4 h-4" />
                      </button>
                    </a>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <Music className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              {searchQuery ? "Aucune musique trouvée" : "Aucune musique associée"}
            </h3>
            <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
              {searchQuery 
                ? "Essayez une autre recherche" 
                : "Ajoutez des musiques à vos livres pour créer votre playlist littéraire"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}