import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sparkles, Plus, Loader2, BookOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function Discover() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [aiResults, setAiResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
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
                  publication_year: { type: "number" }
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
      });
      await base44.entities.UserBook.create({
        book_id: book.id,
        status: "À lire",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['books'] });
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("Livre ajouté à votre bibliothèque !");
    },
  });

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
               style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}>
            <Sparkles className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--deep-brown)' }}>
              Découvrir de nouveaux livres
            </h1>
            <p className="text-lg" style={{ color: 'var(--warm-brown)' }}>
              Trouvez votre prochaine lecture grâce à l'IA
            </p>
          </div>
        </div>

        <div className="mb-8 flex gap-3">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && searchBooks()}
            placeholder="Romance fantasy, thriller psychologique, nouveautés 2025..."
            className="flex-1 py-6 text-lg bg-white shadow-md rounded-xl border-0"
          />
          <Button 
            onClick={searchBooks}
            disabled={isSearching || !searchQuery.trim()}
            className="shadow-lg text-white font-medium px-8 rounded-xl"
            style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}>
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
              <Card key={idx} className="shadow-lg border-0 hover:shadow-xl transition-all" 
                    style={{ backgroundColor: 'white' }}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-1" style={{ color: 'var(--deep-brown)' }}>
                        {book.title}
                      </h3>
                      <p className="text-sm mb-2" style={{ color: 'var(--warm-brown)' }}>
                        par {book.author}
                      </p>
                      <div className="flex gap-2 mb-3">
                        <span className="text-xs px-2 py-1 rounded-full" 
                              style={{ backgroundColor: 'var(--beige)', color: 'var(--deep-brown)' }}>
                          {book.genre}
                        </span>
                        {book.publication_year && (
                          <span className="text-xs px-2 py-1 rounded-full" 
                                style={{ backgroundColor: 'var(--cream)', color: 'var(--warm-brown)' }}>
                            {book.publication_year}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <p className="text-sm mb-4 leading-relaxed" style={{ color: 'var(--deep-brown)' }}>
                    {book.synopsis}
                  </p>

                  <Button
                    onClick={() => addToLibraryMutation.mutate(book)}
                    disabled={addToLibraryMutation.isPending}
                    className="w-full text-white font-medium"
                    style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Ajouter à ma bibliothèque
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <Sparkles className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-brown)' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--deep-brown)' }}>
              Recherchez votre prochaine lecture
            </h3>
            <p className="text-lg mb-6" style={{ color: 'var(--warm-brown)' }}>
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
                  className="rounded-xl"
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