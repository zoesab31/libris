import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Trophy, Sparkles, RefreshCw } from "lucide-react";
import BingoGrid from "../components/bingo/BingoGrid";
import CreateChallengesDialog from "../components/bingo/CreateChallengesDialog";
import CompleteChallengeDialog from "../components/bingo/CompleteChallengeDialog";

const DEFAULT_CHALLENGES = [
  "Un livre avec une couverture dorée",
  "Un livre de plus de 500 pages",
  "Une romance enemies-to-lovers",
  "Un livre d'un auteur français",
  "Un livre avec un triangle amoureux",
  "Un livre fantasy",
  "Un livre qui vous fait pleurer",
  "Un livre avec un personnage LGBTQ+",
  "Une dystopie",
  "Un livre avec une fin qui vous surprend",
  "Un livre avec des dragons",
  "Une romance young adult",
  "CASE LIBRE ✨",
  "Un livre d'un auteur que vous adorez",
  "Un livre new adult",
  "Un livre avec de la magie",
  "Un thriller psychologique",
  "Un livre avec un bad boy",
  "Une romance paranormale",
  "Un livre qui se passe à l'université",
  "Un livre avec un road trip",
  "Un livre avec des fées",
  "Une romance contemporaine",
  "Un livre avec un love interest alpha",
  "Un livre avec une héroïne badass"
];

export default function Bingo() {
  const [user, setUser] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: challenges = [], isLoading } = useQuery({
    queryKey: ['bingoChallenges'],
    queryFn: () => base44.entities.BingoChallenge.filter({ created_by: user?.email }),
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
  const hasBingo = totalCount === 25;

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--gold), var(--warm-brown))' }}>
              <Trophy className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--deep-brown)' }}>
                Bingo Lecture 2025
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-brown)' }}>
                {completedCount} / {totalCount} défis complétés
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {hasBingo && (
              <Button 
                variant="outline"
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                style={{ borderColor: 'var(--beige)' }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Recommencer
              </Button>
            )}
            {!hasBingo && (
              <Button 
                onClick={() => setShowCreate(true)}
                className="shadow-lg text-white font-medium px-6 rounded-xl"
                style={{ background: 'linear-gradient(135deg, var(--gold), var(--warm-brown))' }}>
                <Sparkles className="w-5 h-5 mr-2" />
                {challenges.length === 0 ? "Créer mon Bingo" : "Modifier"}
              </Button>
            )}
          </div>
        </div>

        {challenges.length === 0 ? (
          <div className="text-center py-20">
            <Trophy className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--gold)' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--deep-brown)' }}>
              Créez votre Bingo de lecture !
            </h3>
            <p className="text-lg mb-6" style={{ color: 'var(--warm-brown)' }}>
              Relevez 25 défis littéraires cette année
            </p>
            <Button 
              onClick={() => setShowCreate(true)}
              className="shadow-lg text-white font-medium px-8 py-6 text-lg rounded-xl"
              style={{ background: 'linear-gradient(135deg, var(--gold), var(--warm-brown))' }}>
              <Sparkles className="w-6 h-6 mr-2" />
              Commencer
            </Button>
          </div>
        ) : (
          <>
            {completedCount === totalCount && (
              <div className="mb-8 p-6 rounded-2xl text-center shadow-lg animate-pulse"
                   style={{ background: 'linear-gradient(135deg, var(--gold), var(--warm-brown))' }}>
                <h2 className="text-2xl font-bold text-white mb-2">
                  🎉 BINGO COMPLÉTÉ ! 🎉
                </h2>
                <p className="text-white opacity-90">
                  Félicitations ! Vous avez relevé tous les défis !
                </p>
              </div>
            )}
            
            <BingoGrid 
              challenges={challenges}
              books={books}
              onChallengeClick={setSelectedChallenge}
              isLoading={isLoading}
            />
          </>
        )}

        <CreateChallengesDialog 
          open={showCreate}
          onOpenChange={setShowCreate}
          existingChallenges={challenges}
          defaultChallenges={DEFAULT_CHALLENGES}
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