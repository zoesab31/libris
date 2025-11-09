import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Music, BookOpen, Play, ExternalLink, Search, ArrowLeft } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function MusicPlaylist() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);

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

  // Group music entries by book and sort by reading order
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

  // Sort books by reading order (end_date)
  const booksWithMusic = useMemo(() => {
    return Object.values(musicByBook).sort((a, b) => {
      const dateA = a.userBook.end_date || a.userBook.start_date || a.userBook.updated_date || '';
      const dateB = b.userBook.end_date || b.userBook.start_date || b.userBook.updated_date || '';
      
      // Sort by most recent first (descending order)
      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;
      
      return new Date(dateB) - new Date(dateA);
    });
  }, [musicByBook]);

  const totalMusicCount = booksWithMusic.reduce((sum, b) => sum + b.musicList.length, 0);

  // Filter books by search
  const filteredBooks = useMemo(() => {
    if (!searchQuery) return booksWithMusic;
    
    const query = searchQuery.toLowerCase().trim();
    return booksWithMusic.filter(({ book, musicList }) =>
      book.title.toLowerCase().includes(query) ||
      book.author.toLowerCase().includes(query) ||
      musicList.some(m => 
        m.title.toLowerCase().includes(query) ||
        m.artist?.toLowerCase().includes(query)
      )
    );
  }, [booksWithMusic, searchQuery]);

  // Filter music within selected book
  const filteredMusicInBook = useMemo(() => {
    if (!selectedBook) return [];
    
    const bookData = musicByBook[selectedBook.id];
    if (!bookData) return [];

    if (!searchQuery) return bookData.musicList;
    
    const query = searchQuery.toLowerCase().trim();
    return bookData.musicList.filter(m =>
      m.title.toLowerCase().includes(query) ||
      m.artist?.toLowerCase().includes(query)
    );
  }, [selectedBook, musicByBook, searchQuery]);

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

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          {selectedBook && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedBook(null);
                setSearchQuery("");
              }}
              className="rounded-full"
            >
              <ArrowLeft className="w-6 h-6" style={{ color: 'var(--deep-pink)' }} />
            </Button>
          )}
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
               style={{ background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)' }}>
            <Music className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
              {selectedBook ? selectedBook.title : '🎵 Ma Playlist Littéraire'}
            </h1>
            <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
              {selectedBook 
                ? `${musicByBook[selectedBook.id]?.musicList.length || 0} musique${musicByBook[selectedBook.id]?.musicList.length > 1 ? 's' : ''}`
                : `${totalMusicCount} musique${totalMusicCount > 1 ? 's' : ''} • ${booksWithMusic.length} livre${booksWithMusic.length > 1 ? 's' : ''}`
              }
            </p>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" 
                    style={{ color: 'var(--warm-pink)' }} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={selectedBook ? "Rechercher une musique..." : "Rechercher un livre, une musique ou un artiste..."}
              className="pl-12 py-6 text-lg bg-white shadow-md rounded-xl border-0"
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid md:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-80 rounded-2xl animate-pulse" style={{ backgroundColor: 'var(--beige)' }} />
            ))}
          </div>
        ) : selectedBook ? (
          /* Music List View */
          <div>
            {/* Book Info Card */}
            <Card className="mb-6 shadow-xl border-0 overflow-hidden">
              <div className="h-2" style={{ background: 'linear-gradient(90deg, #E6B3E8, #FFB6C8)' }} />
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="w-32 h-48 rounded-xl overflow-hidden shadow-lg flex-shrink-0"
                       style={{ backgroundColor: 'var(--beige)' }}>
                    {selectedBook.cover_url ? (
                      <img src={selectedBook.cover_url} alt={selectedBook.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                      {selectedBook.title}
                    </h2>
                    <p className="text-xl mb-3" style={{ color: 'var(--warm-pink)' }}>
                      {selectedBook.author}
                    </p>
                    {musicByBook[selectedBook.id]?.userBook.rating && (
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-2xl">⭐</span>
                        <span className="text-xl font-bold" style={{ color: 'var(--gold)' }}>
                          {musicByBook[selectedBook.id].userBook.rating}/5
                        </span>
                      </div>
                    )}
                    <div className="flex items-center gap-2 p-3 rounded-xl"
                         style={{ backgroundColor: 'var(--beige)' }}>
                      <Music className="w-5 h-5" style={{ color: 'var(--deep-pink)' }} />
                      <span className="font-bold" style={{ color: 'var(--dark-text)' }}>
                        {filteredMusicInBook.length} musique{filteredMusicInBook.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Music Cards */}
            {filteredMusicInBook.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredMusicInBook.map((entry, index) => {
                  const platform = getPlatform(entry.link);
                  const platformColor = getPlatformColor(platform);

                  return (
                    <Card key={index} className="shadow-lg border-0 overflow-hidden hover:shadow-xl transition-all hover:-translate-y-1">
                      <div className="h-3" style={{ background: `linear-gradient(90deg, ${platformColor}, ${platformColor}88)` }} />
                      <CardContent className="p-6">
                        {/* Music Info */}
                        <div className="p-5 rounded-xl mb-4" 
                             style={{ 
                               background: `linear-gradient(135deg, ${platformColor}15, ${platformColor}08)`,
                               borderLeft: `4px solid ${platformColor}`
                             }}>
                          <div className="flex items-start gap-3">
                            <Music className="w-6 h-6 flex-shrink-0 mt-1" style={{ color: platformColor }} />
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xl mb-2" style={{ color: 'var(--dark-text)' }}>
                                {entry.title}
                              </p>
                              {entry.artist && (
                                <p className="text-base" style={{ color: 'var(--warm-pink)' }}>
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
          </div>
        ) : (
          /* Books Grid View */
          booksWithMusic.length > 0 ? (
            filteredBooks.length > 0 ? (
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredBooks.map(({ book, userBook, musicList }) => (
                  <Card 
                    key={book.id}
                    className="cursor-pointer shadow-lg border-0 overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-2"
                    onClick={() => setSelectedBook(book)}
                  >
                    <div className="h-2" style={{ background: 'linear-gradient(90deg, #E6B3E8, #FFB6C8)' }} />
                    <CardContent className="p-0">
                      {/* Book Cover */}
                      <div className="relative w-full aspect-[2/3] overflow-hidden"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book.cover_url ? (
                          <img 
                            src={book.cover_url} 
                            alt={book.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-16 h-16" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                        
                        {/* Music Count Badge */}
                        <div className="absolute top-3 right-3 px-3 py-1 rounded-full shadow-lg flex items-center gap-1"
                             style={{ background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)' }}>
                          <Music className="w-4 h-4 text-white" />
                          <span className="text-white font-bold text-sm">{musicList.length}</span>
                        </div>

                        {/* Gradient overlay on hover */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Book Info */}
                      <div className="p-4">
                        <h3 className="font-bold text-lg mb-1 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                          {book.title}
                        </h3>
                        <p className="text-sm mb-2 line-clamp-1" style={{ color: 'var(--warm-pink)' }}>
                          {book.author}
                        </p>
                        {userBook.rating && (
                          <div className="flex items-center gap-1">
                            <span className="text-lg">⭐</span>
                            <span className="text-sm font-bold" style={{ color: 'var(--gold)' }}>
                              {userBook.rating}/5
                            </span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-20">
                <Search className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  Aucun livre trouvé
                </h3>
                <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                  Essayez une autre recherche
                </p>
              </div>
            )
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
          )
        )}
      </div>
    </div>
  );
}