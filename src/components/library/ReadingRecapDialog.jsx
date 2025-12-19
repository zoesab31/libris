import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Shield } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ReadingRecapDialog({ open, onOpenChange, book, userBook }) {
  const [recap, setRecap] = useState("");

  const generateRecapMutation = useMutation({
    mutationFn: async () => {
      if (!userBook?.current_page && !userBook?.chapter) {
        throw new Error("Aucune progression enregistrée");
      }

      const currentProgress = userBook.chapter 
        ? `chapitre "${userBook.chapter}"` 
        : `page ${userBook.current_page}`;

      const prompt = `Tu es un assistant de lecture respectueux qui aide les lecteurs à reprendre une lecture sans spoiler.

Contexte:
- Livre: "${book.title}" par ${book.author}
- Progression actuelle: ${currentProgress}
- ${book.page_count ? `Total: ${book.page_count} pages` : ''}

Instructions CRITIQUES:
1. Ne JAMAIS révéler ce qui se passe APRÈS la progression actuelle
2. Rappeler uniquement les personnages DÉJÀ apparus
3. Résumer la situation ACTUELLE de l'intrigue
4. Mentionner les enjeux PRÉSENTS à ce stade
5. Ton neutre, factuel, rassurant
6. Maximum 200 mots

Format attendu:
📖 Personnages rencontrés jusqu'ici: [liste]
🔮 Situation actuelle: [résumé court]
⚡ Enjeux présents: [points clés]

RAPPEL: Aucun spoiler sur la suite, les twists ou la fin. Seulement ce qui s'est déjà passé.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        add_context_from_internet: false
      });

      return result;
    },
    onSuccess: (data) => {
      setRecap(data);
    },
    onError: (error) => {
      console.error("Error generating recap:", error);
      toast.error("Erreur lors de la génération du rappel");
    }
  });

  const handleClose = () => {
    setRecap("");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl" style={{ color: 'var(--dark-text)' }}>
            <Sparkles className="w-6 h-6" style={{ color: 'var(--deep-pink)' }} />
            Rappel de lecture
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Badge Sans Spoiler */}
          <div className="flex items-center justify-center gap-2 p-3 rounded-xl" 
               style={{ backgroundColor: '#E8F5E9' }}>
            <Shield className="w-5 h-5 text-green-700" />
            <p className="text-sm font-bold text-green-800">
              Sans spoiler • Uniquement jusqu'à votre progression
            </p>
          </div>

          {!recap ? (
            <div className="text-center py-8">
              <p className="text-sm mb-6" style={{ color: 'var(--warm-pink)' }}>
                {userBook?.chapter 
                  ? `Je vais vous rappeler ce qui s'est passé jusqu'au ${userBook.chapter}` 
                  : `Je vais vous rappeler ce qui s'est passé jusqu'à la page ${userBook?.current_page}`}
              </p>
              <Button
                onClick={() => generateRecapMutation.mutate()}
                disabled={generateRecapMutation.isPending}
                className="text-white"
                style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
              >
                {generateRecapMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Génération en cours...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Générer le rappel
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                <div className="prose prose-sm max-w-none whitespace-pre-wrap" 
                     style={{ color: 'var(--dark-text)' }}>
                  {recap}
                </div>
              </div>

              <div className="text-center">
                <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                  💡 Ce rappel est basé sur votre progression actuelle et ne contient aucun spoiler sur la suite
                </p>
              </div>

              <Button
                onClick={handleClose}
                variant="outline"
                className="w-full"
              >
                Fermer
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}