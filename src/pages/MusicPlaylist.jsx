import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Music, BookOpen, Play, ExternalLink, Search } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function MusicPlaylist() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBookId, setSelectedBookId] = useState("all");

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

  // Group music entries by book
  const musicByBook = useMemo(() => {
    const grouped = {};

    myBooks.forEach(ub => {
      const book = allBooks.find(b => b.id === ub.book_id);
      if (!book) return;

      const musicList = [];

      // New format: music_playlist array
      if (ub.music_playlist && ub.music_playlist.length > 0) {
        musicList.push(...ub.music_playlist.map(music => ({
          ...music,
          userBook: ub,
          book: book
        })));
      }

      // Old format: single music field (only if not already in playlist)
      if (ub.music && ub.music_link) {
        const alreadyInPlaylist = ub.music_playlist?.some(m => 
          m.title === ub.music && m.link === ub.music_link
        );
        
        if (!alreadyInPlaylist) {
          musicList.push({
            title: ub.music,
            artist: ub.music_artist || "",
            link: ub.music_link,
            userBook: ub,
            book: book
          });
        }
      }

      if (musicList.length > 0) {
        grouped[book.id] = {
          book,
          userBook: ub,
          musicList
        };
      }
    });

    return grouped;
  }, [myBooks, allBooks]);

  const booksWithMusic = Object.values(musicByBook);
  const totalMusicCount = booksWithMusic.reduce((sum, b) => sum + b.musicList.length, 0);

  // Get music to display based on selected book
  const displayedMusic = useMemo(() => {
    if (selectedBookId === "all") {
      return booksWithMusic.flatMap(b => b.musicList);
    }
    const bookData = musicByBook[selectedBookId];
    return bookData ? bookData.musicList : [];
  }, [selectedBookId, musicByBook, booksWithMusic]);

  // Apply search filter
  const filteredMusic = useMemo(() => {
    if (!searchQuery) return displayedMusic;
    
    const query = searchQuery.toLowerCase().trim();
    return displayedMusic.filter(entry =>
      entry.book.title.toLowerCase().includes(query) ||
      entry.book.author.toLowerCase().includes(query) ||
      entry.title.toLowerCase().includes(query) ||
      entry.artist?.toLowerCase().includes(query)
    );
  }, [displayedMusic, searchQuery]);

  // Detect platform from link
  const getPlatform = (link) => {
    if (!link) return 'Lien externe';
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

  // Auto-select first book on load
  useEffect(() => {
    if (booksWithMusic.length > 0 && selectedBookId === "all") {
      setSelectedBookId(booksWithMusic[0].book.id);
    }
  }, [booksWithMusic.length]);

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
              {totalMusicCount} musique{totalMusicCount > 1 ? 's' : ''} • {booksWithMusic.length} livre{booksWithMusic.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
                    style={{ color: 'var(--warm-pink)' }} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une musique, un livre ou un artiste..."
              className="pl-10 py-6 text-lg bg-white shadow-md rounded-xl border-0"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-2 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--beige)' }} />
            ))}
          </div>
        ) : booksWithMusic.length > 0 ? (
          <Tabs value={selectedBookId} onValueChange={setSelectedBookId} className="w-full">
            {/* Book Tabs */}
            <TabsList className="bg-white shadow-md p-1 rounded-xl border-0 flex-wrap h-auto mb-6 overflow-x-auto">
              <TabsTrigger
                value="all"
                className="rounded-lg font-bold data-[state=active]:text-white whitespace-nowrap"
                style={selectedBookId === "all" ? {
                  background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)',
                  color: '#FFFFFF'
                } : { color: '#000000' }}
              >
                📚 Tous ({totalMusicCount})
              </TabsTrigger>
              {booksWithMusic.map(({ book, musicList }) => (
                <TabsTrigger
                  key={book.id}
                  value={book.id}
                  className="rounded-lg font-bold data-[state=active]:text-white whitespace-nowrap"
                  style={selectedBookId === book.id ? {
                    background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)',
                    color: '#FFFFFF'
                  } : { color: '#000000' }}
                >
                  {book.title} ({musicList.length})
                </TabsTrigger>
              ))}
            </TabsList>

            {/* All Books Tab Content */}
            <TabsContent value="all">
              {filteredMusic.length > 0 ? (
                <div className="grid md:grid-cols-2 gap-6">
                  {filteredMusic.map((entry, index) => {
                    const platform = getPlatform(entry.link);
                    const platformColor = getPlatformColor(platform);

                    return (
                      <Card key={`${entry.userBook.id}-${index}`} className="shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
                        <div className="h-3" style={{ background: `linear-gradient(90deg, ${platformColor}, ${platformColor}88)` }} />
                        <CardContent className="p-6">
                          <div className="flex gap-4 mb-4">
                            {/* Book Cover */}
                            <div className="w-20 h-28 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                                 style={{ backgroundColor: 'var(--beige)' }}>
                              {entry.book.cover_url ? (
                                <img 
                                  src={entry.book.cover_url} 
                                  alt={entry.book.title}
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
                                {entry.book.title}
                              </h3>
                              <p className="text-sm mb-2" style={{ color: 'var(--warm-pink)' }}>
                                {entry.book.author}
                              </p>
                              {entry.userBook.rating && (
                                <div className="flex items-center gap-1">
                                  <span className="text-lg">⭐</span>
                                  <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                                    {entry.userBook.rating}/5
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
                                  {entry.title}
                                </p>
                                {entry.artist && (
                                  <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                                    {entry.artist}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Play Button */}
                          {entry.link ? (
                            <a 
                              href={entry.link} 
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
                          ) : (
                            <div className="w-full py-3 rounded-xl font-bold text-center"
                                 style={{ backgroundColor: 'var(--beige)', color: 'var(--warm-pink)' }}>
                              Aucun lien disponible
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-20">
                  <Music className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                  <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                    Aucune musique trouvée
                  </h3>
                  <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                    Essayez une autre recherche
                  </p>
                </div>
              )}
            </TabsContent>

            {/* Individual Book Tabs Content */}
            {booksWithMusic.map(({ book, userBook, musicList }) => (
              <TabsContent key={book.id} value={book.id}>
                {/* Book Header */}
                <div className="mb-6 p-6 rounded-2xl shadow-lg bg-white">
                  <div className="flex gap-4">
                    <div className="w-24 h-36 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                         style={{ backgroundColor: 'var(--beige)' }}>
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <BookOpen className="w-8 h-8" style={{ color: 'var(--warm-pink)' }} />
                        </div>
                      )}
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                        {book.title}
                      </h2>
                      <p className="text-lg mb-2" style={{ color: 'var(--warm-pink)' }}>
                        {book.author}
                      </p>
                      {userBook.rating && (
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">⭐</span>
                          <span className="text-lg font-bold" style={{ color: 'var(--gold)' }}>
                            {userBook.rating}/5
                          </span>
                        </div>
                      )}
                      <p className="text-sm mt-2" style={{ color: 'var(--warm-pink)' }}>
                        {musicList.length} musique{musicList.length > 1 ? 's' : ''} associée{musicList.length > 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Music List for this book */}
                <div className="grid md:grid-cols-2 gap-6">
                  {musicList.filter(entry => {
                    if (!searchQuery) return true;
                    const query = searchQuery.toLowerCase().trim();
                    return entry.title.toLowerCase().includes(query) ||
                           entry.artist?.toLowerCase().includes(query);
                  }).map((entry, index) => {
                    const platform = getPlatform(entry.link);
                    const platformColor = getPlatformColor(platform);

                    return (
                      <Card key={index} className="shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
                        <div className="h-3" style={{ background: `linear-gradient(90deg, ${platformColor}, ${platformColor}88)` }} />
                        <CardContent className="p-6">
                          {/* Music Info */}
                          <div className="p-4 rounded-xl mb-4" 
                               style={{ 
                                 background: `linear-gradient(135deg, ${platformColor}15, ${platformColor}08)`,
                                 borderLeft: `4px solid ${platformColor}`
                               }}>
                            <div className="flex items-start gap-3">
                              <Music className="w-5 h-5 flex-shrink-0 mt-1" style={{ color: platformColor }} />
                              <div className="flex-1 min-w-0">
                                <p className="font-bold text-xl mb-1" style={{ color: 'var(--dark-text)' }}>
                                  {entry.title}
                                </p>
                                {entry.artist && (
                                  <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                                    {entry.artist}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Play Button */}
                          {entry.link ? (
                            <a 
                              href={entry.link} 
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
                          ) : (
                            <div className="w-full py-3 rounded-xl font-bold text-center"
                                 style={{ backgroundColor: 'var(--beige)', color: 'var(--warm-pink)' }}>
                              Aucun lien disponible
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </TabsContent>
            ))}
          </Tabs>
        ) : (
          <div className="text-center py-20">
            <Music className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              Aucune musique associée
            </h3>
            <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
              Ajoutez des musiques à vos livres pour créer votre playlist littéraire
            </p>
          </div>
        )}
      </div>
    </div>
  );
}