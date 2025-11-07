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
  
  // In progress: ALL non-completed and non-abandoned series
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
  let displayedSeries = allSeries.filter(s => !s.is_abandoned);

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

  // Sort series - abandoned ones go to the bottom
  const sortedSeries = [...filteredSeries].sort((a, b) => {
    // Abandoned series always go to the bottom
    if (a.is_abandoned && !b.is_abandoned) return 1;
    if (!a.is_abandoned && b.is_abandoned) return -1;
    
    // For non-abandoned series, apply normal sorting
    if (sortBy === "name") {
      return a.series_name.localeCompare(b.series_name);
    } else if (sortBy === "progress") {
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
      const progressA = getProgress(a);
      const progressB = getProgress(b);
      return progressB - progressA;
    }
    return 0;
  });

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, #B8E6D5, #A8D5E5)' }}>
              <BookOpen className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Séries à compléter 🌿
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                Suivez vos sagas, tomes lus et à venir
              </p>
            </div>
          </div>
          <Button 
            onClick={() => { setShowAddDialog(true); setEditingSeries(null); }}
            className="shadow-lg text-white font-medium px-6 rounded-xl"
            style={{ background: 'linear-gradient(135deg, #A8D5E5, #B8E6D5)' }}>
            <Plus className="w-5 h-5 mr-2" />
            Ajouter une série
          </Button>
        </div>

        {/* Legend */}
        <div className="mb-6 p-4 rounded-xl shadow-md" style={{ backgroundColor: 'white' }}>
          <div className="flex flex-wrap gap-6 items-center justify-center">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#FFB6C8' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                À acheter
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#E0E7FF' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                Non lu
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full" style={{ backgroundColor: '#B8E6D5' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                Lu
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border-2" style={{ borderColor: '#D1D5DB', backgroundColor: 'transparent' }} />
              <span className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                Pas encore sorti ⏳
              </span>
            </div>
          </div>
        </div>

        {/* Statistics - Now clickable for filtering */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card 
            className={`border-0 shadow-lg overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 ${
              filterType === null ? 'ring-4 ring-purple-300' : ''
            }`}
            onClick={() => setFilterType(null)}
          >
            <div className="h-2" style={{ background: 'linear-gradient(90deg, #A8D5E5, #B8E6D5)' }} />
            <CardContent className="p-4">
              <p className="text-sm mb-1" style={{ color: 'var(--warm-pink)' }}>Total</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--dark-text)' }}>{totalSeries}</p>
            </CardContent>
          </Card>

          <Card 
            className={`border-0 shadow-lg overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 ${
              filterType === 'completed' ? 'ring-4 ring-green-300' : ''
            }`}
            onClick={() => setFilterType(filterType === 'completed' ? null : 'completed')}
          >
            <div className="h-2" style={{ background: 'linear-gradient(90deg, #B8E6D5, #98D8C8)' }} />
            <CardContent className="p-4">
              <p className="text-sm mb-1" style={{ color: 'var(--warm-pink)' }}>Complètes</p>
              <p className="text-3xl font-bold" style={{ color: '#4ADE80' }}>{completedSeriesCount}</p>
            </CardContent>
          </Card>

          <Card 
            className={`border-0 shadow-lg overflow-hidden cursor-pointer transition-all hover:shadow-xl hover:-translate-y-1 ${
              filterType === 'inProgress' ? 'ring-4 ring-blue-300' : ''
            }`}
            onClick={() => setFilterType(filterType === 'inProgress' ? null : 'inProgress')}
          >
            <div className="h-2" style={{ background: 'linear-gradient(90deg, #E0E7FF, #C7D2FE)' }} />
            <CardContent className="p-4">
              <p className="text-sm mb-1" style={{ color: 'var(--warm-pink)' }}>En cours</p>
              <p className="text-3xl font-bold" style={{ color: '#A8D5E5' }}>{inProgressSeriesCount}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-2" style={{ background: 'linear-gradient(90deg, #FFB6C8, #FFA6B8)' }} />
            <CardContent className="p-4">
              <p className="text-sm mb-1" style={{ color: 'var(--warm-pink)' }}>À acheter</p>
              <p className="text-3xl font-bold" style={{ color: '#FF8FAB' }}>{toBuyCount}</p>
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

        {/* Search and Sort */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5" 
                    style={{ color: 'var(--warm-pink)' }} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une série ou un auteur..."
              className="pl-10 border-2"
              style={{ borderColor: '#E0E7FF' }}
            />
          </div>
          <div className="flex gap-2">
            <Button
              variant={sortBy === "name" ? "default" : "outline"}
              onClick={() => setSortBy("name")}
              style={sortBy === "name" ? {
                background: 'linear-gradient(135deg, #A8D5E5, #B8E6D5)',
                color: 'white'
              } : {
                borderColor: '#E0E7FF',
                color: 'var(--dark-text)'
              }}
            >
              A-Z
            </Button>
            <Button
              variant={sortBy === "progress" ? "default" : "outline"}
              onClick={() => setSortBy("progress")}
              style={sortBy === "progress" ? {
                background: 'linear-gradient(135deg, #A8D5E5, #B8E6D5)',
                color: 'white'
              } : {
                borderColor: '#E0E7FF',
                color: 'var(--dark-text)'
              }}
            >
              <TrendingUp className="w-4 h-4 mr-2" />
              Progression
            </Button>
          </div>
        </div>

        {/* Series List */}
        {sortedSeries.length > 0 ? (
          <div className="space-y-4">
            {sortedSeries.map((series) => (
              <div key={series.id} className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditingSeries(series);
                    setShowAddDialog(true);
                  }}
                  className="absolute top-4 right-16 z-10 text-xs"
                  style={{ color: 'var(--deep-pink)' }}
                >
                  Modifier
                </Button>
                <SeriesCard
                  series={series}
                  myBooks={myBooks}
                  allBooks={allBooks}
                  onClick={() => setSelectedSeries(series)}
                />
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <BookOpen className="w-20 h-20 mx-auto mb-6 opacity-20" 
                      style={{ color: 'var(--warm-pink)' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              {searchQuery ? "Aucune série trouvée" : filterType ? "Aucune série dans cette catégorie" : "Aucune série ajoutée"}
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
                Ajouter ma première série
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