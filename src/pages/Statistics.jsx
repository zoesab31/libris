
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
  const [viewMode, setViewMode] = useState('single'); // 'single', 'all', 'compare'
  const [selectedYears, setSelectedYears] = useState([new Date().getFullYear()]); // Initialize with current year

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

  const booksThisYear = useMemo(() => {
    if (viewMode === 'all') {
      return myBooks.filter(b => {
        const effectiveDate = getEffectiveDate(b);
        return effectiveDate !== null;
      });
    } else if (viewMode === 'compare') {
      return myBooks.filter(b => {
        const effectiveDate = getEffectiveDate(b);
        if (!effectiveDate) return false;
        const year = new Date(effectiveDate).getFullYear();
        return selectedYears.includes(year);
      });
    } else { // 'single' mode
      return myBooks.filter(b => {
        const effectiveDate = getEffectiveDate(b);
        if (!effectiveDate) return false;
        const year = new Date(effectiveDate).getFullYear();
        return year === selectedYear;
      });
    }
  }, [myBooks, selectedYear, viewMode, selectedYears, allBooks]);

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

  const years = Array.from({ length: 15 }, (_, i) => new Date().getFullYear() - i);

  const toggleYearSelection = (year) => {
    if (selectedYears.includes(year)) {
      setSelectedYears(selectedYears.filter(y => y !== year));
    } else {
      setSelectedYears([...selectedYears, year].sort((a, b) => b - a)); // Sort for consistent display
    }
  };

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--gold), var(--deep-pink))' }}>
              <BarChart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Statistiques {viewMode === 'single' ? selectedYear : viewMode === 'all' ? 'Globales' : 'Comparaison'}
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                {booksThisYear.length} livre{booksThisYear.length > 1 ? 's' : ''} lu{booksThisYear.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>

          {/* View Mode Selector */}
          <div className="flex gap-2">
            <Button
              variant={viewMode === 'single' ? 'default' : 'outline'}
              onClick={() => setViewMode('single')}
              style={viewMode === 'single' ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                color: 'white'
              } : { color: '#000000', borderColor: 'var(--beige)' }}
            >
              Année unique
            </Button>
            <Button
              variant={viewMode === 'all' ? 'default' : 'outline'}
              onClick={() => setViewMode('all')}
              style={viewMode === 'all' ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                color: 'white'
              } : { color: '#000000', borderColor: 'var(--beige)' }}
            >
              Toutes
            </Button>
            <Button
              variant={viewMode === 'compare' ? 'default' : 'outline'}
              onClick={() => setViewMode('compare')}
              style={viewMode === 'compare' ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                color: 'white'
              } : { color: '#000000', borderColor: 'var(--beige)' }}
            >
              Comparer
            </Button>
          </div>
        </div>

        {/* Year Selection */}
        {viewMode === 'single' && (
          <div className="mb-6">
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

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2" style={{ color: 'var(--warm-brown)' }}>
                <BookOpen className="w-4 h-4" />
                Livres lus
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                {booksThisYear.length}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2" style={{ color: 'var(--warm-brown)' }}>
                <FileText className="w-4 h-4" />
                Pages lues
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                {totalPages.toLocaleString()}
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2" style={{ color: 'var(--warm-brown)' }}>
                <TrendingUp className="w-4 h-4" />
                Note moyenne
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" style={{ color: 'var(--gold)' }}>
                {avgRating} / 5
              </p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2" style={{ color: 'var(--warm-brown)' }}>
                <Calendar className="w-4 h-4" />
                Par mois
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                {(booksThisYear.length / 12).toFixed(1)}
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle style={{ color: 'var(--dark-text)' }}>Livres par mois</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <RechartsBarChart data={booksPerMonth}>
                  <XAxis dataKey="name" stroke="var(--warm-pink)" />
                  <YAxis stroke="var(--warm-pink)" />
                  <Tooltip />
                  <Bar dataKey="count" fill="var(--deep-pink)" radius={[8, 8, 0, 0]} />
                </RechartsBarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg">
            <CardHeader>
              <CardTitle style={{ color: 'var(--dark-text)' }}>Répartition par genre</CardTitle>
            </CardHeader>
            <CardContent>
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
      </div>
    </div>
  );
}
