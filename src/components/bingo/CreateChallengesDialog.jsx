
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Wand2 } from "lucide-react";
import { toast } from "sonner";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function CreateChallengesDialog({ open, onOpenChange, existingChallenges, defaultChallenges }) {
  const queryClient = useQueryClient();
  const [challenges, setChallenges] = useState(Array(25).fill(""));
  const [mode, setMode] = useState('custom'); // Controls the active tab: 'default' or 'custom'

  useEffect(() => {
    if (existingChallenges.length > 0) {
      const sorted = [...existingChallenges].sort((a, b) => a.position - b.position);
      setChallenges(sorted.map(c => c.title));
      setMode('custom'); // If existing challenges, user is editing, so default to custom tab
    } else {
      setChallenges(defaultChallenges); // Initialize editable challenges with default set
      setMode('default'); // If no existing challenges, start with default tab to show options
    }
  }, [existingChallenges, defaultChallenges]);

  const createMutation = useMutation({
    mutationFn: async () => {
      // If existingChallenges are present, delete them first to update them.
      if (existingChallenges.length > 0) {
        await Promise.all(existingChallenges.map(c => base44.entities.BingoChallenge.delete(c.id)));
      }
      
      const createPromises = challenges.map((title, index) => 
        base44.entities.BingoChallenge.create({
          title: title || `Défi ${index + 1}`, // Use current challenges state for creation
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
    onError: (error) => {
      toast.error(`Erreur lors de la création du Bingo: ${error.message}`);
      console.error("Error creating bingo challenges:", error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--dark-text)' }}>
            {existingChallenges.length > 0 ? "Modifier mon Bingo" : "Créer mon Bingo de lecture"}
          </DialogTitle>
        </DialogHeader>

        <Tabs value={mode} onValueChange={setMode} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="default" style={{ color: '#000000' }}>
              Modèle par défaut
            </TabsTrigger>
            <TabsTrigger value="custom" style={{ color: '#000000' }}>
              Personnalisé
            </TabsTrigger>
          </TabsList>

          {/* Content for the "Default Model" tab */}
          <TabsContent value="default">
            <div className="space-y-4 py-4">
              <p className="text-center text-gray-600 mb-4">
                Voici les défis du modèle par défaut. Cliquez sur "Personnalisé" pour les modifier ou créer les vôtres.
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {defaultChallenges.map((challenge, index) => (
                  <div key={index}>
                    <Input
                      value={challenge}
                      readOnly
                      placeholder={`Défi ${index + 1}`}
                      className={index === 12 ? "border-yellow-400 bg-yellow-50" : ""}
                    />
                  </div>
                ))}
              </div>
              <Button
                onClick={() => setMode("custom")} // Switch to custom mode to edit
                className="w-full font-medium py-6 text-lg mt-4"
                style={{ backgroundColor: '#000000', color: '#FFFFFF' }}
              >
                <Wand2 className="w-5 h-5 mr-2" />
                Commencer la personnalisation
              </Button>
            </div>
          </TabsContent>

          {/* Existing challenge input grid now as "Custom" tab content */}
          <TabsContent value="custom">
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
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
