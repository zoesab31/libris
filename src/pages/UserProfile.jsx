
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, MessageCircle, Users, BookOpen, Quote, Image, Heart, Loader2, Palette, UsersRound, Music } from "lucide-react";
import { createPageUrl } from "@/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

export default function UserProfile() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("library");
  const [shelfFilter, setShelfFilter] = useState("all");
  const [showSharedReadings, setShowSharedReadings] = useState(false);
  const [sharedReadingTab, setSharedReadingTab] = useState("in_progress");
  
  const urlParams = new URLSearchParams(window.location.search);
  const userEmail = urlParams.get('userEmail');

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userEmail) {
      navigate(createPageUrl("Friends"));
    }
  }, [userEmail, navigate]);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const profileUser = allUsers.find(u => u.email === userEmail);

  const { data: friendName } = useQuery({
    queryKey: ['friendName', userEmail],
    queryFn: async () => {
      if (!currentUser) return null;
      const friendships = await base44.entities.Friendship.filter({ 
        created_by: currentUser.email,
        friend_email: userEmail,
        status: "Acceptée"
      });
      return friendships[0]?.friend_name || userEmail?.split('@')[0] || 'Amie';
    },
    enabled: !!currentUser && !!userEmail,
  });

  const { data: userBooks = [] } = useQuery({
    queryKey: ['userBooks', userEmail],
    queryFn: () => base44.entities.UserBook.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: userCustomShelves = [] } = useQuery({
    queryKey: ['userCustomShelves', userEmail],
    queryFn: () => base44.entities.CustomShelf.filter({ created_by: userEmail }),
    enabled: !!userEmail && activeTab === 'library',
  });

  const { data: userQuotes = [] } = useQuery({
    queryKey: ['userQuotes', userEmail],
    queryFn: () => base44.entities.Quote.filter({ created_by: userEmail }, '-created_date'),
    enabled: !!userEmail && activeTab === 'quotes',
  });

  const { data: userFanArts = [] } = useQuery({
    queryKey: ['userFanArts', userEmail],
    queryFn: () => base44.entities.FanArt.filter({ created_by: userEmail }),
    enabled: !!userEmail && activeTab === 'fanart',
  });

  const { data: userNailInspos = [] } = useQuery({
    queryKey: ['userNailInspos', userEmail],
    queryFn: () => base44.entities.NailInspo.filter({ created_by: userEmail }, '-created_date'),
    enabled: !!userEmail && activeTab === 'nailinspo',
  });

  const { data: userCharacters = [] } = useQuery({
    queryKey: ['userCharacters', userEmail],
    queryFn: () => base44.entities.BookBoyfriend.filter({ created_by: userEmail }, 'rank'),
    enabled: !!userEmail && activeTab === 'characters',
  });

  const { data: userBooksWithMusic = [] } = useQuery({
    queryKey: ['userBooksWithMusic', userEmail],
    queryFn: async () => {
      const books = await base44.entities.UserBook.filter({ created_by: userEmail });
      return books.filter(b => b.music && b.music_link);
    },
    enabled: !!userEmail && activeTab === 'music',
  });

  const { data: sharedReadings = [] } = useQuery({
    queryKey: ['sharedReadingsWithFriend', userEmail],
    queryFn: async () => {
      if (!currentUser) return [];
      const myReadings = await base44.entities.SharedReading.filter({ created_by: currentUser.email });
      return myReadings.filter(sr => sr.participants?.includes(userEmail));
    },
    enabled: !!currentUser && !!userEmail,
  });

  const readBooks = userBooks.filter(b => b.status === "Lu");
  const totalPages = readBooks.reduce((sum, ub) => {
    const book = allBooks.find(b => b.id === ub.book_id);
    return sum + (book?.page_count || 0);
  }, 0);

  const handleChat = () => {
    navigate(createPageUrl("Chat"));
  };

  if (!userEmail) {
    return null;
  }

  if (!friendName || !profileUser) {
    return (
      <div className="p-8 text-center" style={{ backgroundColor: 'var(--cream)', minHeight: '100vh' }}>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <Loader2 className="w-16 h-16 animate-spin" 
               style={{ color: 'var(--deep-pink)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--warm-pink)' }}>
            Chargement du profil...
          </p>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.email === userEmail;
  const accentColor = isOwnProfile ? 'var(--deep-pink)' : '#8B5CF6';
  const secondaryColor = isOwnProfile ? 'var(--warm-pink)' : '#A78BFA';
  const displayName = friendName || profileUser.display_name || profileUser.full_name || userEmail?.split('@')[0] || 'Amie';

  // Filter books by shelf
  const filteredBooks = shelfFilter === "all" 
    ? userBooks 
    : userBooks.filter(ub => ub.custom_shelf === shelfFilter);

  // Group shared readings by status
  const inProgressReadings = sharedReadings.filter(sr => sr.status === "En cours");
  const upcomingReadings = sharedReadings.filter(sr => sr.status === "À venir");
  const completedReadings = sharedReadings.filter(sr => sr.status === "Terminée");

  const totalSharedReadings = sharedReadings.length;

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      {/* Header - Removed banner, just back button */}
      <div className="p-4">
        <Button variant="ghost" onClick={() => navigate(-1)} style={{ color: 'var(--deep-pink)' }}>
          <ArrowLeft className="w-5 h-5 mr-2" />
          Retour
        </Button>
      </div>

      {/* Profile info */}
      <div className="max-w-6xl mx-auto px-4 md:px-8">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-center mb-8">
          {/* Large centered profile picture */}
          <div className="w-40 h-40 md:w-52 md:h-52 rounded-full overflow-hidden border-4 border-white bg-white mx-auto md:mx-0"
               style={{ 
                 boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                 transition: 'transform 0.2s'
               }}
               onMouseEnter={(e) => e.currentTarget.style.transform = 'scale(1.02)'}
               onMouseLeave={(e) => e.currentTarget.style.transform = 'scale(1)'}>
            {profileUser.profile_picture ? (
              <img 
                src={profileUser.profile_picture} 
                alt={displayName} 
                className="w-full h-full object-cover object-center"
                style={{ aspectRatio: '1 / 1' }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl md:text-7xl font-bold text-white"
                   style={{ backgroundColor: accentColor }}>
                {displayName[0]?.toUpperCase() || 'A'}
              </div>
            )}
          </div>

          <div className="flex-1 text-center md:text-left">
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              {displayName}
            </h1>
            <p className="text-lg mb-4" style={{ color: 'var(--warm-pink)' }}>
              {userEmail}
            </p>

            {!isOwnProfile && (
              <div className="flex gap-3 justify-center md:justify-start flex-wrap">
                <Button
                  onClick={handleChat}
                  className="text-white font-medium"
                  style={{ backgroundColor: accentColor }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </Button>
                <Button variant="outline" style={{ borderColor: accentColor, color: accentColor }}>
                  <Users className="w-4 h-4 mr-2" />
                  Amie
                </Button>
                <Button 
                  variant="outline" 
                  style={{ borderColor: accentColor, color: accentColor }}
                  onClick={() => setShowSharedReadings(true)}
                >
                  <UsersRound className="w-4 h-4 mr-2" />
                  Lectures communes
                  {totalSharedReadings > 0 && (
                    <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold text-white"
                          style={{ backgroundColor: accentColor }}>
                      {totalSharedReadings}
                    </span>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6 mx-auto md:mx-0">
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: accentColor }}>
                {readBooks.length}
              </p>
              <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                Livres lus
              </p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold" style={{ color: accentColor }}>
                {totalPages.toLocaleString()}
              </p>
              <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                Pages lues
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="bg-white shadow-sm p-1 rounded-xl border-0 mb-8 flex-wrap">
            <TabsTrigger 
              value="library" 
              className="rounded-lg font-bold"
              style={activeTab === "library" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <BookOpen className="w-4 h-4 mr-2" />
              Bibliothèque ({userBooks.length})
            </TabsTrigger>
            <TabsTrigger 
              value="quotes" 
              className="rounded-lg font-bold"
              style={activeTab === "quotes" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <Quote className="w-4 h-4 mr-2" />
              Citations
            </TabsTrigger>
            <TabsTrigger 
              value="fanart" 
              className="rounded-lg font-bold"
              style={activeTab === "fanart" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <Image className="w-4 h-4 mr-2" />
              Fan Art
            </TabsTrigger>
            <TabsTrigger 
              value="nailinspo" 
              className="rounded-lg font-bold"
              style={activeTab === "nailinspo" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <Palette className="w-4 h-4 mr-2" />
              Ongles
            </TabsTrigger>
            <TabsTrigger 
              value="characters" 
              className="rounded-lg font-bold"
              style={activeTab === "characters" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <Heart className="w-4 h-4 mr-2" />
              Personnages
            </TabsTrigger>
            <TabsTrigger 
              value="music" 
              className="rounded-lg font-bold"
              style={activeTab === "music" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <Music className="w-4 h-4 mr-2" />
              Playlist
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library">
            {/* Shelf filters */}
            {userCustomShelves.length > 0 && (
              <div className="mb-6 flex gap-2 flex-wrap">
                <button
                  onClick={() => setShelfFilter("all")}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                  style={{
                    backgroundColor: shelfFilter === "all" ? accentColor : 'white',
                    color: shelfFilter === "all" ? 'white' : accentColor,
                    border: `2px solid ${accentColor}`
                  }}
                >
                  Tous ({userBooks.length})
                </button>
                {userCustomShelves.map(shelf => {
                  const count = userBooks.filter(b => b.custom_shelf === shelf.name).length;
                  return (
                    <button
                      key={shelf.id}
                      onClick={() => setShelfFilter(shelf.name)}
                      className="px-4 py-2 rounded-full text-sm font-medium transition-all flex items-center gap-2"
                      style={{
                        backgroundColor: shelfFilter === shelf.name ? accentColor : 'white',
                        color: shelfFilter === shelf.name ? 'white' : accentColor,
                        border: `2px solid ${accentColor}`
                      }}
                    >
                      <span>{shelf.icon}</span>
                      {shelf.name} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            <div className="grid md:grid-cols-4 gap-4">
              {filteredBooks.map(ub => {
                const book = allBooks.find(b => b.id === ub.book_id);
                const shelf = ub.custom_shelf ? userCustomShelves.find(s => s.name === ub.custom_shelf) : null;
                
                if (!book) return null;
                return (
                  <Card key={ub.id} className="overflow-hidden hover:shadow-lg transition-all">
                    <div className="aspect-[2/3] relative">
                      {book.cover_url ? (
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center"
                             style={{ backgroundColor: 'var(--beige)' }}>
                          <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                        </div>
                      )}
                      <div className="absolute bottom-0 left-0 right-0 p-3 bg-gradient-to-t from-black/90 via-black/60 to-transparent">
                        <p 
                          className="text-white font-bold mb-2 book-title-display" 
                          style={{
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden',
                            overflowWrap: 'anywhere',
                            wordBreak: 'break-word',
                            fontSize: 'clamp(12px, 2.2vw, 14px)',
                            lineHeight: '1.25'
                          }}
                          title={book.title}
                        >
                          {book.title}
                        </p>
                        <div className="flex gap-1 flex-wrap">
                          <span className="text-xs px-2 py-1 rounded-full"
                                style={{ backgroundColor: accentColor, color: 'white' }}>
                            {ub.status}
                          </span>
                          {shelf && (
                            <span className="text-xs px-2 py-1 rounded-full bg-white/90 text-gray-800">
                              {shelf.icon} {shelf.name}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            {filteredBooks.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>
                  {shelfFilter === "all" ? "Aucun livre dans la bibliothèque" : `Aucun livre dans "${shelfFilter}"`}
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="quotes">
            <div className="space-y-4">
              {userQuotes.map(quote => {
                const book = allBooks.find(b => b.id === quote.book_id);
                return (
                  <Card key={quote.id} className="p-6 bg-white">
                    <CardContent>
                      <p className="text-lg italic mb-4" style={{ color: 'var(--dark-text)' }}>
                        "{quote.quote_text}"
                      </p>
                      <p className="text-sm font-medium" style={{ color: accentColor }}>
                        — {book?.title || 'Livre inconnu'}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {userQuotes.length === 0 && (
              <div className="text-center py-12">
                <Quote className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>Aucune citation</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="fanart">
            <div className="grid md:grid-cols-3 gap-4">
              {userFanArts.map(art => (
                <Card key={art.id} className="overflow-hidden hover:shadow-lg transition-all">
                  <img src={art.image_url} alt={art.folder_name} className="w-full h-64 object-cover" />
                </Card>
              ))}
            </div>
            {userFanArts.length === 0 && (
              <div className="text-center py-12">
                <Image className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>Aucun fan art</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="nailinspo">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {userNailInspos.map((inspo) => {
                const book = inspo.book_id ? allBooks.find(b => b.id === inspo.book_id) : null;
                
                return (
                  <div key={inspo.id} className="group relative rounded-xl overflow-hidden shadow-lg 
                                         transition-all hover:shadow-2xl hover:-translate-y-1">
                    <div className="aspect-square relative">
                      <img 
                        src={inspo.image_url} 
                        alt={inspo.title || "Nail inspo"}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent 
                                   opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="absolute bottom-0 left-0 right-0 p-3 text-white">
                        {inspo.title && (
                          <p className="font-medium text-sm mb-1">{inspo.title}</p>
                        )}
                        {inspo.colors && (
                          <p className="text-xs mb-1">🎨 {inspo.colors}</p>
                        )}
                        {book && (
                          <p className="text-xs">📚 {book.title}</p>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            {userNailInspos.length === 0 && (
              <div className="text-center py-12">
                <Palette className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>Aucune inspiration ongles</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="characters">
            <div className="space-y-4">
              {userCharacters.map(char => {
                const book = allBooks.find(b => b.id === char.book_id);
                return (
                  <Card key={char.id} className="p-6 bg-white">
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <div className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold text-white"
                             style={{ backgroundColor: accentColor }}>
                          #{char.rank}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-bold" style={{ color: 'var(--dark-text)' }}>
                            {char.character_name}
                          </h3>
                          <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                            {book?.title || 'Livre inconnu'}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            {userCharacters.length === 0 && (
              <div className="text-center py-12">
                <Heart className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>Aucun personnage préféré</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="music">
            <div className="space-y-4">
              {userBooksWithMusic.map(userBook => {
                const book = allBooks.find(b => b.id === userBook.book_id);
                const platform = userBook.music_link?.includes('youtube') || userBook.music_link?.includes('youtu.be') 
                  ? 'youtube' 
                  : userBook.music_link?.includes('spotify') 
                  ? 'spotify' 
                  : userBook.music_link?.includes('deezer')
                  ? 'deezer'
                  : 'other';
                
                const platformInfo = {
                  youtube: { icon: '🎥', color: '#FF0000', name: 'YouTube' },
                  spotify: { icon: '🎵', color: '#1DB954', name: 'Spotify' },
                  deezer: { icon: '🎶', color: '#FF6600', name: 'Deezer' },
                  other: { icon: '🔗', color: accentColor, name: 'Lien' }
                };

                const info = platformInfo[platform];

                return (
                  <Card key={userBook.id} className="p-6 bg-white">
                    <div className="flex gap-4">
                      <div className="w-20 h-28 rounded-lg overflow-hidden flex-shrink-0"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book?.cover_url && (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-start justify-between mb-2">
                          <div>
                            <h3 className="text-lg font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                              🎵 {userBook.music}
                            </h3>
                            <p className="text-sm mb-1" style={{ color: 'var(--warm-pink)' }}>
                              par {userBook.music_artist}
                            </p>
                            <p className="text-xs" style={{ color: 'var(--dark-text)' }}>
                              📚 {book?.title}
                            </p>
                          </div>
                          <a 
                            href={userBook.music_link} 
                            target="_blank" 
                            rel="noopener noreferrer"
                          >
                            <Button size="sm" variant="outline" style={{ borderColor: info.color, color: info.color }}>
                              {info.icon} Ouvrir
                            </Button>
                          </a>
                        </div>
                        <span className="text-xs px-2 py-1 rounded-full font-medium inline-block"
                              style={{ backgroundColor: info.color, color: 'white' }}>
                          {info.name}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            {userBooksWithMusic.length === 0 && (
              <div className="text-center py-12">
                <Music className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>Aucune musique associée</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Shared Readings Sheet */}
      <Sheet open={showSharedReadings} onOpenChange={setShowSharedReadings}>
        <SheetContent side="right" className="w-full sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Lectures communes avec {displayName}</SheetTitle>
          </SheetHeader>

          <Tabs value={sharedReadingTab} onValueChange={setSharedReadingTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="in_progress">En cours ({inProgressReadings.length})</TabsTrigger>
              <TabsTrigger value="upcoming">À venir ({upcomingReadings.length})</TabsTrigger>
              <TabsTrigger value="completed">Terminées ({completedReadings.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="in_progress" className="space-y-4 mt-4">
              {inProgressReadings.map(sr => {
                const book = allBooks.find(b => b.id === sr.book_id);
                return (
                  <Card key={sr.id} className="p-4 cursor-pointer hover:shadow-lg transition-all"
                        onClick={() => navigate(createPageUrl("SharedReadings"))}>
                    <div className="flex gap-3">
                      <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book?.cover_url && (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                          {sr.title}
                        </h3>
                        <p className="text-sm mb-2" style={{ color: 'var(--warm-pink)' }}>
                          {book?.title}
                        </p>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={(e) => {
                            e.stopPropagation();
                            navigate(createPageUrl("Chat"));
                          }}>
                            <MessageCircle className="w-3 h-3 mr-1" />
                            Chat
                          </Button>
                        </div>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {inProgressReadings.length === 0 && (
                <p className="text-center py-8" style={{ color: 'var(--warm-pink)' }}>
                  Aucune lecture en cours
                </p>
              )}
            </TabsContent>

            <TabsContent value="upcoming" className="space-y-4 mt-4">
              {upcomingReadings.map(sr => {
                const book = allBooks.find(b => b.id === sr.book_id);
                return (
                  <Card key={sr.id} className="p-4 cursor-pointer hover:shadow-lg transition-all"
                        onClick={() => navigate(createPageUrl("SharedReadings"))}>
                    <div className="flex gap-3">
                      <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book?.cover_url && (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                          {sr.title}
                        </h3>
                        <p className="text-sm mb-2" style={{ color: 'var(--warm-pink)' }}>
                          {book?.title}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {upcomingReadings.length === 0 && (
                <p className="text-center py-8" style={{ color: 'var(--warm-pink)' }}>
                  Aucune lecture à venir
                </p>
              )}
            </TabsContent>

            <TabsContent value="completed" className="space-y-4 mt-4">
              {completedReadings.map(sr => {
                const book = allBooks.find(b => b.id === sr.book_id);
                return (
                  <Card key={sr.id} className="p-4 cursor-pointer hover:shadow-lg transition-all"
                        onClick={() => navigate(createPageUrl("SharedReadings"))}>
                    <div className="flex gap-3">
                      <div className="w-16 h-24 rounded-lg overflow-hidden flex-shrink-0"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book?.cover_url && (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                          {sr.title}
                        </h3>
                        <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                          {book?.title}
                        </p>
                      </div>
                    </div>
                  </Card>
                );
              })}
              {completedReadings.length === 0 && (
                <p className="text-center py-8" style={{ color: 'var(--warm-pink)' }}>
                  Aucune lecture terminée
                </p>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>
    </div>
  );
}
