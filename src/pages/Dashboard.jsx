
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, TrendingUp, Users, Star, Plus, Music, Heart } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import StatsCard from "../components/dashboard/StatsCard";
import RecentActivity from "../components/dashboard/RecentActivity";
import CurrentlyReading from "../components/dashboard/CurrentlyReading";
import ReadingGoalCard from "../components/dashboard/ReadingGoalCard";

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const currentYear = new Date().getFullYear();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [], isLoading: loadingBooks } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['recentComments'],
    queryFn: () => base44.entities.ReadingComment.list('-created_date', 5),
  });

  const { data: readingGoal } = useQuery({
    queryKey: ['readingGoal', currentYear],
    queryFn: async () => {
      const goals = await base44.entities.ReadingGoal.filter({ 
        created_by: user?.email,
        year: currentYear 
      });
      return goals[0] || null;
    },
    enabled: !!user,
  });

  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ created_by: user?.email, status: "Acceptée" }),
    enabled: !!user,
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
  });

  const currentlyReading = myBooks.filter(b => b.status === "En cours");
  const readBooks = myBooks.filter(b => b.status === "Lu");
  
  const booksReadThisYear = readBooks.filter(b => {
    if (!b.end_date) return false;
    const endYear = new Date(b.end_date).getFullYear();
    return endYear === currentYear;
  }).length;

  const totalPages = readBooks.reduce((sum, userBook) => {
    const book = allBooks.find(b => b.id === userBook.book_id);
    return sum + (book?.page_count || 0);
  }, 0);
  const sharedReadings = myBooks.filter(b => b.is_shared_reading);
  const avgRating = readBooks.length > 0 
    ? (readBooks.reduce((sum, b) => sum + (b.rating || 0), 0) / readBooks.filter(b => b.rating).length).toFixed(1)
    : 0;

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              Bonjour {user?.full_name?.split(' ')[0] || 'Lectrice'} 📚
            </h1>
            <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
              Bienvenue dans votre univers littéraire
            </p>
          </div>
          <Link to={createPageUrl("MyLibrary")}>
            <Button className="shadow-lg text-white font-medium px-6 py-6 rounded-xl transition-all hover:shadow-xl"
                    style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--soft-pink))' }}>
              <Plus className="w-5 h-5 mr-2" />
              Ajouter un livre
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatsCard 
            title="Livres lus" 
            value={readBooks.length}
            icon={BookOpen}
            gradient="linear-gradient(135deg, #FF8FAB, #FFB6C8)"
          />
          <StatsCard 
            title="Pages lues" 
            value={totalPages.toLocaleString()}
            icon={TrendingUp}
            gradient="linear-gradient(135deg, #FFB6C8, #F4C2C2)"
          />
          <StatsCard 
            title="Lectures communes" 
            value={sharedReadings.length}
            icon={Users}
            gradient="linear-gradient(135deg, #F4C2C2, #FFD700)"
          />
          <StatsCard 
            title="Note moyenne" 
            value={avgRating}
            icon={Star}
            gradient="linear-gradient(135deg, #FFD700, #FFB6C8)"
          />
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <ReadingGoalCard 
              currentGoal={readingGoal}
              booksReadThisYear={booksReadThisYear}
              year={currentYear}
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
              comments={comments}
              allBooks={allBooks}
            />
          </div>

          <div className="space-y-6">
            <Card className="shadow-lg border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
              <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--deep-pink), var(--gold))' }} />
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                  <Music className="w-5 h-5" />
                  Ma Playlist Littéraire 🎵
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myBooks.filter(b => b.music).slice(0, 3).length > 0 ? (
                  <div className="space-y-3">
                    {myBooks.filter(b => b.music).slice(0, 3).map((userBook) => {
                      const book = allBooks.find(b => b.id === userBook.book_id);
                      
                      // Extract video ID from YouTube link if present
                      let youtubeId = null;
                      if (userBook.music_link) {
                        const match = userBook.music_link.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
                        if (match) youtubeId = match[1];
                      }
                      
                      return (
                        <div key={userBook.id} 
                             className="group relative p-4 rounded-xl transition-all hover:shadow-md"
                             style={{ 
                               background: 'linear-gradient(135deg, var(--soft-pink), var(--beige))',
                             }}>
                          <div className="flex items-center gap-3">
                            <div className="w-14 h-14 rounded-full flex items-center justify-center shadow-md animate-pulse"
                                 style={{ backgroundColor: 'var(--deep-pink)' }}>
                              <Music className="w-7 h-7 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm mb-1 line-clamp-1" style={{ color: 'var(--dark-text)' }}>
                                🎵 {userBook.music}
                              </p>
                              <p className="text-xs font-medium mb-1" style={{ color: 'var(--warm-pink)' }}>
                                par {userBook.music_artist}
                              </p>
                              <p className="text-xs line-clamp-1" style={{ color: 'var(--dark-text)' }}>
                                📚 {book?.title}
                              </p>
                              {userBook.music_link && (
                                <a 
                                  href={userBook.music_link} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-xs underline mt-1 block"
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
                    <Music className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                      Associez des musiques à vos livres pour créer votre playlist
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
              <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--rose-gold), var(--soft-pink))' }} />
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: 'var(--deep-brown)' }}>
                  <Heart className="w-5 h-5" />
                  Accès rapide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to={createPageUrl("Friends")}>
                  <Button variant="outline" className="w-full justify-start font-medium" style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                    <Users className="w-4 h-4 mr-2" />
                    Gérer mes amies
                  </Button>
                </Link>
                <Link to={createPageUrl("SharedReadings")}>
                  <Button variant="outline" className="w-full justify-start font-medium" style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                    <Users className="w-4 h-4 mr-2" />
                    Lectures communes
                  </Button>
                </Link>
                <Link to={createPageUrl("Profile")}>
                  <Button variant="outline" className="w-full justify-start font-medium" style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                    <Heart className="w-4 h-4 mr-2" />
                    Mes Book Boyfriends
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
