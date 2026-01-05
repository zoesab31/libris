import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { BookOpen, Heart, TrendingUp, Award, Star, Calendar, Globe, Music, Sparkles } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

export default function YearRecap() {
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: allQuotes = [] } = useQuery({
    queryKey: ['allQuotes'],
    queryFn: () => base44.entities.Quote.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: bingoChallenges = [] } = useQuery({
    queryKey: ['bingoChallenges', selectedYear],
    queryFn: () => base44.entities.BingoChallenge.filter({ 
      created_by: user?.email,
      year: selectedYear 
    }),
    enabled: !!user,
  });

  const { data: bookOfYear = [] } = useQuery({
    queryKey: ['bookOfYear', selectedYear],
    queryFn: () => base44.entities.BookOfTheYear.filter({ 
      created_by: user?.email,
      year: selectedYear 
    }),
    enabled: !!user,
  });

  // Helper functions
  const abandonedBookCounts = (userBook) => {
    if (userBook.status !== "Abandonné") return false;
    if (userBook.abandon_percentage && userBook.abandon_percentage >= 50) return true;
    if (userBook.abandon_page) {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (book && book.page_count && userBook.abandon_page >= book.page_count / 2) {
        return true;
      }
    }
    return false;
  };

  const getEffectiveDate = (userBook) => {
    if (userBook.status === "Lu" && userBook.end_date) return userBook.end_date;
    if (userBook.status === "Abandonné" && abandonedBookCounts(userBook)) {
      return userBook.end_date || userBook.updated_date;
    }
    return null;
  };

  // Calculate statistics
  const yearBooks = myBooks.filter(b => {
    const effectiveDate = getEffectiveDate(b);
    if (!effectiveDate) return false;
    return new Date(effectiveDate).getFullYear() === selectedYear;
  });

  const totalBooksRead = yearBooks.length;
  const totalPages = yearBooks.reduce((sum, userBook) => {
    const book = allBooks.find(b => b.id === userBook.book_id);
    if (!book || userBook.status !== "Lu") return sum;
    return sum + (book.page_count || 0);
  }, 0);

  const avgRating = yearBooks.filter(b => b.rating).length > 0
    ? yearBooks.reduce((sum, b) => sum + (b.rating || 0), 0) / yearBooks.filter(b => b.rating).length
    : 0;

  const genreCount = yearBooks.reduce((acc, userBook) => {
    const book = allBooks.find(b => b.id === userBook.book_id);
    if (book?.genre) {
      acc[book.genre] = (acc[book.genre] || 0) + 1;
    }
    return acc;
  }, {});

  const topGenre = Object.entries(genreCount).sort((a, b) => b[1] - a[1])[0];

  const languageCount = yearBooks.reduce((acc, userBook) => {
    const book = allBooks.find(b => b.id === userBook.book_id);
    if (book?.language) {
      acc[book.language] = (acc[book.language] || 0) + 1;
    }
    return acc;
  }, {});

  const topLanguage = Object.entries(languageCount).sort((a, b) => b[1] - a[1])[0];

  const bestBook = bookOfYear.find(b => !b.is_worst && !b.month);
  const worstBook = bookOfYear.find(b => b.is_worst && !b.month);
  const bestBookData = bestBook ? allBooks.find(b => b.id === bestBook.book_id) : null;
  const worstBookData = worstBook ? allBooks.find(b => b.id === worstBook.book_id) : null;

  const bingoCompleted = bingoChallenges.filter(c => c.is_completed).length;
  const bingoTotal = bingoChallenges.length;

  const quotesThisYear = allQuotes.filter(q => {
    const book = yearBooks.find(yb => allBooks.find(b => b.id === yb.book_id)?.id === q.book_id);
    return !!book;
  }).length;

  const musicCount = yearBooks.reduce((sum, userBook) => {
    if (userBook.music_playlist?.length) {
      return sum + userBook.music_playlist.length;
    }
    return sum;
  }, 0);

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(to bottom, #1a1a2e 0%, #16213e 50%, #0f3460 100%)' }}>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white drop-shadow-lg">
            ✨ Récap {selectedYear}
          </h1>
          <p className="text-xl text-purple-200 mb-6">
            Ton année de lecture en un coup d'œil
          </p>
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className="px-6 py-3 rounded-2xl font-bold text-lg bg-white shadow-lg"
            style={{ color: '#9C27B0' }}
          >
            {years.map(year => (
              <option key={year} value={year}>📅 {year}</option>
            ))}
          </select>
        </div>

        {/* Main Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-purple-500 to-purple-700 border-0 shadow-2xl">
            <CardContent className="p-8 text-center text-white">
              <BookOpen className="w-16 h-16 mx-auto mb-4 opacity-90" />
              <p className="text-6xl font-bold mb-2">{totalBooksRead}</p>
              <p className="text-xl opacity-90">Livres lus</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-pink-500 to-pink-700 border-0 shadow-2xl">
            <CardContent className="p-8 text-center text-white">
              <TrendingUp className="w-16 h-16 mx-auto mb-4 opacity-90" />
              <p className="text-6xl font-bold mb-2">{totalPages.toLocaleString()}</p>
              <p className="text-xl opacity-90">Pages dévorées</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-500 to-yellow-700 border-0 shadow-2xl">
            <CardContent className="p-8 text-center text-white">
              <Star className="w-16 h-16 mx-auto mb-4 opacity-90" />
              <p className="text-6xl font-bold mb-2">{avgRating.toFixed(1)}</p>
              <p className="text-xl opacity-90">Note moyenne</p>
            </CardContent>
          </Card>
        </div>

        {/* Genre & Language */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-white border-0 shadow-2xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#9C27B0' }}>
                📚 Genre préféré
              </h2>
              {topGenre ? (
                <div>
                  <p className="text-4xl font-bold mb-2" style={{ color: '#2D3748' }}>
                    {topGenre[0]}
                  </p>
                  <p className="text-xl text-gray-600">
                    {topGenre[1]} livre{topGenre[1] > 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">Aucun genre enregistré</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-2xl">
            <CardContent className="p-8">
              <h2 className="text-2xl font-bold mb-4" style={{ color: '#9C27B0' }}>
                <Globe className="inline w-6 h-6 mr-2" />
                Langue favorite
              </h2>
              {topLanguage ? (
                <div>
                  <p className="text-4xl font-bold mb-2" style={{ color: '#2D3748' }}>
                    {topLanguage[0]}
                  </p>
                  <p className="text-xl text-gray-600">
                    {topLanguage[1]} livre{topLanguage[1] > 1 ? 's' : ''}
                  </p>
                </div>
              ) : (
                <p className="text-gray-500">Aucune langue enregistrée</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Best & Worst Books */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-green-400 to-green-600 border-0 shadow-2xl">
            <CardContent className="p-8 text-white">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Award className="w-8 h-8" />
                Meilleur livre
              </h2>
              {bestBookData ? (
                <div className="flex gap-4">
                  <div className="w-20 h-28 rounded-lg overflow-hidden shadow-lg flex-shrink-0 bg-white">
                    {bestBookData.cover_url && (
                      <img src={bestBookData.cover_url} alt={bestBookData.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-lg mb-1">{bestBookData.title}</p>
                    <p className="opacity-90">{bestBookData.author}</p>
                  </div>
                </div>
              ) : (
                <p className="opacity-80">Aucun livre sélectionné</p>
              )}
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-red-400 to-red-600 border-0 shadow-2xl">
            <CardContent className="p-8 text-white">
              <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
                <Award className="w-8 h-8" />
                Pire livre
              </h2>
              {worstBookData ? (
                <div className="flex gap-4">
                  <div className="w-20 h-28 rounded-lg overflow-hidden shadow-lg flex-shrink-0 bg-white">
                    {worstBookData.cover_url && (
                      <img src={worstBookData.cover_url} alt={worstBookData.title} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <p className="font-bold text-lg mb-1">{worstBookData.title}</p>
                    <p className="opacity-90">{worstBookData.author}</p>
                  </div>
                </div>
              ) : (
                <p className="opacity-80">Aucun livre sélectionné</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Stats */}
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-white border-0 shadow-2xl">
            <CardContent className="p-6 text-center">
              <Sparkles className="w-12 h-12 mx-auto mb-3" style={{ color: '#FFD700' }} />
              <p className="text-3xl font-bold mb-1" style={{ color: '#2D3748' }}>
                {bingoCompleted}/{bingoTotal}
              </p>
              <p className="text-gray-600">Défis Bingo réussis</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-2xl">
            <CardContent className="p-6 text-center">
              <Heart className="w-12 h-12 mx-auto mb-3" style={{ color: '#E91E63' }} />
              <p className="text-3xl font-bold mb-1" style={{ color: '#2D3748' }}>
                {quotesThisYear}
              </p>
              <p className="text-gray-600">Citations enregistrées</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-0 shadow-2xl">
            <CardContent className="p-6 text-center">
              <Music className="w-12 h-12 mx-auto mb-3" style={{ color: '#9C27B0' }} />
              <p className="text-3xl font-bold mb-1" style={{ color: '#2D3748' }}>
                {musicCount}
              </p>
              <p className="text-gray-600">Musiques associées</p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}