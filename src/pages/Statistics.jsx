import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart, BookOpen, Calendar, TrendingUp, Palette, FileText } from "lucide-react";
import { BarChart as RechartsBarChart, PieChart, Cell, ResponsiveContainer, XAxis, YAxis, Tooltip, Bar, Pie } from 'recharts';

const COLORS = ['#FF0080', '#FF1493', '#FF69B4', '#FFB6C8', '#E6B3E8', '#FFCCCB'];

export default function Statistics() {
  const [user, setUser] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [viewMode, setViewMode] = useState('single'); // 'single', 'all', 'compare', 'friends'
  const [selectedYears, setSelectedYears] = useState([new Date().getFullYear()]);
  const [selectedFriend, setSelectedFriend] = useState(null);

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

  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends', user?.email],
    queryFn: () => base44.entities.Friendship.filter({ 
      created_by: user?.email, 
      status: "Acceptée" 
    }),
    enabled: !!user && viewMode === 'friends',
  });

  const { data: friendBooks = [] } = useQuery({
    queryKey: ['friendBooks', selectedFriend],
    queryFn: () => base44.entities.UserBook.filter({ created_by: selectedFriend }),
    enabled: !!selectedFriend && viewMode === 'friends',
  });

  // Helper function to check if abandoned book counts (>50%)
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

  // Get effective date for a book
  const getEffectiveDate = (userBook) => {
    if (userBook.status === "Lu" && userBook.end_date) {
      return userBook.end_date;
    }
    if (userBook.status === "Abandonné" && abandonedBookCounts(userBook)) {
      return userBook.end_date || userBook.updated_date; // Use end_date if available, otherwise updated_date for abandoned books
    }
    return null;
  };

  // Expand books with rereads as separate virtual entries
  const expandedBooks = useMemo(() => {
    const entries = [];
    myBooks.forEach(b => {
      // Main reading
      entries.push(b);
      // Rereads
      if (b.rereads && b.rereads.length > 0) {
        b.rereads.forEach(reread => {
          if (reread.end_date) {
            entries.push({ ...b, _reread: true, end_date: reread.end_date, start_date: reread.start_date });
          }
        });
      }
    });
    return entries;
  }, [myBooks]);

  const booksThisYear = useMemo(() => {
    if (viewMode === 'all') {
      return expandedBooks.filter(b => {
        const effectiveDate = getEffectiveDate(b);
        return effectiveDate !== null;
      });
    } else if (viewMode === 'compare') {
      return expandedBooks.filter(b => {
        const effectiveDate = getEffectiveDate(b);
        if (!effectiveDate) return false;
        const year = new Date(effectiveDate).getFullYear();
        return selectedYears.includes(year);
      });
    } else { // 'single' or 'friends' mode
      return expandedBooks.filter(b => {
        const effectiveDate = getEffectiveDate(b);
        if (!effectiveDate) return false;
        const year = new Date(effectiveDate).getFullYear();
        return year === selectedYear;
      });
    }
  }, [expandedBooks, selectedYear, viewMode, selectedYears, allBooks]);

  const genreStats = useMemo(() => {
    const stats = {};
    booksThisYear.forEach(userBook => {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (!book) return;

      // ONLY use custom_genres, ignore the old "genre" field
      const genres = book.custom_genres && book.custom_genres.length > 0
        ? book.custom_genres
        : ['Non classé'];

      genres.forEach(genre => {
        stats[genre] = (stats[genre] || 0) + 1;
      });
    });

    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [booksThisYear, allBooks]);

  const formatStats = useMemo(() => {
    const stats = {};
    booksThisYear.forEach(userBook => {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (!book || !book.tags) return;

      book.tags.forEach(tag => {
        stats[tag] = (stats[tag] || 0) + 1;
      });
    });

    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [booksThisYear, allBooks]);

  const languageStats = useMemo(() => {
    const stats = {};
    booksThisYear.forEach(userBook => {
      const lang = userBook.reading_language || "Français";
      stats[lang] = (stats[lang] || 0) + 1;
    });

    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [booksThisYear]);

  const totalPages = useMemo(() => {
    return booksThisYear.reduce((sum, userBook) => {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (!book) return sum;

      // Only count full pages for "Lu" books (Option A)
      if (userBook.status === "Lu") {
        return sum + (book.page_count || 0);
      }
      
      return sum;
    }, 0);
  }, [booksThisYear, allBooks]);

  const avgRating = useMemo(() => {
    const rated = booksThisYear.filter(b => b.rating && b.status === "Lu");
    if (rated.length === 0) return 0;
    const sum = rated.reduce((acc, b) => acc + b.rating, 0);
    return (sum / rated.length).toFixed(1);
  }, [booksThisYear]);

  const booksPerMonth = useMemo(() => {
    const months = Array.from({ length: 12 }, (_, i) => ({
      name: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aoû', 'Sep', 'Oct', 'Nov', 'Déc'][i],
      count: 0
    }));

    booksThisYear.forEach(userBook => {
      const effectiveDate = getEffectiveDate(userBook);
      if (!effectiveDate) return;
      const month = new Date(effectiveDate).getMonth();
      months[month].count++;
    });

    return months;
  }, [booksThisYear, allBooks]); // Add allBooks to dependencies because getEffectiveDate uses it

  // Calculate stats for friend
  const friendBooksThisYear = useMemo(() => {
    return friendBooks.filter(b => {
      const effectiveDate = getEffectiveDate(b);
      if (!effectiveDate) return false;
      const year = new Date(effectiveDate).getFullYear();
      return year === selectedYear;
    });
  }, [friendBooks, selectedYear, allBooks]);

  const friendGenreStats = useMemo(() => {
    const stats = {};
    friendBooksThisYear.forEach(userBook => {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (!book) return;

      const genres = book.custom_genres && book.custom_genres.length > 0
        ? book.custom_genres
        : ['Non classé'];

      genres.forEach(genre => {
        stats[genre] = (stats[genre] || 0) + 1;
      });
    });

    return Object.entries(stats)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [friendBooksThisYear, allBooks]);

  const friendAvgRating = useMemo(() => {
    const rated = friendBooksThisYear.filter(b => b.rating && b.status === "Lu");
    if (rated.length === 0) return 0;
    const sum = rated.reduce((acc, b) => acc + b.rating, 0);
    return (sum / rated.length).toFixed(1);
  }, [friendBooksThisYear]);

  const friendTotalPages = useMemo(() => {
    return friendBooksThisYear.reduce((sum, userBook) => {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (!book) return sum;
      if (userBook.status === "Lu") {
        return sum + (book.page_count || 0);
      }
      return sum;
    }, 0);
  }, [friendBooksThisYear, allBooks]);

  // Comparison data
  const comparisonData = useMemo(() => {
    if (viewMode !== 'friends' || !selectedFriend) return null;

    return {
      books: [
        { name: 'Vous', value: booksThisYear.length },
        { name: 'Amie', value: friendBooksThisYear.length }
      ],
      pages: [
        { name: 'Vous', value: totalPages },
        { name: 'Amie', value: friendTotalPages }
      ],
      rating: [
        { name: 'Vous', value: parseFloat(avgRating) },
        { name: 'Amie', value: parseFloat(friendAvgRating) }
      ]
    };
  }, [viewMode, selectedFriend, booksThisYear, friendBooksThisYear, totalPages, friendTotalPages, avgRating, friendAvgRating]);

  const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);

  const toggleYearSelection = (year) => {
    if (selectedYears.includes(year)) {
      setSelectedYears(selectedYears.filter(y => y !== year));
    } else {
      setSelectedYears([...selectedYears, year].sort((a, b) => b - a)); // Sort for consistent display
    }
  };

  const friendName = myFriends.find(f => f.friend_email === selectedFriend)?.friend_name || selectedFriend?.split('@')[0];

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #FFF8FC 0%, #FEF3F9 40%, #F9F0FA 70%, #F5F0FF 100%)' }}>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header pastel */}
        <div className="mb-8 p-5 md:p-7 rounded-3xl shadow-lg"
             style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,105,180,0.15)' }}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-4xl font-extrabold mb-1" style={{ color: '#2D1F3F' }}>
                📊 Statistiques {viewMode === 'single' ? selectedYear : viewMode === 'all' ? 'Globales' : viewMode === 'friends' && selectedFriend ? `vs ${friendName}` : ''}
              </h1>
              <p className="text-sm font-medium" style={{ color: '#A78BBA' }}>
                {viewMode === 'friends' && selectedFriend 
                  ? `Comparaison avec ${friendName}`
                  : `${booksThisYear.length} livre${booksThisYear.length > 1 ? 's' : ''} analysé${booksThisYear.length > 1 ? 's' : ''}`
                }
              </p>
            </div>

          {/* View Mode Selector */}
          <div className="flex gap-2 flex-wrap">
            {[
              { mode: 'single', label: 'Année' },
              { mode: 'all', label: 'Toutes' },
              { mode: 'compare', label: 'Comparer' },
              { mode: 'friends', label: '👭 Amies' },
            ].map(({ mode, label }) => (
              <Button
                key={mode}
                onClick={() => { if (mode === 'friends') { setViewMode('friends'); setSelectedYear(new Date().getFullYear()); } else setViewMode(mode); }}
                className="font-bold rounded-xl px-4 md:px-5 py-2 text-sm transition-all"
                style={viewMode === mode ? {
                  background: 'linear-gradient(135deg, #FF1493, #FF69B4)',
                  color: 'white',
                  boxShadow: '0 2px 8px rgba(255,20,147,0.3)'
                } : {
                  backgroundColor: '#F5F0FF',
                  color: '#9C27B0',
                  border: 'none'
                }}
              >
                {label}
              </Button>
            ))}
          </div>
          </div>
        </div>

        {/* Friend selector for friends mode */}
        {viewMode === 'friends' && (
          <div className="mb-6 p-4 rounded-xl bg-white shadow-lg">
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--dark-text)' }}>
              Comparer avec une amie :
            </p>
            <div className="flex flex-wrap gap-2">
              {myFriends.map(friend => (
                <button
                  key={friend.id}
                  onClick={() => setSelectedFriend(friend.friend_email)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedFriend === friend.friend_email ? 'shadow-md' : ''
                  }`}
                  style={{
                    backgroundColor: selectedFriend === friend.friend_email ? 'var(--soft-pink)' : 'var(--cream)',
                    color: selectedFriend === friend.friend_email ? 'white' : '#000000',
                    border: '2px solid',
                    borderColor: selectedFriend === friend.friend_email ? 'var(--deep-pink)' : 'var(--beige)'
                  }}
                >
                  {friend.friend_name || friend.friend_email.split('@')[0]}
                </button>
              ))}
            </div>
            {myFriends.length === 0 && (
              <p className="text-sm text-center mt-4" style={{ color: 'var(--warm-pink)' }}>
                Vous n'avez pas encore d'amies acceptées pour la comparaison.
              </p>
            )}
            {selectedFriend && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-3" style={{ color: 'var(--dark-text)' }}>
                  Année de comparaison :
                </p>
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="px-4 py-2 rounded-lg border-2 font-medium"
                  style={{ borderColor: 'var(--beige)', color: '#000000' }}
                >
                  {years.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            )}
          </div>
        )}

        {/* Year Selection for Single mode */}
        {viewMode === 'single' && (
          <div className="mb-6">
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-6 py-3 rounded-2xl font-bold shadow-lg text-lg"
              style={{ 
                backgroundColor: 'white',
                color: '#FF1493',
                border: '2px solid #FFE1F0'
              }}
            >
              {years.map(year => (
                <option key={year} value={year}>📅 {year}</option>
              ))}
            </select>
          </div>
        )}

        {/* Year Selection for Compare mode */}
        {viewMode === 'compare' && (
          <div className="mb-6 p-4 rounded-xl bg-white shadow-lg">
            <p className="text-sm font-medium mb-3" style={{ color: 'var(--dark-text)' }}>
              Sélectionnez les années à comparer :
            </p>
            <div className="flex flex-wrap gap-2">
              {years.map(year => (
                <button
                  key={year}
                  onClick={() => toggleYearSelection(year)}
                  className={`px-4 py-2 rounded-lg font-medium transition-all ${
                    selectedYears.includes(year) ? 'shadow-md' : ''
                  }`}
                  style={{
                    backgroundColor: selectedYears.includes(year) ? 'var(--soft-pink)' : 'var(--cream)',
                    color: selectedYears.includes(year) ? 'white' : '#000000',
                    border: '2px solid',
                    borderColor: selectedYears.includes(year) ? 'var(--deep-pink)' : 'var(--beige)'
                  }}
                >
                  {year}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Comparison view */}
        {viewMode === 'friends' && selectedFriend && comparisonData ? (
          <div className="space-y-6">
            {/* Comparison cards */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm" style={{ color: 'var(--warm-brown)' }}>
                    📚 Livres lus
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Vous</span>
                      <span className="text-2xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                        {comparisonData.books[0].value}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{friendName}</span>
                      <span className="text-2xl font-bold" style={{ color: 'var(--lavender)' }}>
                        {comparisonData.books[1].value}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm" style={{ color: 'var(--warm-brown)' }}>
                    📄 Pages lues
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Vous</span>
                      <span className="text-2xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                        {comparisonData.pages[0].value.toLocaleString()}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{friendName}</span>
                      <span className="text-2xl font-bold" style={{ color: 'var(--lavender)' }}>
                        {comparisonData.pages[1].value.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm" style={{ color: 'var(--warm-brown)' }}>
                    ⭐ Note moyenne
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-sm">Vous</span>
                      <span className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>
                        {comparisonData.rating[0].value}/5
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-sm">{friendName}</span>
                      <span className="text-2xl font-bold" style={{ color: 'var(--gold)' }}>
                        {comparisonData.rating[1].value}/5
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Comparison charts */}
            <div className="grid md:grid-cols-2 gap-6">
              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle style={{ color: 'var(--dark-text)' }}>Comparaison des lectures</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={comparisonData.books}>
                      <XAxis dataKey="name" stroke="var(--warm-pink)" />
                      <YAxis stroke="var(--warm-pink)" />
                      <Tooltip />
                      <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                        {comparisonData.books.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index === 0 ? '#FF69B4' : '#FFB6C8'} />
                        ))}
                      </Bar>
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-lg">
                <CardHeader>
                  <CardTitle style={{ color: 'var(--dark-text)' }}>Vos genres vs {friendName}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <p className="text-sm font-bold mb-2" style={{ color: 'var(--deep-pink)' }}>Vos genres préférés :</p>
                      <div className="flex flex-wrap gap-2">
                        {genreStats.slice(0, 5).map((genre, idx) => (
                          <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium"
                                style={{ backgroundColor: 'var(--soft-pink)', color: 'white' }}>
                            {genre.name} ({genre.value})
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-bold mt-4 mb-2" style={{ color: 'var(--lavender)' }}>Genres de {friendName} :</p>
                      <div className="flex flex-wrap gap-2">
                        {friendGenreStats.slice(0, 5).map((genre, idx) => (
                          <span key={idx} className="px-3 py-1 rounded-full text-xs font-medium"
                                style={{ backgroundColor: 'var(--lavender)', color: 'white' }}>
                            {genre.name} ({genre.value})
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : viewMode === 'friends' && !selectedFriend ? (
          <div className="text-center py-20">
            <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
              Sélectionnez une amie pour comparer vos statistiques
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-8">
              <Card className="border-0 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all rounded-2xl overflow-hidden">
                <div className="h-2" style={{ background: 'linear-gradient(90deg, #FF1493, #FF69B4)' }} />
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                         style={{ backgroundColor: '#FFE4EC' }}>
                      <BookOpen className="w-5 h-5" style={{ color: '#FF1493' }} />
                    </div>
                    <p className="text-xs md:text-sm font-bold" style={{ color: '#666' }}>Livres lus</p>
                  </div>
                  <p className="text-3xl md:text-4xl font-bold" style={{ color: '#FF1493' }}>
                    {booksThisYear.length}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all rounded-2xl overflow-hidden">
                <div className="h-2" style={{ background: 'linear-gradient(90deg, #E91E63, #F48FB1)' }} />
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                         style={{ backgroundColor: '#FCE4EC' }}>
                      <FileText className="w-5 h-5" style={{ color: '#E91E63' }} />
                    </div>
                    <p className="text-xs md:text-sm font-bold" style={{ color: '#666' }}>Pages</p>
                  </div>
                  <p className="text-3xl md:text-4xl font-bold" style={{ color: '#E91E63' }}>
                    {totalPages.toLocaleString()}
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all rounded-2xl overflow-hidden">
                <div className="h-2" style={{ background: 'linear-gradient(90deg, #FFD700, #FFA500)' }} />
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                         style={{ backgroundColor: '#FFF9E6' }}>
                      <TrendingUp className="w-5 h-5" style={{ color: '#FFD700' }} />
                    </div>
                    <p className="text-xs md:text-sm font-bold" style={{ color: '#666' }}>Note moy.</p>
                  </div>
                  <p className="text-3xl md:text-4xl font-bold" style={{ color: '#FFD700' }}>
                    {avgRating}/5
                  </p>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all rounded-2xl overflow-hidden">
                <div className="h-2" style={{ background: 'linear-gradient(90deg, #9B59B6, #E1BEE7)' }} />
                <CardContent className="p-4 md:p-6">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                         style={{ backgroundColor: '#F3E5F5' }}>
                      <Calendar className="w-5 h-5" style={{ color: '#9B59B6' }} />
                    </div>
                    <p className="text-xs md:text-sm font-bold" style={{ color: '#666' }}>Par mois</p>
                  </div>
                  <p className="text-3xl md:text-4xl font-bold" style={{ color: '#9B59B6' }}>
                    {(() => {
                      const now = new Date();
                      const currentYear = now.getFullYear();
                      const currentMonth = now.getMonth(); // 0-indexed
                      let monthsToCount;
                      if (viewMode === 'single' && selectedYear === currentYear) {
                        // Count months up to and including current month,
                        // but only include current month if at least 1 book was read in it
                        const booksThisMonth = booksThisYear.filter(b => {
                          const d = getEffectiveDate(b);
                          if (!d) return false;
                          const bd = new Date(d);
                          return bd.getFullYear() === currentYear && bd.getMonth() === currentMonth;
                        }).length;
                        monthsToCount = currentMonth + (booksThisMonth > 0 ? 1 : 0);
                        if (monthsToCount === 0) monthsToCount = 1;
                      } else {
                        monthsToCount = 12;
                      }
                      return (booksThisYear.length / monthsToCount).toFixed(1);
                    })()}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-8">
              <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden">
                <div className="h-2" style={{ background: 'linear-gradient(90deg, #FF1493, #FF69B4, #FFB6C8)' }} />
                <CardHeader className="pb-0">
                  <CardTitle className="text-xl font-bold" style={{ color: '#2D3748' }}>
                    📈 Livres par mois
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={booksPerMonth}>
                      <XAxis dataKey="name" stroke="#FF1493" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                      <YAxis stroke="#FF1493" style={{ fontSize: '12px', fontWeight: 'bold' }} />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: 'white',
                          border: '2px solid #FFE1F0',
                          borderRadius: '12px',
                          boxShadow: '0 4px 12px rgba(255, 20, 147, 0.2)'
                        }}
                      />
                      <Bar dataKey="count" fill="url(#pinkGradient)" radius={[12, 12, 0, 0]} />
                      <defs>
                        <linearGradient id="pinkGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="#FF1493" />
                          <stop offset="100%" stopColor="#FFB6C8" />
                        </linearGradient>
                      </defs>
                    </RechartsBarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden">
                <div className="h-2" style={{ background: 'linear-gradient(90deg, #FF1493, #FF69B4, #FFB6C8)' }} />
                <CardHeader className="pb-0">
                  <CardTitle className="text-xl font-bold" style={{ color: '#2D3748' }}>
                    🎭 Genres favoris
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={genreStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => {
                          // Only show label if value is 2 or more
                          if (entry.value >= 2) {
                            const percent = (entry.value / booksThisYear.length * 100).toFixed(0);
                            return `${entry.name} ${percent}%`;
                          }
                          return null;
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {genreStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => {
                          const percent = (value / booksThisYear.length * 100).toFixed(1);
                          return [`${value} livre${value > 1 ? 's' : ''} (${percent}%)`, name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card className="border-0 shadow-2xl rounded-3xl overflow-hidden">
                <div className="h-2" style={{ background: 'linear-gradient(90deg, #9B59B6, #BA68C8, #E1BEE7)' }} />
                <CardHeader className="pb-0">
                  <CardTitle className="text-xl font-bold" style={{ color: '#2D3748' }}>
                    🌍 Langues
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-6">
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={languageStats}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={(entry) => {
                          const percent = (entry.value / booksThisYear.length * 100).toFixed(0);
                          return `${entry.name} ${percent}%`;
                        }}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {languageStats.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip 
                        formatter={(value, name) => {
                          const percent = (value / booksThisYear.length * 100).toFixed(1);
                          return [`${value} livre${value > 1 ? 's' : ''} (${percent}%)`, name];
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>

            {formatStats.length > 0 && (
              <Card className="border-0 shadow-lg mb-8">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                    <Palette className="w-5 h-5" />
                    Formats préférés
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {formatStats.map((stat, idx) => (
                      <div key={idx} className="p-4 rounded-xl text-center"
                           style={{ backgroundColor: 'var(--cream)' }}>
                        <p className="text-2xl mb-2">
                          {stat.name === "Audio" && "🎧"}
                          {stat.name === "Numérique" && "📱"}
                          {stat.name === "Broché" && "📕"}
                          {stat.name === "Relié" && "📘"}
                          {stat.name === "Poche" && "📙"}
                          {stat.name === "Wattpad" && "🌟"}
                          {stat.name === "Service Press" && "📬"}
                        </p>
                        <p className="font-bold text-lg" style={{ color: 'var(--deep-pink)' }}>
                          {stat.value}
                        </p>
                        <p className="text-sm" style={{ color: 'var(--dark-text)' }}>{stat.name}</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}