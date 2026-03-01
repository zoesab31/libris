import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, RefreshCw } from "lucide-react";
import BingoGrid from "../components/bingo/BingoGrid";
import CreateChallengesDialog from "../components/bingo/CreateChallengesDialog";
import CompleteChallengeDialog from "../components/bingo/CompleteChallengeDialog";

const DEFAULT_CHALLENGES = [
  "Un livre avec une couverture rose",
  "Une romance enemies-to-lovers",
  "Un livre d'un auteur français",
  "Un livre avec un triangle amoureux",
  "Un livre fantasy",
  "Un livre qui vous fait pleurer",
  "Un livre avec les fantômes",
  "Une dystopie",
  "Un livre avec un plot twist de fou",
  "Finir une saga",
  "Une romance young adult",
  "Un livre de plus de 500 pages",
  `${new Date().getFullYear()}`, // Center cell - year
  "Un livre new-adult",
  "Un livre avec de la magie",
  "Une recommandation de Marie",
  "Un livre avec un bad boy",
  "Une cosy fantaisie",
  "Un livre qui se passe à l'université",
  "Un thriller",
  "Un livre avec des fées",
  "Avec un animal central",
  "One best trope",
  "Livre de plus de 900 pages",
  "Un livre avec un triangle amoureux"
];

export default function Bingo() {
  const [user, setUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const selectedGridSize = 25; // Always 5x5 grid
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['bingoChallenges', selectedYear, selectedGridSize],
    queryFn: () => base44.entities.BingoChallenge.filter({ 
      created_by: user?.email,
      year: selectedYear,
      grid_size: selectedGridSize
    }),
    enabled: !!user,
  });

  const { data: books = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const deletePromises = challenges.map(c => base44.entities.BingoChallenge.delete(c.id));
      await Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bingoChallenges'] });
      setShowCreate(true);
    },
  });

  const completedCount = challenges.filter(c => c.is_completed).length;
  const totalCount = challenges.length;
  const hasBingo = totalCount === selectedGridSize && completedCount === selectedGridSize;

  const years = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - i);

  return (
    <div className="p-3 md:p-8 min-h-screen" style={{ background: 'linear-gradient(160deg, #FFF8FC 0%, #FEF3F9 40%, #F9F0FA 70%, #F5F0FF 100%)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-3 md:gap-4 mb-6 md:mb-8">
          <div className="flex items-center gap-2 md:gap-3">
            <div className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--gold), var(--warm-pink))' }}>
              <Trophy className="w-5 h-5 md:w-7 md:h-7 text-white" />
            </div>
            <div>
              <h1 className="text-xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Bingo {selectedYear}
              </h1>
              <p className="text-sm md:text-lg" style={{ color: 'var(--warm-pink)' }}>
                {completedCount} / {totalCount} défis
              </p>
            </div>
          </div>
          <div className="flex gap-2 md:gap-3 flex-wrap">
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(parseInt(e.target.value))}
              className="px-3 md:px-4 py-2 rounded-lg border-2 font-medium text-sm md:text-base"
              style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}
            >
              {years.map(year => (
                <option key={year} value={year}>{year}</option>
              ))}
            </select>

            {/* Grid Size Selector - Always 5x5 */}
            <select
              value={25}
              disabled
              className="px-3 md:px-4 py-2 rounded-lg border-2 font-medium text-sm md:text-base opacity-50"
              style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}
            >
              <option value={25}>5x5</option>
            </select>

            <Button 
              onClick={() => setShowCreate(true)}
              className="shadow-lg text-white font-medium px-4 md:px-6 py-2 rounded-xl"
              style={{ background: 'linear-gradient(135deg, var(--gold), var(--warm-pink))' }}>
              <Sparkles className="w-4 md:w-5 h-4 md:h-5 mr-1 md:mr-2" />
              <span className="text-sm md:text-base">{challenges.length === 0 ? "Créer" : "Modifier"}</span>
            </Button>
            {challenges.length > 0 && (
              <Button 
                variant="outline"
                onClick={() => {
                  if (window.confirm("Êtes-vous sûre de vouloir réinitialiser tout le Bingo ?")) {
                    resetMutation.mutate();
                  }
                }}
                disabled={resetMutation.isPending}
                className="px-4 md:px-6 py-2"
                style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}
              >
                <RefreshCw className="w-4 md:w-5 h-4 md:h-5 mr-1 md:mr-2" />
                <span className="text-sm md:text-base">Réinitialiser</span>
              </Button>
            )}
          </div>
        </div>

        {challenges.length === 0 ? (
          <div className="text-center py-12 md:py-20">
            <Trophy className="w-16 h-16 md:w-20 md:h-20 mx-auto mb-4 md:mb-6 opacity-20" style={{ color: 'var(--gold)' }} />
            <h3 className="text-xl md:text-2xl font-bold mb-2 px-4" style={{ color: 'var(--dark-text)' }}>
              Créez votre Bingo {selectedYear} !
            </h3>
            <p className="text-base md:text-lg mb-4 md:mb-6 px-4" style={{ color: 'var(--warm-pink)' }}>
              Relevez {selectedGridSize} défis littéraires
            </p>
            <Button 
              onClick={() => setShowCreate(true)}
              className="shadow-lg text-white font-medium px-6 md:px-8 py-4 md:py-6 text-base md:text-lg rounded-xl"
              style={{ background: 'linear-gradient(135deg, var(--gold), var(--warm-pink))' }}>
              <Sparkles className="w-5 md:w-6 h-5 md:h-6 mr-2" />
              Commencer
            </Button>
          </div>
        ) : (
          <>
            {completedCount === totalCount && (
              <div className="mb-6 md:mb-8 p-4 md:p-6 rounded-2xl text-center shadow-lg animate-pulse"
                   style={{ background: 'linear-gradient(135deg, var(--gold), var(--warm-pink))' }}>
                <h2 className="text-xl md:text-2xl font-bold text-white mb-2">
                  🎉 BINGO COMPLÉTÉ ! 🎉
                </h2>
                <p className="text-sm md:text-base text-white opacity-90">
                  Tous les défis {selectedYear} relevés !
                </p>
              </div>
            )}
            
            <BingoGrid 
              challenges={challenges}
              books={books}
              onChallengeClick={setSelectedChallenge}
              isLoading={isLoading}
              gridSize={selectedGridSize}
              year={selectedYear}
            />
          </>
        )}

        <CreateChallengesDialog 
          open={showCreate}
          onOpenChange={setShowCreate}
          existingChallenges={challenges}
          defaultChallenges={DEFAULT_CHALLENGES}
          selectedYear={selectedYear}
          gridSize={selectedGridSize}
        />

        {selectedChallenge && (
          <CompleteChallengeDialog
            challenge={selectedChallenge}
            books={books}
            open={!!selectedChallenge}
            onOpenChange={(open) => !open && setSelectedChallenge(null)}
          />
        )}
      </div>
    </div>
  );
}