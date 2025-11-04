import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, MessageCircle, Users, BookOpen, Quote, Image, Palette, Heart, AlertCircle } from "lucide-react";
import { createPageUrl } from "@/utils";

export default function UserProfile() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState("library");
  
  // Get userEmail from URL query params
  const urlParams = new URLSearchParams(window.location.search);
  const userEmail = urlParams.get('userEmail');

  useEffect(() => {
    base44.auth.me().then(setCurrentUser).catch(() => {});
  }, []);

  // Redirect to own profile if no email provided or if it's current user's email
  useEffect(() => {
    if (!userEmail || (currentUser && userEmail === currentUser.email)) {
      navigate(createPageUrl("Profile"));
    }
  }, [userEmail, currentUser, navigate]);

  const { data: allUsers = [], isLoading: loadingUser } = useQuery({
    queryKey: ['allUsers'],
    queryFn: async () => {
      return base44.entities.User.list();
    },
  });

  const profileUser = allUsers.find(u => u.email === userEmail);

  const { data: userBooks = [] } = useQuery({
    queryKey: ['userBooks', userEmail],
    queryFn: () => base44.entities.UserBook.filter({ created_by: userEmail }),
    enabled: !!userEmail,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
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

  const { data: userCharacters = [] } = useQuery({
    queryKey: ['userCharacters', userEmail],
    queryFn: () => base44.entities.BookBoyfriend.filter({ created_by: userEmail }, 'rank'),
    enabled: !!userEmail && activeTab === 'characters',
  });

  const { data: isFriend } = useQuery({
    queryKey: ['isFriend', userEmail],
    queryFn: async () => {
      const friendships = await base44.entities.Friendship.filter({
        created_by: currentUser?.email,
        friend_email: userEmail,
        status: "Acceptée"
      });
      return friendships.length > 0;
    },
    enabled: !!currentUser && !!userEmail && currentUser?.email !== userEmail,
  });

  const readBooks = userBooks.filter(b => b.status === "Lu");
  const totalPages = readBooks.reduce((sum, ub) => {
    const book = allBooks.find(b => b.id === ub.book_id);
    return sum + (book?.page_count || 0);
  }, 0);

  const handleChat = () => {
    navigate(createPageUrl("Chat"));
  };

  if (loadingUser) {
    return (
      <div className="p-8 text-center" style={{ backgroundColor: 'var(--cream)', minHeight: '100vh' }}>
        <div className="flex flex-col items-center justify-center gap-4 py-20">
          <div className="w-16 h-16 rounded-full border-4 border-t-pink-500 animate-spin" 
               style={{ borderColor: 'var(--beige)', borderTopColor: 'var(--deep-pink)' }} />
          <p className="text-lg font-medium" style={{ color: 'var(--warm-pink)' }}>
            Chargement du profil...
          </p>
        </div>
      </div>
    );
  }

  if (!profileUser) {
    return (
      <div className="p-8 text-center" style={{ backgroundColor: 'var(--cream)', minHeight: '100vh' }}>
        <div className="max-w-md mx-auto py-20">
          <AlertCircle className="w-20 h-20 mx-auto mb-6" style={{ color: 'var(--warm-pink)' }} />
          <h2 className="text-2xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
            Profil introuvable
          </h2>
          <p className="mb-6" style={{ color: 'var(--warm-pink)' }}>
            Cet utilisateur n'existe pas ou n'est pas accessible
          </p>
          <Button
            onClick={() => navigate(createPageUrl("Friends"))}
            className="text-white font-medium"
            style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour à mes amies
          </Button>
        </div>
      </div>
    );
  }

  const isOwnProfile = currentUser?.email === userEmail;
  // Rose pour son profil, VIOLET pour les amis
  const accentColor = isOwnProfile ? 'var(--deep-pink)' : '#8B5CF6';
  const secondaryColor = isOwnProfile ? 'var(--warm-pink)' : '#A78BFA';

  return (
    <div className="min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      {/* Header with banner */}
      <div className="relative h-48" style={{ background: `linear-gradient(135deg, ${accentColor}, ${secondaryColor})` }}>
        <div className="absolute top-4 left-4">
          <Button variant="ghost" onClick={() => navigate(-1)} className="text-white hover:bg-white/20">
            <ArrowLeft className="w-5 h-5 mr-2" />
            Retour
          </Button>
        </div>
      </div>

      {/* Profile info */}
      <div className="max-w-6xl mx-auto px-4 md:px-8 -mt-20">
        <div className="flex flex-col md:flex-row gap-6 items-start md:items-end mb-8">
          <div className="w-40 h-40 rounded-full overflow-hidden shadow-2xl border-4 border-white bg-white">
            {profileUser.profile_picture ? (
              <img src={profileUser.profile_picture} alt={profileUser.full_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-6xl font-bold text-white"
                   style={{ backgroundColor: accentColor }}>
                {profileUser.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>

          <div className="flex-1">
            <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              {profileUser.display_name || profileUser.full_name || 'Lectrice'}
            </h1>
            <p className="text-lg mb-4" style={{ color: 'var(--warm-pink)' }}>
              {profileUser.email}
            </p>

            {!isOwnProfile && (
              <div className="flex gap-3">
                <Button
                  onClick={handleChat}
                  className="text-white font-medium"
                  style={{ backgroundColor: accentColor }}
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Chat
                </Button>
                {isFriend && (
                  <Button variant="outline" style={{ borderColor: accentColor, color: accentColor }}>
                    <Users className="w-4 h-4 mr-2" />
                    Amie
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Stats */}
          <div className="flex gap-6">
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
          <TabsList className="bg-white shadow-sm p-1 rounded-xl border-0 mb-8">
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
              value="characters" 
              className="rounded-lg font-bold"
              style={activeTab === "characters" ? { backgroundColor: accentColor, color: '#FFFFFF' } : { color: '#000000' }}
            >
              <Heart className="w-4 h-4 mr-2" />
              Personnages
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library">
            <div className="grid md:grid-cols-4 gap-4">
              {userBooks.map(ub => {
                const book = allBooks.find(b => b.id === ub.book_id);
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
                      <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                        <p className="text-white text-xs font-bold line-clamp-2">{book.title}</p>
                        <span className="text-xs px-2 py-1 rounded-full mt-1 inline-block"
                              style={{ backgroundColor: accentColor, color: 'white' }}>
                          {ub.status}
                        </span>
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
            {userBooks.length === 0 && (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>Aucun livre dans la bibliothèque</p>
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
        </Tabs>
      </div>
    </div>
  );
}