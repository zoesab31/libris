import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { BookOpen, Plus, Search, TrendingUp } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import AddSeriesDialog from "../components/series/AddSeriesDialog";
import SeriesCard from "../components/series/SeriesCard";
import SeriesDetailsDialog from "../components/series/SeriesDetailsDialog";

export default function Series() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSeries, setSelectedSeries] = useState(null);
  const [sortBy, setSortBy] = useState("name");
  const [showAbandoned, setShowAbandoned] = useState(false);
  const [editingSeries, setEditingSeries] = useState(null);
  const [filterType, setFilterType] = useState(null); // null, 'completed', 'inProgress', 'toBuy'

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: allSeries = [], isLoading } = useQuery({
    queryKey: ['bookSeries'],
    queryFn: () => base44.entities.BookSeries.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  // Helper function to check if series is completed
  const isSeriesCompleted = (series) => {
    if (series.is_abandoned) return false;
    if (!series.reading_order || series.reading_order.length === 0) return false;
    
    const booksWithId = series.reading_order.filter(ro => ro.book_id);
    if (booksWithId.length === 0) return false;
    
    return booksWithId.every(ro => {
      const userBook = myBooks.find(ub => ub.book_id === ro.book_id);
      return userBook && userBook.status === 'Lu';
    });
  };

  // Statistics - CORRECTED LOGIC
  const totalSeries = allSeries.filter(s => !s.is_abandoned).length;
  
  // Completed: all books in reading_order are read
  const completedSeriesCount = allSeries.filter(s => isSeriesCompleted(s)).length;
  
  // In progress: ALL non-completed and non-abandoned series (any series that's not finished)
  const inProgressSeriesCount = allSeries.filter(s => {
    if (s.is_abandoned) return false;
    return !isSeriesCompleted(s); // If not completed and not abandoned = in progress
  }).length;
  
  // To buy: total books we don't own from all non-abandoned series
  const toBuyCount = allSeries.reduce((total, s) => {
    if (s.is_abandoned) return total;
    if (!s.reading_order) return total;
    
    const booksNotOwned = s.reading_order.filter(ro => {
      if (!ro.book_id) return false;
      const userBook = myBooks.find(ub => ub.book_id === ro.book_id);
      return !userBook || userBook.status === 'Wishlist';
    }).length;
    
    return total + booksNotOwned;
  }, 0);

  // Filter series based on active filter
  let displayedSeries = allSeries.filter(s => showAbandoned ? true : !s.is_abandoned);

  if (filterType === 'completed') {
    displayedSeries = displayedSeries.filter(s => isSeriesCompleted(s));
  } else if (filterType === 'inProgress') {
    displayedSeries = displayedSeries.filter(s => !isSeriesCompleted(s));
  }

  // Apply search filter
  const filteredSeries = displayedSeries.filter(series =>
    series.series_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    series.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort: inachevées d'abord puis A–Z; option progress when chosen
  const sortedSeries = [...filteredSeries].sort((a, b) => {
    if (sortBy === 'progress') {
      const getProgress = (series) => {
        if (!series.reading_order || series.reading_order.length === 0) return 0;
        const booksWithId = series.reading_order.filter(ro => ro.book_id);
        if (booksWithId.length === 0) return 0;
        const readCount = booksWithId.filter(ro => {
          const userBook = myBooks.find(ub => ub.book_id === ro.book_id);
          return userBook && userBook.status === 'Lu';
        }).length;
        return readCount / booksWithId.length;
      };
      return getProgress(b) - getProgress(a);
    }
    // default: incomplete first then A–Z
    const aCompleted = isSeriesCompleted(a);
    const bCompleted = isSeriesCompleted(b);
    if (aCompleted !== bCompleted) return aCompleted ? 1 : -1;
    return a.series_name.localeCompare(b.series_name, 'fr', { sensitivity: 'base' });
  });

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #FFF8FC 0%, #FEF3F9 40%, #F9F0FA 70%, #F5F0FF 100%)' }}>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header pastel */}
        <div className="mb-8 p-5 md:p-7 rounded-3xl shadow-lg"
             style={{ background: '#FCE8F8', border: '1px solid #F4BDE9' }}>
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-2xl md:text-4xl font-extrabold mb-1" style={{ color: '#A81F8C' }}>
                📚 Mes sagas
              </h1>
              <p className="text-sm font-medium" style={{ color: '#C24FAE' }}>
                Suivez vos sagas, tomes lus et à venir
              </p>
            </div>
            <Button 
              onClick={() => { setShowAddDialog(true); setEditingSeries(null); }}
              className="shadow-md font-bold px-6 py-3 rounded-xl hover:scale-105 transition-transform text-white"
              style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
              <Plus className="w-5 h-5 mr-2" />
              Ajouter
            </Button>
          </div>
        </div>

        {/* Legend améliorée */}
        <div className="mb-6 p-4 md:p-6 rounded-2xl shadow-xl" style={{ backgroundColor: 'white' }}>
          <div className="grid grid-cols-2 md:flex md:flex-wrap gap-4 md:gap-6 items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full shadow-md" style={{ backgroundColor: '#FFB6C8' }} />
              <span className="text-xs md:text-sm font-bold" style={{ color: '#2D3748' }}>
                À acheter
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full shadow-md" style={{ backgroundColor: '#E0E7FF' }} />
              <span className="text-xs md:text-sm font-bold" style={{ color: '#2D3748' }}>
                Non lu
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full shadow-md" style={{ backgroundColor: '#B8E6D5' }} />
              <span className="text-xs md:text-sm font-bold" style={{ color: '#2D3748' }}>
                Lu
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full border-2 shadow-md" style={{ borderColor: '#D1D5DB', backgroundColor: 'white' }} />
              <span className="text-xs md:text-sm font-bold" style={{ color: '#2D3748' }}>
                Pas encore sorti
              </span>
            </div>
          </div>
        </div>

        {/* Statistics Cards améliorées */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-8">
          <Card 
            className={`border-0 shadow-xl hover:shadow-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1 rounded-2xl ${
              filterType === null ? 'ring-4' : ''
            }`}
            onClick={() => setFilterType(null)}
            style={{ ringColor: '#9B59B6' }}
          >
            <div className="h-2" style={{ background: 'linear-gradient(90deg, #9B59B6, #BA68C8)' }} />
            <CardContent className="p-4 md:p-6">
              <p className="text-xs md:text-sm font-bold mb-2" style={{ color: '#666' }}>Total</p>
              <p className="text-3xl md:text-4xl font-bold" style={{ color: '#9B59B6' }}>{totalSeries}</p>
            </CardContent>
          </Card>

          <Card 
            className={`border-0 shadow-xl hover:shadow-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1 rounded-2xl ${
              filterType === 'completed' ? 'ring-4' : ''
            }`}
            onClick={() => setFilterType(filterType === 'completed' ? null : 'completed')}
            style={{ ringColor: '#4ADE80' }}
          >
            <div className="h-2" style={{ background: 'linear-gradient(90deg, #4ADE80, #86EFAC)' }} />
            <CardContent className="p-4 md:p-6">
              <p className="text-xs md:text-sm font-bold mb-2" style={{ color: '#666' }}>Complètes</p>
              <p className="text-3xl md:text-4xl font-bold" style={{ color: '#4ADE80' }}>{completedSeriesCount}</p>
            </CardContent>
          </Card>

          <Card 
            className={`border-0 shadow-xl hover:shadow-2xl overflow-hidden cursor-pointer transition-all hover:-translate-y-1 rounded-2xl ${
              filterType === 'inProgress' ? 'ring-4' : ''
            }`}
            onClick={() => setFilterType(filterType === 'inProgress' ? null : 'inProgress')}
            style={{ ringColor: '#60A5FA' }}
          >
            <div className="h-2" style={{ background: 'linear-gradient(90deg, #60A5FA, #93C5FD)' }} />
            <CardContent className="p-4 md:p-6">
              <p className="text-xs md:text-sm font-bold mb-2" style={{ color: '#666' }}>En cours</p>
              <p className="text-3xl md:text-4xl font-bold" style={{ color: '#60A5FA' }}>{inProgressSeriesCount}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-xl hover:shadow-2xl hover:-translate-y-1 transition-all rounded-2xl overflow-hidden">
            <div className="h-2" style={{ background: 'linear-gradient(90deg, #FF1493, #FF69B4)' }} />
            <CardContent className="p-4 md:p-6">
              <p className="text-xs md:text-sm font-bold mb-2" style={{ color: '#666' }}>À acheter</p>
              <p className="text-3xl md:text-4xl font-bold" style={{ color: '#FF1493' }}>{toBuyCount}</p>
            </CardContent>
          </Card>
        </div>

        {/* Active filter indicator */}
        {filterType && (
          <div className="mb-6 flex items-center justify-between p-4 rounded-xl shadow-md" 
               style={{ backgroundColor: 'white' }}>
            <p className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
              Filtre actif : <span className="font-bold" style={{ color: 'var(--deep-pink)' }}>
                {filterType === 'completed' ? 'Séries complètes' : 'Séries en cours'}
              </span>
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setFilterType(null)}
              style={{ borderColor: 'var(--deep-pink)', color: 'var(--deep-pink)' }}
            >
              Réinitialiser
            </Button>
          </div>
        )}

        {/* Search, Sort, Toggle Abandonnées */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" 
                    style={{ color: '#FF1493' }} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une série..."
              className="pl-12 py-6 text-base md:text-lg rounded-2xl border-2 shadow-lg font-medium"
              style={{ 
                borderColor: '#FFE1F0',
                backgroundColor: 'white'
              }}
            />
          </div>
          <div className="flex gap-2 items-center flex-wrap">
            <Button
              variant={showAbandoned ? 'default' : 'outline'}
              onClick={() => setShowAbandoned(v => !v)}
              className="rounded-xl"
              style={showAbandoned ? { background: 'linear-gradient(135deg, #9CA3AF, #6B7280)', color: 'white' } : {}}
            >{showAbandoned ? 'Masquer abandonnées' : 'Afficher abandonnées'}</Button>
            <Button
              variant={sortBy === "name" ? "default" : "outline"}
              onClick={() => setSortBy("name")}
              className="flex-1 md:flex-none rounded-xl font-bold shadow-lg px-4 md:px-6 py-3"
              style={sortBy === "name" ? {
                background: 'linear-gradient(135deg, #9B59B6, #BA68C8)',
                color: 'white'
              } : {
                borderColor: '#FFE1F0',
                color: '#2D3748',
                backgroundColor: 'white'
              }}
            >
              A-Z
            </Button>
            <Button
              variant={sortBy === "progress" ? "default" : "outline"}
              onClick={() => setSortBy("progress")}
              className="flex-1 md:flex-none rounded-xl font-bold shadow-lg px-4 md:px-6 py-3"
              style={sortBy === "progress" ? {
                background: 'linear-gradient(135deg, #9B59B6, #BA68C8)',
                color: 'white'
              } : {
                borderColor: '#FFE1F0',
                color: '#2D3748',
                backgroundColor: 'white'
              }}
            >
              <TrendingUp className="w-4 h-4 mr-1 md:mr-2" />
              Progression
            </Button>
          </div>
        </div>

        {/* Series List */}
        {sortedSeries.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sortedSeries.map((series) => (
              <SeriesCard
                key={series.id}
                series={series}
                myBooks={myBooks}
                allBooks={allBooks}
                onClick={() => setSelectedSeries(series)}
                onEdit={(s) => {
                  setEditingSeries(s);
                  setShowAddDialog(true);
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <BookOpen className="w-20 h-20 mx-auto mb-6 opacity-20" 
                      style={{ color: 'var(--warm-pink)' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              {searchQuery ? "Aucune saga trouvée" : filterType ? "Aucune saga dans cette catégorie" : "Aucune saga ajoutée"}
            </h3>
            <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
              {searchQuery ? "Essayez une autre recherche" : filterType ? "Changez de filtre ou ajoutez des séries" : "Commencez à suivre vos sagas préférées"}
            </p>
            {!searchQuery && !filterType && (
              <Button
                onClick={() => { setShowAddDialog(true); setEditingSeries(null); }}
                className="text-white font-medium"
                style={{ background: 'linear-gradient(135deg, #A8D5E5, #B8E6D5)' }}
              >
                <Plus className="w-5 h-5 mr-2" />
                Ajouter ma première saga
              </Button>
            )}
          </div>
        )}

        {/* Dialogs */}
        <AddSeriesDialog
          open={showAddDialog}
          onOpenChange={(open) => {
            setShowAddDialog(open);
            if (!open) setEditingSeries(null);
          }}
          user={user}
          editSeries={editingSeries}
        />

        {selectedSeries && (
          <SeriesDetailsDialog
            series={selectedSeries}
            open={!!selectedSeries}
            onOpenChange={(open) => !open && setSelectedSeries(null)}
            myBooks={myBooks}
            allBooks={allBooks}
          />
        )}
      </div>
    </div>
  );
}