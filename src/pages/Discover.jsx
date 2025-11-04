import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Plus, Loader2, BookOpen, Edit } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function Discover() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiResults, setAiResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [editingCover, setEditingCover] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const searchBooks = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearching(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Tu es un assistant bibliothécaire expert. L'utilisateur recherche: "${searchQuery}". 
        
        Donne-moi 6-8 suggestions de livres correspondant à cette recherche. Pour chaque livre, fournis:
        - Le titre exact
        - L'auteur
        - Un court résumé (2-3 lignes)
        - Le genre
        - L'année de publication
        - L'URL de la couverture du livre (cherche sur Google Books API ou similaire)
        
        Privilégie les sorties récentes et les livres populaires. Si la recherche est vague, propose des nouveautés tendance.`,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            books: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  author: { type: "string" },
                  synopsis: { type: "string" },
                  genre: { type: "string" },
                  publication_year: { type: "number" },
                  cover_url: { type: "string" }
                }
              }
            }
          }
        }
      });
      
      setAiResults(result.books || []);
    } catch (error) {
      toast.error("Erreur lors de la recherche");
    } finally {
      setIsSearching(false);
    }
  };

  const addToLibraryMutation = useMutation({
    mutationFn: async (bookData) => {
      const book = await base44.entities.Book.create({
        title: bookData.title,
        author: bookData.author,
        synopsis: bookData.synopsis,
        genre: bookData.genre,
        publication_year: bookData.publication_year,
        cover_url: bookData.cover_url,
      });
      await base44.entities.UserBook.create({
        book_id: book.id,
        status: "À lire",
      });
      
      // Add points
      const existingPoints = await base44.entities.ReadingPoints.filter({ created_by: user.email });
      if (existingPoints.length > 0) {
        await base44.entities.ReadingPoints.update(existingPoints[0].id, {
          total_points: (existingPoints[0].total_points || 0) + 10
        });
      } else {
        await base44.entities.ReadingPoints.create({ total_points: 10, points_spent: 0 });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      queryClient.invalidateQueries({ queryKey: ['readingPoints'] });
      toast.success("Livre ajouté ! +10 points 🌟");
    },
  });

  const updateCoverUrl = (index, newUrl) => {
    const updated = [...aiResults];
    updated[index].cover_url = newUrl;
    setAiResults(updated);
    setEditingCover(null);
    toast.success("Couverture mise à jour !");
  };

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
               style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
              Découvrir de nouveaux livres
            </h1>
            <p className="text-lg font-medium" style={{ color: 'var(--deep-pink)' }}>
              Trouvez votre prochaine lecture grâce à l'IA ✨
            </p>
          </div>
        </div>

        <div className="mb-8 flex gap-3">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchBooks()}
            placeholder="Romance fantasy, thriller psychologique, nouveautés 2025..."
            className="flex-1 py-6 text-lg bg-white shadow-md rounded-xl border-2 font-medium"
            style={{ borderColor: 'var(--soft-pink)' }}
          />
          <Button 
            onClick={searchBooks}
            disabled={isSearching || !searchQuery.trim()}
            className="shadow-lg text-white font-medium px-8 rounded-xl"
            style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
            {isSearching ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Recherche...
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5 mr-2" />
                Rechercher
              </>
            )}
          </Button>
        </div>

        {aiResults.length > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            {aiResults.map((book, idx) => (
              <Card key={idx} className="shadow-lg border-2 hover:shadow-xl transition-all" 
                    style={{ backgroundColor: 'white', borderColor: 'var(--soft-pink)' }}>
                <CardContent className="p-6">
                  <div className="flex gap-4 mb-4">
                    <div className="relative group">
                      <div className="w-32 h-48 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-12 h-12" style={{ color: 'var(--deep-pink)' }} />
                          </div>
                        )}
                      </div>
                      <Button
                        size="icon"
                        variant="secondary"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => setEditingCover(idx)}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      {editingCover === idx && (
                        <div className="absolute top-0 left-0 right-0 bottom-0 bg-black/80 p-2 flex flex-col gap-2">
                          <Input
                            placeholder="URL de la couverture"
                            defaultValue={book.cover_url}
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                updateCoverUrl(idx, e.target.value);
                              }
                            }}
                            className="text-xs"
                          />
                          <Button size="sm" onClick={() => setEditingCover(null)}>
                            Annuler
                          </Button>
                        </div>
                      )}
                    </div>
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                        {book.title}
                      </h3>
                      <p className="text-sm mb-2 font-medium" style={{ color: 'var(--deep-pink)' }}>
                        par {book.author}
                      </p>
                      <div className="flex gap-2 mb-3">
                        <span className="text-xs px-2 py-1 rounded-full font-medium" 
                              style={{ backgroundColor: 'var(--soft-pink)', color: 'var(--dark-text)' }}>
                          {book.genre}
                        </span>
                        {book.publication_year && (
                          <span className="text-xs px-2 py-1 rounded-full font-medium" 
                                style={{ backgroundColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                            {book.publication_year}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--dark-text)' }}>
                    {book.synopsis}
                  </p>

                  <Button
                    onClick={() => addToLibraryMutation.mutate(book)}
                    disabled={addToLibraryMutation.isPending}
                    className="w-full text-white font-medium"
                    style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter à ma bibliothèque (+10 pts)
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Sparkles className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--deep-pink)' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              Recherchez votre prochaine lecture
            </h3>
            <p className="text-lg mb-6 font-medium" style={{ color: 'var(--deep-pink)' }}>
              Décrivez ce que vous recherchez et l'IA vous suggérera des livres
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {["Nouveautés 2025", "Romance fantasy", "Thriller psychologique", "Young adult"].map((tag) => (
                <Button
                  key={tag}
                  variant="outline"
                  onClick={() => {
                    setSearchQuery(tag);
                    setTimeout(() => searchBooks(), 100);
                  }}
                  className="rounded-xl border-2 font-medium"
                  style={{ borderColor: 'var(--soft-pink)', color: 'var(--deep-pink)' }}
                >
                  {tag}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}