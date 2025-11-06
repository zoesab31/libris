
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

  // Filter series
  const filteredSeries = allSeries.filter(series =>
    series.series_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    series.author?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort series
  const sortedSeries = [...filteredSeries].sort((a, b) => {
    if (sortBy === "name") {
      return a.series_name.localeCompare(b.series_name);
    } else if (sortBy === "progress") {
      const progressA = (a.books_read?.length || 0) / a.total_books;
      const progressB = (b.books_read?.length || 0) / b.total_books;
      return progressB - progressA;
    }
    return 0;
  });

  // Statistics
  const totalSeries = allSeries.length;
  const completedSeries = allSeries.filter(s => 
    (s.books_read?.length || 0) === s.total_books
  ).length;
  const inProgressSeries = allSeries.filter(s => 
    (s.books_read?.length || 0) > 0 && (s.books_read?.length || 0) < s.total_books
  ).length;
  const toBuySeries = allSeries.filter(s => 
    (s.books_wishlist?.length || 0) > 0
  ).length;

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

        {/* Statistics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-2" style={{ background: 'linear-gradient(90deg, #A8D5E5, #B8E6D5)' }} />
            <CardContent className="p-4">
              <p className="text-sm mb-1" style={{ color: 'var(--warm-pink)' }}>Total</p>
              <p className="text-3xl font-bold" style={{ color: 'var(--dark-text)' }}>{totalSeries}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-2" style={{ background: 'linear-gradient(90deg, #B8E6D5, #98D8C8)' }} />
            <CardContent className="p-4">
              <p className="text-sm mb-1" style={{ color: 'var(--warm-pink)' }}>Complètes</p>
              <p className="text-3xl font-bold" style={{ color: '#4ADE80' }}>{completedSeries}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-2" style={{ background: 'linear-gradient(90deg, #E0E7FF, #C7D2FE)' }} />
            <CardContent className="p-4">
              <p className="text-sm mb-1" style={{ color: 'var(--warm-pink)' }}>En cours</p>
              <p className="text-3xl font-bold" style={{ color: '#A8D5E5' }}>{inProgressSeries}</p>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-lg overflow-hidden">
            <div className="h-2" style={{ background: 'linear-gradient(90deg, #FFB6C8, #FFA6B8)' }} />
            <CardContent className="p-4">
              <p className="text-sm mb-1" style={{ color: 'var(--warm-pink)' }}>À acheter</p>
              <p className="text-3xl font-bold" style={{ color: '#FF8FAB' }}>{toBuySeries}</p>
            </CardContent>
          </Card>
        </div>

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
              {searchQuery ? "Aucune série trouvée" : "Aucune série ajoutée"}
            </h3>
            <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
              {searchQuery ? "Essayez une autre recherche" : "Commencez à suivre vos sagas préférées"}
            </p>
            {!searchQuery && (
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
