
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, TrendingUp, Users, Star, Plus, Music, Heart, MessageCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatsCard from "../components/dashboard/StatsCard";
import RecentActivity from "../components/dashboard/RecentActivity";
import CurrentlyReading from "../components/dashboard/CurrentlyReading";
import ReadingGoalCard from "../components/dashboard/ReadingGoalCard";
import YearSelector from "../components/dashboard/YearSelector";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const navigate = useNavigate();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [], isLoading: loadingBooks } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
    staleTime: 5 * 60 * 1000, // 5 minutes
    cacheTime: 10 * 60 * 1000, // 10 minutes
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
    staleTime: 10 * 60 * 1000, // 10 minutes
    cacheTime: 15 * 60 * 1000, // 15 minutes
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['recentComments'],
    queryFn: () => base44.entities.ReadingComment.list('-created_date', 5),
    staleTime: 2 * 60 * 1000, // 2 minutes
    cacheTime: 5 * 60 * 1000, // 5 minutes
  });

  const { data: readingGoal } = useQuery({
    queryKey: ['readingGoal', selectedYear],
    queryFn: async () => {
      const goals = await base44.entities.ReadingGoal.filter({ 
        created_by: user?.email,
        year: selectedYear 
      });
      return goals[0] || null;
    },
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ created_by: user?.email, status: "Acceptée" }),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const { data: friendsBooks = [] } = useQuery({
    queryKey: ['friendsBooks'],
    queryFn: async () => {
      const friendsEmails = myFriends.map(f => f.friend_email);
      if (friendsEmails.length === 0) return [];
      
      const allFriendsBooks = await Promise.all(
        friendsEmails.map(email => 
          base44.entities.UserBook.filter({ created_by: email, status: "En cours" })
        )
      );
      
      return allFriendsBooks.flat();
    },
    enabled: myFriends.length > 0,
    staleTime: 3 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });

  const { data: friendsFinishedBooks = [] } = useQuery({
    queryKey: ['friendsFinishedBooks'],
    queryFn: async () => {
      const friendsEmails = myFriends.map(f => f.friend_email);
      if (friendsEmails.length === 0) return [];
      
      const allFriendsFinishedBooks = await Promise.all(
        friendsEmails.map(email => 
          base44.entities.UserBook.filter({ created_by: email, status: "Lu" }, '-updated_date', 10)
        )
      );
      
      return allFriendsFinishedBooks.flat()
        .sort((a, b) => new Date(b.updated_date) - new Date(a.updated_date))
        .slice(0, 10);
    },
    enabled: myFriends.length > 0,
    staleTime: 3 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });

  const { data: friendsComments = [] } = useQuery({
    queryKey: ['friendsComments'],
    queryFn: async () => {
      const friendsEmails = myFriends.map(f => f.friend_email);
      if (friendsEmails.length === 0) return [];
      
      const allCommentsPromises = friendsEmails.map(email =>
        base44.entities.ReadingComment.filter({ created_by: email }, '-created_date', 3)
      );
      
      const allComments = await Promise.all(allCommentsPromises);
      return allComments.flat().sort((a, b) => 
        new Date(b.created_date) - new Date(a.created_date)
      ).slice(0, 5);
    },
    enabled: myFriends.length > 0,
    staleTime: 2 * 60 * 1000,
    cacheTime: 5 * 60 * 1000,
  });

  const { data: allSharedReadings = [] } = useQuery({
    queryKey: ['sharedReadings'],
    queryFn: () => base44.entities.SharedReading.filter({ created_by: user?.email }),
    enabled: !!user,
    staleTime: 3 * 60 * 1000,
    cacheTime: 10 * 60 * 1000,
  });

  const currentlyReading = myBooks.filter(b => b.status === "En cours");
  const readBooks = myBooks.filter(b => b.status === "Lu");
  
  // Year-scoped: Books read in selected year (based on end_date)
  const booksReadThisYear = readBooks.filter(b => {
    if (!b.end_date) return false;
    const endYear = new Date(b.end_date).getFullYear();
    return endYear === selectedYear;
  }).length;

  // Year-scoped: Total pages read in selected year
  const totalPagesThisYear = readBooks
    .filter(b => {
      if (!b.end_date) return false;
      const endYear = new Date(b.end_date).getFullYear();
      return endYear === selectedYear;
    })
    .reduce((sum, userBook) => {
      const book = allBooks.find(b => b.id === userBook.book_id);
      return sum + (book?.page_count || 0);
    }, 0);

  // Year-scoped: Shared readings active in selected year
  const sharedReadingsThisYear = allSharedReadings.filter(sr => {
    if (!sr.start_date) return false;
    const startYear = new Date(sr.start_date).getFullYear();
    const endYear = sr.end_date ? new Date(sr.end_date).getFullYear() : startYear;
    return startYear <= selectedYear && selectedYear <= endYear;
  }).length;

  // Year-scoped: Books "À lire" added in selected year (fallback to global if no created_date)
  const toReadThisYear = myBooks.filter(b => {
    if (b.status !== "À lire") return false;
    
    // If we have created_date, filter by year
    if (b.created_date) {
      const createdYear = new Date(b.created_date).getFullYear();
      return createdYear === selectedYear;
    }
    
    // Fallback: show all "À lire" if no date available or no specific created_date
    return true;
  }).length;

  // Calculate average rating: filter for books that have a rating (not null/undefined)
  // then sum their ratings and divide by the count of such books.
  const ratedBooks = readBooks.filter(b => b.rating !== undefined && b.rating !== null);
  const avgRating = ratedBooks.length > 0 
    ? (ratedBooks.reduce((sum, b) => sum + b.rating, 0) / ratedBooks.length).toFixed(1)
    : 0;

  // Combine my comments and friends comments
  const allRecentComments = [...comments, ...friendsComments]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 8);

  return (
    <div className="p-3 md:p-4 lg:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col gap-3 md:gap-4 mb-6 md:mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-1 md:mb-2" style={{ color: 'var(--dark-text)' }}>
              Bonjour {user?.display_name || user?.full_name?.split(' ')[0] || 'Lectrice'} 📚
            </h1>
            <p className="text-base md:text-lg" style={{ color: 'var(--warm-pink)' }}>
              Bienvenue dans votre univers littéraire
            </p>
          </div>
          <Link to={createPageUrl("MyLibrary")} className="w-full md:w-auto">
            <Button className="w-full md:w-auto shadow-lg text-white font-medium px-4 md:px-6 py-4 md:py-6 rounded-xl transition-all hover:shadow-xl text-sm md:text-base"
                    style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--soft-pink))' }}>
              <Plus className="w-4 h-4 md:w-5 md:h-5 mr-2" />
              Ajouter un livre
            </Button>
          </Link>
        </div>

        {/* Year Selector */}
        <div className="mb-6 md:mb-8">
          <YearSelector currentYear={selectedYear} onYearChange={setSelectedYear} />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 lg:gap-6 mb-6 md:mb-8">
          <StatsCard 
            title="Livres lus" 
            value={booksReadThisYear}
            icon={BookOpen}
            gradient="linear-gradient(135deg, #FF8FAB, #FFB6C8)"
          />
          <StatsCard 
            title="Pages lues" 
            value={totalPagesThisYear.toLocaleString()}
            icon={TrendingUp}
            gradient="linear-gradient(135deg, #FFB6C8, #F4C2C2)"
          />
          <StatsCard 
            title="Lectures communes" 
            value={sharedReadingsThisYear}
            icon={Users}
            gradient="linear-gradient(135deg, #F4C2C2, #FFD700)"
          />
          <StatsCard 
            title="À lire" 
            value={toReadThisYear}
            icon={Star}
            gradient="linear-gradient(135deg, #FFD700, #FFB6C8)"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-4 md:gap-6">
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            <ReadingGoalCard 
              currentGoal={readingGoal}
              booksReadThisYear={booksReadThisYear}
              year={selectedYear}
              user={user}
            />
            
            <CurrentlyReading 
              books={currentlyReading} 
              allBooks={allBooks}
              isLoading={loadingBooks}
              user={user}
              friendsBooks={friendsBooks}
              myFriends={myFriends}
            />
            
            <RecentActivity 
              comments={allRecentComments}
              allBooks={allBooks}
              myFriends={myFriends}
            />

            {/* Friends' finished books */}
            {friendsFinishedBooks.length > 0 && (
              <Card className="shadow-lg border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
                <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--soft-pink), var(--lavender))' }} />
                <CardHeader className="p-4 md:p-6">
                  <CardTitle className="flex items-center gap-2 text-base md:text-xl" style={{ color: 'var(--dark-text)' }}>
                    <Users className="w-5 h-5 md:w-6 md:h-6" />
                    Livres terminés par mes amies
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <div className="space-y-3">
                    {friendsFinishedBooks.map((userBook) => {
                      const book = allBooks.find(b => b.id === userBook.book_id);
                      const friend = myFriends.find(f => f.friend_email === userBook.created_by);
                      if (!book || !friend) return null;

                      return (
                        <div
                          key={userBook.id}
                          className="flex gap-3 md:gap-4 p-3 md:p-4 rounded-xl transition-all hover:shadow-md"
                          style={{ backgroundColor: 'var(--cream)' }}
                        >
                          <div className="w-12 h-16 md:w-16 md:h-24 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                               style={{ backgroundColor: 'var(--beige)' }}>
                            {book.cover_url ? (
                              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center">
                                <BookOpen className="w-6 h-6 md:w-8 md:h-8" style={{ color: 'var(--warm-pink)' }} />
                              </div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <div className="w-5 h-5 md:w-6 md:h-6 rounded-full flex items-center justify-center text-xs font-bold text-white"
                                   style={{ backgroundColor: 'var(--soft-pink)' }}>
                                {friend.friend_name?.[0]?.toUpperCase() || 'A'}
                              </div>
                              <p className="text-xs md:text-xs font-medium" style={{ color: 'var(--warm-pink)' }}>
                                {friend.friend_name?.split(' ')[0]} a terminé
                              </p>
                            </div>
                            <h3 className="font-bold text-xs md:text-sm mb-1 line-clamp-1" style={{ color: 'var(--dark-text)' }}>
                              {book.title}
                            </h3>
                            <p className="text-[10px] md:text-xs mb-1" style={{ color: 'var(--warm-pink)' }}>
                              {book.author}
                            </p>
                            {userBook.rating !== undefined && userBook.rating !== null && (
                              <div className="flex items-center gap-1">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <Star
                                    key={i}
                                    className="w-2.5 h-2.5 md:w-3 md:h-3"
                                    style={{
                                      fill: i < userBook.rating ? 'var(--gold)' : 'none',
                                      stroke: 'var(--gold)',
                                    }}
                                  />
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4 md:space-y-6">
            <Card className="shadow-lg border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
              <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--deep-pink), var(--gold))' }} />
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg" style={{ color: 'var(--dark-text)' }}>
                  <Music className="w-4 h-4 md:w-5 md:h-5" />
                  Ma Playlist Littéraire 🎵
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6">
                {myBooks.filter(b => b.music).slice(0, 3).length > 0 ? (
                  <div className="space-y-3">
                    {myBooks.filter(b => b.music).slice(0, 3).map((userBook) => {
                      const book = allBooks.find(b => b.id === userBook.book_id);
                      
                      let youtubeId = null;
                      if (userBook.music_link) {
                        const match = userBook.music_link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
                        if (match) youtubeId = match[1];
                      }
                      
                      return (
                        <div key={userBook.id} 
                             className="group relative p-3 md:p-4 rounded-xl transition-all hover:shadow-md"
                             style={{ 
                               background: 'linear-gradient(135deg, var(--soft-pink), var(--beige))',
                             }}>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 md:w-14 md:h-14 rounded-full flex items-center justify-center shadow-md animate-pulse"
                                 style={{ backgroundColor: 'var(--deep-pink)' }}>
                              <Music className="w-6 h-6 md:w-7 md:h-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-xs md:text-sm mb-1 line-clamp-1" style={{ color: 'var(--dark-text)' }}>
                                🎵 {userBook.music}
                              </p>
                              <p className="text-[10px] md:text-xs font-medium mb-1" style={{ color: 'var(--warm-pink)' }}>
                                par {userBook.music_artist}
                              </p>
                              <p className="text-[10px] md:text-xs line-clamp-1" style={{ color: 'var(--dark-text)' }}>
                                📚 {book?.title}
                              </p>
                              {userBook.music_link && (
                                <a 
                                  href={userBook.music_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-[10px] md:text-xs underline mt-1 block"
                                  style={{ color: 'var(--deep-pink)' }}
                                >
                                  🔗 Écouter
                                </a>
                              )}
                            </div>
                          </div>
                          
                          {youtubeId && (
                            <div className="mt-3 rounded-lg overflow-hidden">
                              <iframe 
                                width="100%" 
                                height="120" 
                                src={`https://www.youtube.com/embed/${youtubeId}`}
                                frameBorder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Music className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                    <p className="text-xs md:text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                      Associez des musiques à vos livres pour créer votre playlist
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
              <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--rose-gold), var(--soft-pink))' }} />
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg" style={{ color: 'var(--deep-brown)' }}>
                  <Heart className="w-4 h-4 md:w-5 md:h-5" />
                  Accès rapide
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-2">
                <Button
                  variant="outline"
                  className="w-full justify-start font-medium text-sm md:text-base"
                  style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}
                  onClick={() => navigate(createPageUrl("Friends"))}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Gérer mes amies
                </Button>
                <Link to={createPageUrl("SharedReadings")}>
                  <Button variant="outline" className="w-full justify-start font-medium text-sm md:text-base" style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                    <Users className="w-4 h-4 mr-2" />
                    Lectures communes
                  </Button>
                </Link>
                <Link to={createPageUrl("Profile")}>
                  <Button variant="outline" className="w-full justify-start font-medium text-sm md:text-base" style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                    <Heart className="w-4 h-4 mr-2" />
                    Mes Personnages Préférés
                  </Button>
                </Link>
                <Link to={createPageUrl("Chat")}>
                  <Button variant="outline" className="w-full justify-start font-medium text-sm md:text-base" style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Chat entre amies
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
