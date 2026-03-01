import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Music, BookOpen, Play, ExternalLink, Search, ArrowLeft, Layers } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export default function MusicPlaylist() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeries, setSelectedSeries] = useState(null);

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

  const { data: bookSeries = [] } = useQuery({
    queryKey: ['bookSeries'],
    queryFn: () => base44.entities.BookSeries.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  // Group music entries by series or standalone books
  const musicBySeries = useMemo(() => {
    const grouped = {};
    const seriesBookIds = new Set(); // To track book IDs already part of an explicit series

    // First, process explicit series from BookSeries entity
    bookSeries.forEach(series => {
      const currentSeriesBookIds = [
        ...(series.books_read || []),
        ...(series.books_in_pal || []),
        ...(series.books_wishlist || [])
      ];

      currentSeriesBookIds.forEach(id => seriesBookIds.add(id)); // Mark books as part of a series

      const seriesBooks = myBooks.filter(ub => currentSeriesBookIds.includes(ub.book_id));
      const allSeriesMusic = [];
      const booksInSeries = [];

      seriesBooks.forEach(ub => {
        const book = allBooks.find(b => b.id === ub.book_id);
        if (!book) return;

        booksInSeries.push({ book, userBook: ub });

        // Collect all music from this book
        if (ub.music_playlist && ub.music_playlist.length > 0) {
          ub.music_playlist.forEach(music => {
            // Avoid duplicates
            const exists = allSeriesMusic.some(m =>
              m.title === music.title &&
              m.artist === music.artist &&
              m.link === music.link
            );
            if (!exists) {
              allSeriesMusic.push({
                ...music,
                fromBook: book
              });
            }
          });
        }

        // Old format compatibility
        if (ub.music && ub.music_link) {
          const exists = allSeriesMusic.some(m =>
            m.title === ub.music && m.link === ub.music_link
          );
          if (!exists) {
            allSeriesMusic.push({
              title: ub.music,
              artist: ub.music_artist || "",
              link: ub.music_link,
              fromBook: book
            });
          }
        }
      });

      if (allSeriesMusic.length > 0) {
        grouped[series.id] = { // Use series.id as the key for the grouped entry
          type: 'series',
          series: series, // Keep original series object
          books: booksInSeries,
          musicList: allSeriesMusic,
          // Use the most recently read book for cover
          coverBook: booksInSeries
            .sort((a, b) => {
              const dateA = a.userBook.end_date || a.userBook.start_date || '';
              const dateB = b.userBook.end_date || b.userBook.start_date || '';
              return dateB.localeCompare(dateA);
            })[0]?.book,
        };
      }
    });

    // Then, process standalone books (not in any explicit series)
    myBooks.forEach(ub => {
      // Skip if book is already in an explicit series
      if (seriesBookIds.has(ub.book_id)) return;

      const book = allBooks.find(b => b.id === ub.book_id);
      if (!book) return;

      const musicList = [];

      if (ub.music_playlist && ub.music_playlist.length > 0) {
        musicList.push(...ub.music_playlist.map(music => ({
          ...music,
          fromBook: book
        })));
      }

      if (ub.music && ub.music_link && !musicList.some(m => m.title === ub.music)) {
        musicList.push({
          title: ub.music,
          artist: ub.music_artist || "",
          link: ub.music_link,
          fromBook: book
        });
      }

      if (musicList.length > 0) {
        grouped[`standalone_${book.id}`] = { // Unique key for standalone books
          type: 'standalone',
          book,
          userBook: ub,
          musicList,
          coverBook: book
        };
      }
    });

    return grouped;
  }, [myBooks, allBooks, bookSeries]);

  // Sort entries by reading order (most recent first)
  const sortedEntries = useMemo(() => {
    return Object.values(musicBySeries).sort((a, b) => {
      const getDate = (entry) => {
        if (entry.type === 'series') {
          // Get the most recent date from all books in series
          return entry.books.reduce((latest, { userBook }) => {
            const date = userBook.end_date || userBook.start_date || userBook.updated_date || '';
            return date > latest ? date : latest;
          }, '');
        } else { // 'standalone'
          return entry.userBook.end_date || entry.userBook.start_date || entry.userBook.updated_date || '';
        }
      };

      const dateA = getDate(a);
      const dateB = getDate(b);

      if (!dateA && !dateB) return 0;
      if (!dateA) return 1;
      if (!dateB) return -1;

      return dateB.localeCompare(dateA);
    });
  }, [musicBySeries]);

  const totalMusicCount = sortedEntries.reduce((sum, entry) => sum + entry.musicList.length, 0);

  // Filter entries by search
  const filteredEntries = useMemo(() => {
    if (!searchQuery) return sortedEntries;

    const query = searchQuery.toLowerCase().trim();
    return sortedEntries.filter(entry => {
      if (entry.type === 'series') {
        return entry.series.series_name.toLowerCase().includes(query) ||
               entry.books.some(({ book }) =>
                 book.title.toLowerCase().includes(query) ||
                 book.author.toLowerCase().includes(query)
               ) ||
               entry.musicList.some(m =>
                 m.title.toLowerCase().includes(query) ||
                 m.artist?.toLowerCase().includes(query)
               );
      } else { // 'standalone'
        return entry.book.title.toLowerCase().includes(query) ||
               entry.book.author.toLowerCase().includes(query) ||
               entry.musicList.some(m =>
                 m.title.toLowerCase().includes(query) ||
                 m.artist?.toLowerCase().includes(query)
               );
      }
    });
  }, [sortedEntries, searchQuery]);

  // Filter music within selected series/book
  const filteredMusicInSelection = useMemo(() => {
    if (!selectedSeries) return [];

    if (!searchQuery) return selectedSeries.musicList;

    const query = searchQuery.toLowerCase().trim();
    return selectedSeries.musicList.filter(m =>
      m.title.toLowerCase().includes(query) ||
      m.artist?.toLowerCase().includes(query)
    );
  }, [selectedSeries, searchQuery]);

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
        <div className="flex items-center gap-3 mb-8 p-5 rounded-3xl shadow-lg"
             style={{ background: '#FCE8F8', border: '1px solid #F4BDE9' }}>
          {selectedSeries && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setSelectedSeries(null);
                setSearchQuery("");
              }}
              className="rounded-full"
            >
              <ArrowLeft className="w-6 h-6" style={{ color: '#A81F8C' }} />
            </Button>
          )}
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
               style={{ background: 'linear-gradient(135deg, #E06AC4, #F4BDE9)' }}>
            <Music className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: '#A81F8C' }}>
              {selectedSeries
                ? (selectedSeries.type === 'series' ? selectedSeries.series.series_name : selectedSeries.book.title)
                : '🎵 Ma Playlist Littéraire'}
            </h1>
            <p className="text-lg" style={{ color: '#C24FAE' }}>
              {selectedSeries
                ? `${selectedSeries.musicList.length} musique${selectedSeries.musicList.length > 1 ? 's' : ''}${selectedSeries.type !== 'standalone' ? ` • ${selectedSeries.books.length} tome${selectedSeries.books.length > 1 ? 's' : ''}` : ''}`
                : `${totalMusicCount} musique${totalMusicCount > 1 ? 's' : ''} • ${sortedEntries.filter(e => e.type === 'series').length} saga${sortedEntries.filter(e => e.type === 'series').length > 1 ? 's' : ''} et ${sortedEntries.filter(e => e.type === 'standalone').length} livre${sortedEntries.filter(e => e.type === 'standalone').length > 1 ? 's' : ''}`
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
              placeholder={selectedSeries ? "Rechercher une musique..." : "Rechercher une saga, un livre, une musique..."}
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
        ) : selectedSeries ? (
          /* Music List View */
          <div>
            {/* Series/Book Info Card */}
            <Card className="mb-6 shadow-xl border-0 overflow-hidden">
              <div className="h-2" style={{ background: 'linear-gradient(90deg, #E6B3E8, #FFB6C8)' }} />
              <CardContent className="p-6">
                <div className="flex gap-4">
                  <div className="w-32 h-48 rounded-xl overflow-hidden shadow-lg flex-shrink-0"
                       style={{ backgroundColor: 'var(--beige)' }}>
                    {selectedSeries.coverBook?.cover_url ? (
                      <img src={selectedSeries.coverBook.cover_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    {selectedSeries.type === 'series' ? (
                      <>
                        <div className="flex items-center gap-2 mb-2">
                          <Layers className="w-5 h-5" style={{ color: 'var(--deep-pink)' }} />
                          <span className="text-sm font-bold px-3 py-1 rounded-full"
                                style={{ backgroundColor: '#E6B3E8', color: 'white' }}>
                            Saga • {selectedSeries.books.length} tome{selectedSeries.books.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                          {selectedSeries.series.series_name}
                        </h2>
                        <p className="text-sm mb-4" style={{ color: 'var(--warm-pink)' }}>
                          {selectedSeries.series.author}
                        </p>
                      </>
                    ) : (
                      <>
                        <h2 className="text-3xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                          {selectedSeries.book.title}
                        </h2>
                        <p className="text-xl mb-3" style={{ color: 'var(--warm-pink)' }}>
                          {selectedSeries.book.author}
                        </p>
                        {selectedSeries.userBook.rating && (
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">⭐</span>
                            <span className="text-xl font-bold" style={{ color: 'var(--gold)' }}>
                              {selectedSeries.userBook.rating}/5
                            </span>
                          </div>
                        )}
                      </>
                    )}
                    <div className="flex items-center gap-2 p-3 rounded-xl"
                         style={{ backgroundColor: 'var(--beige)' }}>
                      <Music className="w-5 h-5" style={{ color: 'var(--deep-pink)' }} />
                      <span className="font-bold" style={{ color: 'var(--dark-text)' }}>
                        {filteredMusicInSelection.length} musique{filteredMusicInSelection.length > 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Music Cards */}
            {filteredMusicInSelection.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-6">
                {filteredMusicInSelection.map((entry, index) => {
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
                                <p className="text-base mb-2" style={{ color: 'var(--warm-pink)' }}>
                                  {entry.artist}
                                </p>
                              )}
                              {selectedSeries.type === 'series' && entry.fromBook && (
                                <p className="text-xs px-2 py-1 rounded-full inline-block"
                                   style={{ backgroundColor: 'var(--beige)', color: 'var(--warm-brown)' }}>
                                  📚 {entry.fromBook.title}
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
          /* Series/Books Grid View */
          sortedEntries.length > 0 ? (
            filteredEntries.length > 0 ? (
              <div className="grid md:grid-cols-3 lg:grid-cols-4 gap-6">
                {filteredEntries.map((entry) => (
                  <Card
                    key={entry.type === 'series' ? entry.series.id : `standalone_${entry.book.id}`}
                    className="cursor-pointer shadow-lg border-0 overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-2"
                    onClick={() => setSelectedSeries(entry)}
                  >
                    <div className="h-2" style={{ background: 'linear-gradient(90deg, #E6B3E8, #FFB6C8)' }} />
                    <CardContent className="p-0">
                      {/* Cover */}
                      <div className="relative w-full aspect-[2/3] overflow-hidden"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {entry.coverBook?.cover_url ? (
                          <img
                            src={entry.coverBook.cover_url}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-16 h-16" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}

                        {/* Badges */}
                        <div className="absolute top-3 right-3 flex flex-col gap-2">
                          <div className="px-3 py-1 rounded-full shadow-lg flex items-center gap-1"
                               style={{ background: 'linear-gradient(135deg, #E6B3E8, #FFB6C8)' }}>
                            <Music className="w-4 h-4 text-white" />
                            <span className="text-white font-bold text-sm">{entry.musicList.length}</span>
                          </div>
                          {entry.type === 'series' && (
                            <div className="px-3 py-1 rounded-full shadow-lg flex items-center gap-1"
                                 style={{ backgroundColor: 'rgba(230, 179, 232, 0.95)' }}>
                              <Layers className="w-3 h-3 text-white" />
                              <span className="text-white font-bold text-xs">{entry.books.length}</span>
                            </div>
                          )}
                        </div>

                        {/* Gradient overlay */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 hover:opacity-100 transition-opacity" />
                      </div>

                      {/* Info */}
                      <div className="p-4">
                        {entry.type === 'series' ? (
                          <>
                            <div className="flex items-center gap-2 mb-2">
                              <Layers className="w-4 h-4" style={{ color: 'var(--deep-pink)' }} />
                              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                                    style={{ backgroundColor: '#E6B3E8', color: 'white' }}>
                                Saga
                              </span>
                            </div>
                            <h3 className="font-bold text-lg mb-1 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                              {entry.series.series_name}
                            </h3>
                            <p className="text-sm line-clamp-1" style={{ color: 'var(--warm-pink)' }}>
                              {entry.series.author}
                            </p>
                          </>
                        ) : (
                          <>
                            <h3 className="font-bold text-lg mb-1 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                              {entry.book.title}
                            </h3>
                            <p className="text-sm mb-2 line-clamp-1" style={{ color: 'var(--warm-pink)' }}>
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
                          </>
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
                  Aucun résultat trouvé
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