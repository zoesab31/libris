import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";

export default function CreateChallengesDialog({ open, onOpenChange, existingChallenges, defaultChallenges }) {
  const queryClient = useQueryClient();
  const [challenges, setChallenges] = useState(Array(25).fill(""));

  useEffect(() => {
    if (existingChallenges.length > 0) {
      const sorted = [...existingChallenges].sort((a, b) => a.position - b.position);
      setChallenges(sorted.map(c => c.title));
    } else {
      setChallenges(defaultChallenges);
    }
  }, [existingChallenges, defaultChallenges]);

  const createMutation = useMutation({
    mutationFn: async () => {
      if (existingChallenges.length > 0) {
        await Promise.all(existingChallenges.map(c => base44.entities.BingoChallenge.delete(c.id)));
      }
      
      const createPromises = challenges.map((title, index) => 
        base44.entities.BingoChallenge.create({
          title: title || `Défi ${index + 1}`,
          position: index,
          is_completed: false,
        })
      );
      await Promise.all(createPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bingoChallenges'] });
      toast.success("Bingo créé avec succès !");
      onOpenChange(false);
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2" style={{ color: 'var(--deep-brown)' }}>
            <Wand2 className="w-6 h-6" />
            Personnalisez vos 25 défis
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {challenges.map((challenge, index) => (
              <div key={index}>
                <Input
                  value={challenge}
                  onChange={(e) => {
                    const newChallenges = [...challenges];
                    newChallenges[index] = e.target.value;
                    setChallenges(newChallenges);
                  }}
                  placeholder={`Défi ${index + 1}`}
                  className={index === 12 ? "border-yellow-400 bg-yellow-50" : ""}
                />
              </div>
            ))}
          </div>

          <Button
            onClick={() => createMutation.mutate()}
            disabled={createMutation.isPending || challenges.filter(c => c.trim()).length < 10}
            className="w-full text-white font-medium py-6 text-lg"
            style={{ background: 'linear-gradient(135deg, var(--gold), var(--warm-brown))' }}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              <>
                <Wand2 className="w-5 h-5 mr-2" />
                {existingChallenges.length > 0 ? "Mettre à jour le Bingo" : "Créer mon Bingo"}
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}