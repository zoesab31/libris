
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
            <h1 className="text-3xl md:text-4xl font-bold mb-2" style={{ color: 'var(--deep-brown)' }}>
              Bonjour {user?.full_name?.split(' ')[0] || 'Lectrice'} 📚
            </h1>
            <p className="text-lg" style={{ color: 'var(--warm-brown)' }}>
              Bienvenue dans votre univers littéraire
            </p>
          </div>
          <Link to={createPageUrl("MyLibrary")}>
            <Button className="shadow-lg text-white font-medium px-6 py-6 rounded-xl transition-all hover:shadow-xl"
                    style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}>
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
            gradient="linear-gradient(135deg, #8B6F47, #C4A484)"
          />
          <StatsCard 
            title="Pages lues" 
            value={totalPages.toLocaleString()}
            icon={TrendingUp}
            gradient="linear-gradient(135deg, #C4A484, #E6C7B8)"
          />
          <StatsCard 
            title="Lectures communes" 
            value={sharedReadings.length}
            icon={Users}
            gradient="linear-gradient(135deg, #E6C7B8, #D4AF37)"
          />
          <StatsCard 
            title="Note moyenne" 
            value={avgRating}
            icon={Star}
            gradient="linear-gradient(135deg, #D4AF37, #C4A484)"
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
            />
            <RecentActivity 
              comments={comments}
              allBooks={allBooks}
            />
          </div>

          <div className="space-y-6">
            <Card className="shadow-lg border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
              <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--warm-brown), var(--gold))' }} />
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: 'var(--deep-brown)' }}>
                  <Music className="w-5 h-5" />
                  Ma Playlist Littéraire
                </CardTitle>
              </CardHeader>
              <CardContent>
                {myBooks.filter(b => b.music).slice(0, 3).length > 0 ? (
                  <div className="space-y-3">
                    {myBooks.filter(b => b.music).slice(0, 3).map((userBook) => {
                      const book = allBooks.find(b => b.id === userBook.book_id);
                      return (
                        <div key={userBook.id} className="p-3 rounded-lg" style={{ backgroundColor: 'var(--cream)' }}>
                          <p className="font-medium text-sm mb-1" style={{ color: 'var(--deep-brown)' }}>
                            {book?.title}
                          </p>
                          <p className="text-xs flex items-center gap-1" style={{ color: 'var(--warm-brown)' }}>
                            🎵 {userBook.music} - {userBook.music_artist}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--warm-brown)' }}>
                    Associez des musiques à vos livres pour créer votre playlist
                  </p>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-lg border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
              <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--rose-gold), var(--soft-brown))' }} />
              <CardHeader>
                <CardTitle className="flex items-center gap-2" style={{ color: 'var(--deep-brown)' }}>
                  <Heart className="w-5 h-5" />
                  Accès rapide
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Link to={createPageUrl("SharedReadings")}>
                  <Button variant="outline" className="w-full justify-start" style={{ borderColor: 'var(--beige)' }}>
                    <Users className="w-4 h-4 mr-2" />
                    Lectures communes
                  </Button>
                </Link>
                <Link to={createPageUrl("Profile")}>
                  <Button variant="outline" className="w-full justify-start" style={{ borderColor: 'var(--beige)' }}>
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
