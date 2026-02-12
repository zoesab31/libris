import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Sparkles, Plus, Loader2, RefreshCw, Heart } from "lucide-react";
import { toast } from "sonner";

export default function BookRecommendations({ user, myBooks, allBooks }) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendations, setRecommendations] = useState([]);

  const generateRecommendations = async () => {
    setIsGenerating(true);
    try {
      // Analyze user's library
      const readBooks = myBooks.filter(ub => ub.status === "Lu" && ub.rating >= 4);
      const topGenres = {};
      
      readBooks.forEach(ub => {
        const book = allBooks.find(b => b.id === ub.book_id);
        if (book?.genre) {
          topGenres[book.genre] = (topGenres[book.genre] || 0) + 1;
        }
        if (book?.custom_genres) {
          book.custom_genres.forEach(genre => {
            topGenres[genre] = (topGenres[genre] || 0) + 1;
          });
        }
      });

      const favoriteGenres = Object.entries(topGenres)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([genre]) => genre);

      const favoriteBooks = readBooks
        .filter(ub => ub.rating === 5)
        .map(ub => {
          const book = allBooks.find(b => b.id === ub.book_id);
          return book ? `${book.title} par ${book.author}` : null;
        })
        .filter(Boolean)
        .slice(0, 5);

      const prompt = `Je cherche des recommandations de livres basées sur mes lectures préférées.

Mes genres favoris : ${favoriteGenres.join(", ")}
Mes livres préférés (5 étoiles) : ${favoriteBooks.join(", ")}

Recommande-moi 5 livres similaires (romans récents ou populaires). Pour chaque livre, donne :
- Le titre exact
- L'auteur
- Une courte description (1-2 phrases)
- Le genre principal
- Pourquoi tu penses que je l'aimerais

Concentre-toi sur des livres de fantasy, romance, romantasy, new adult, young adult.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  author: { type: "string" },
                  description: { type: "string" },
                  genre: { type: "string" },
                  why: { type: "string" }
                }
              }
            }
          }
        }
      });

      setRecommendations(response.recommendations || []);
    } catch (error) {
      console.error("Error generating recommendations:", error);
      toast.error("Erreur lors de la génération des recommandations");
    } finally {
      setIsGenerating(false);
    }
  };

  const addToLibraryMutation = useMutation({
    mutationFn: async ({ recommendation, status }) => {
      // Create book
      const newBook = await base44.entities.Book.create({
        title: recommendation.title,
        author: recommendation.author,
        genre: recommendation.genre,
        synopsis: recommendation.description
      });

      // Add to user's library
      await base44.entities.UserBook.create({
        book_id: newBook.id,
        status: status
      });

      return newBook;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['books'] });
      toast.success(`Ajouté à ${variables.status === 'Wishlist' ? 'la Wishlist' : 'À lire'} !`);
    },
  });

  return (
    <Card className="shadow-lg border-2" style={{ borderColor: 'var(--beige)' }}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
          <Sparkles className="w-6 h-6" style={{ color: 'var(--warm-pink)' }} />
          Recommandations personnalisées
        </CardTitle>
      </CardHeader>
      <CardContent>
        {recommendations.length === 0 ? (
          <div className="text-center py-8">
            <Sparkles className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
            <p className="mb-4" style={{ color: 'var(--dark-text)' }}>
              Découvrez de nouveaux livres basés sur vos lectures préférées
            </p>
            <Button
              onClick={generateRecommendations}
              disabled={isGenerating}
              className="font-medium text-white"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Génération...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Générer des recommandations
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-end mb-4">
              <Button
                variant="outline"
                size="sm"
                onClick={generateRecommendations}
                disabled={isGenerating}
                style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Nouvelles suggestions
              </Button>
            </div>

            {recommendations.map((rec, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border-2 transition-all hover:shadow-md"
                style={{ borderColor: 'var(--beige)', backgroundColor: 'white' }}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex-1">
                    <h4 className="font-bold text-lg" style={{ color: 'var(--dark-text)' }}>
                      {rec.title}
                    </h4>
                    <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                      {rec.author}
                    </p>
                  </div>
                  <span
                    className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'var(--beige)', color: 'var(--deep-pink)' }}
                  >
                    {rec.genre}
                  </span>
                </div>

                <p className="text-sm mb-2" style={{ color: '#666' }}>
                  {rec.description}
                </p>

                <p className="text-xs italic mb-3" style={{ color: 'var(--warm-pink)' }}>
                  💡 {rec.why}
                </p>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addToLibraryMutation.mutate({ recommendation: rec, status: "À lire" })}
                    disabled={addToLibraryMutation.isPending}
                    style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    À lire
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => addToLibraryMutation.mutate({ recommendation: rec, status: "Wishlist" })}
                    disabled={addToLibraryMutation.isPending}
                    style={{ borderColor: 'var(--beige)', color: 'var(--warm-pink)' }}
                  >
                    <Heart className="w-4 h-4 mr-1" />
                    Wishlist
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}