import React, { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, TrendingUp, CheckCircle2, Target, Calendar, Sparkles } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function PALDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
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

  const { data: readingLists = [] } = useQuery({
    queryKey: ['readingLists'],
    queryFn: () => base44.entities.ReadingList.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const currentMonth = new Date().getMonth() + 1;
  const currentYear = new Date().getFullYear();

  const stats = useMemo(() => {
    const thematicPALs = readingLists.filter(pal => pal.is_thematic);
    const monthlyPALs = readingLists.filter(pal => !pal.is_thematic);
    const currentMonthPAL = readingLists.find(pal => pal.month === currentMonth && pal.year === currentYear);

    const totalBooks = readingLists.reduce((sum, pal) => sum + (pal.book_ids?.length || 0), 0);
    const uniqueBooks = new Set();
    readingLists.forEach(pal => {
      pal.book_ids?.forEach(bookId => uniqueBooks.add(bookId));
    });

    const booksRead = myBooks.filter(ub => {
      if (ub.status !== "Lu") return false;
      return Array.from(uniqueBooks).includes(ub.book_id);
    }).length;

    let monthlyGoalProgress = 0;
    if (currentMonthPAL && currentMonthPAL.monthly_goal) {
      const readThisMonth = myBooks.filter(ub => {
        if (ub.status !== "Lu" || !ub.end_date) return false;
        const endDate = new Date(ub.end_date);
        return endDate.getMonth() + 1 === currentMonth && 
               endDate.getFullYear() === currentYear &&
               currentMonthPAL.book_ids?.includes(ub.book_id);
      }).length;
      monthlyGoalProgress = currentMonthPAL.monthly_goal > 0 
        ? (readThisMonth / currentMonthPAL.monthly_goal) * 100 
        : 0;
    }

    return {
      totalPALs: readingLists.length,
      thematicPALs: thematicPALs.length,
      monthlyPALs: monthlyPALs.length,
      totalBooks,
      uniqueBooks: uniqueBooks.size,
      booksRead,
      completionRate: uniqueBooks.size > 0 ? (booksRead / uniqueBooks.size) * 100 : 0,
      currentMonthPAL,
      monthlyGoalProgress
    };
  }, [readingLists, myBooks, currentMonth, currentYear]);

  const palsByCategory = useMemo(() => {
    const thematic = readingLists.filter(pal => pal.is_thematic);
    const monthly = readingLists.filter(pal => !pal.is_thematic);

    const calculateProgress = (pal) => {
      if (!pal.book_ids || pal.book_ids.length === 0) return 0;
      const read = myBooks.filter(ub => 
        pal.book_ids.includes(ub.book_id) && ub.status === "Lu"
      ).length;
      return (read / pal.book_ids.length) * 100;
    };

    return {
      thematic: thematic.map(pal => ({
        ...pal,
        progress: calculateProgress(pal),
        booksToRead: myBooks.filter(ub => 
          pal.book_ids?.includes(ub.book_id) && ub.status === "À lire"
        ).length
      })),
      monthly: monthly.map(pal => ({
        ...pal,
        progress: calculateProgress(pal),
        booksToRead: myBooks.filter(ub => 
          pal.book_ids?.includes(ub.book_id) && ub.status === "À lire"
        ).length
      })).sort((a, b) => {
        if (a.year !== b.year) return b.year - a.year;
        return (b.month || 0) - (a.month || 0);
      })
    };
  }, [readingLists, myBooks]);

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'linear-gradient(135deg, #FFF0F6 0%, #FFE4EC 100%)' }}>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8 p-6 md:p-8 rounded-3xl shadow-2xl" 
             style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4, #FFB6C8)' }}>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                📊 Tableau de bord PAL
              </h1>
              <p className="text-lg text-white text-opacity-90">
                Vue d'ensemble de vos Piles À Lire
              </p>
            </div>
            <Button
              onClick={() => navigate(createPageUrl("MyLibrary") + "?tab=pal")}
              className="shadow-xl font-bold px-6 py-3 rounded-xl"
              style={{ backgroundColor: 'white', color: '#FF1493' }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Gérer mes PAL
            </Button>
          </div>
        </div>

        {/* Global Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📚</span>
                <span className="text-3xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                  {stats.totalPALs}
                </span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                PAL totales
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">📖</span>
                <span className="text-3xl font-bold" style={{ color: 'var(--warm-pink)' }}>
                  {stats.uniqueBooks}
                </span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                Livres uniques
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">✅</span>
                <span className="text-3xl font-bold" style={{ color: '#4CAF50' }}>
                  {stats.booksRead}
                </span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                Livres lus
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-6 h-6" style={{ color: 'var(--gold)' }} />
                <span className="text-3xl font-bold" style={{ color: 'var(--gold)' }}>
                  {Math.round(stats.completionRate)}%
                </span>
              </div>
              <p className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                Taux de complétion
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Current Month Goal */}
        {stats.currentMonthPAL && stats.currentMonthPAL.monthly_goal && (
          <Card className="mb-8 shadow-lg border-2" style={{ borderColor: 'var(--warm-pink)' }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                <Target className="w-6 h-6" style={{ color: 'var(--warm-pink)' }} />
                Objectif du mois en cours
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-lg font-bold" style={{ color: 'var(--dark-text)' }}>
                    {stats.currentMonthPAL.name}
                  </p>
                  <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                    Objectif : {stats.currentMonthPAL.monthly_goal} livre{stats.currentMonthPAL.monthly_goal > 1 ? 's' : ''}
                  </p>
                </div>
                <span className="text-3xl font-bold" style={{ color: stats.monthlyGoalProgress >= 100 ? '#4CAF50' : 'var(--deep-pink)' }}>
                  {Math.round(stats.monthlyGoalProgress)}%
                </span>
              </div>
              <Progress value={stats.monthlyGoalProgress} className="h-3" />
            </CardContent>
          </Card>
        )}

        {/* Thematic PALs */}
        {palsByCategory.thematic.length > 0 && (
          <div className="mb-8">
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
              <Sparkles className="w-6 h-6" style={{ color: 'var(--warm-pink)' }} />
              PAL Thématiques
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {palsByCategory.thematic.map(pal => (
                <Card key={pal.id} className="shadow-lg hover:shadow-xl transition-all">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                      <span className="text-2xl">{pal.icon}</span>
                      {pal.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {pal.theme && (
                      <p className="text-sm mb-3 px-3 py-1 rounded-full inline-block" 
                         style={{ backgroundColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                        {pal.theme}
                      </p>
                    )}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--warm-pink)' }}>
                          {pal.booksToRead} à lire
                        </span>
                        <span className="font-bold" style={{ color: 'var(--deep-pink)' }}>
                          {Math.round(pal.progress)}% complété
                        </span>
                      </div>
                      <Progress value={pal.progress} className="h-2" />
                      {pal.description && (
                        <p className="text-xs" style={{ color: '#666' }}>
                          {pal.description}
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Monthly PALs */}
        {palsByCategory.monthly.length > 0 && (
          <div>
            <h2 className="text-2xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
              <Calendar className="w-6 h-6" style={{ color: 'var(--warm-pink)' }} />
              PAL Mensuelles
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {palsByCategory.monthly.map(pal => (
                <Card key={pal.id} className="shadow-lg hover:shadow-xl transition-all">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                      <span className="text-2xl">{pal.icon}</span>
                      {pal.name}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-2 mb-3">
                      <Calendar className="w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
                      <span className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                        {pal.month ? monthNames[pal.month - 1] : ''} {pal.year}
                      </span>
                    </div>
                    {pal.monthly_goal && (
                      <div className="mb-3 p-2 rounded-lg" style={{ backgroundColor: 'var(--beige)' }}>
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4" style={{ color: 'var(--deep-pink)' }} />
                          <span className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                            Objectif : {pal.monthly_goal} livre{pal.monthly_goal > 1 ? 's' : ''}
                          </span>
                        </div>
                      </div>
                    )}
                    <div className="space-y-3">
                      <div className="flex justify-between text-sm">
                        <span style={{ color: 'var(--warm-pink)' }}>
                          {pal.booksToRead} à lire
                        </span>
                        <span className="font-bold" style={{ color: 'var(--deep-pink)' }}>
                          {Math.round(pal.progress)}% complété
                        </span>
                      </div>
                      <Progress value={pal.progress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {readingLists.length === 0 && (
          <Card className="shadow-lg">
            <CardContent className="text-center py-12">
              <div className="text-6xl mb-4">📚</div>
              <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                Aucune PAL créée
              </h3>
              <p className="mb-6" style={{ color: 'var(--warm-pink)' }}>
                Commencez par créer votre première PAL pour suivre vos lectures
              </p>
              <Button
                onClick={() => navigate(createPageUrl("MyLibrary") + "?tab=pal")}
                className="font-medium text-white"
                style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer une PAL
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}