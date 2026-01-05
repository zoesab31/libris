import React from "react";
import { Sparkles, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Discover() {
  const resources = [
    {
      name: "Booknode",
      description: "Découvrez les dernières sorties littéraires, critiques et recommendations",
      url: "https://booknode.com/dates_de_sortie",
      color: "linear-gradient(135deg, var(--deep-pink), var(--warm-pink))",
      icon: "📚"
    },
    {
      name: "Babelio",
      description: "Explorez des milliers de livres, avis et listes de lecture",
      url: "https://www.babelio.com/livres-/nouveautes",
      color: "linear-gradient(135deg, var(--warm-pink), var(--soft-pink))",
      icon: "📖"
    },
    {
      name: "Z-Library",
      description: "Accédez à une vaste collection de livres numériques et ressources",
      url: "https://z-library.sk/",
      color: "linear-gradient(135deg, var(--soft-pink), var(--gold))",
      icon: "📱"
    }
  ];

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-4xl mx-auto">
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
              Vos ressources préférées pour trouver votre prochaine lecture ✨
            </p>
          </div>
        </div>

        <div className="grid gap-6">
          {resources.map((resource) => (
            <Card key={resource.name} className="shadow-xl border-0 overflow-hidden hover:shadow-2xl transition-all hover:-translate-y-1" 
                  style={{ backgroundColor: 'white' }}>
              <div className="h-2" style={{ background: resource.color }} />
              <CardContent className="p-8">
                <div className="flex items-start gap-6">
                  <div className="text-6xl">{resource.icon}</div>
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-3" style={{ color: 'var(--dark-text)' }}>
                      {resource.name}
                    </h2>
                    <p className="text-lg mb-6" style={{ color: 'var(--deep-pink)' }}>
                      {resource.description}
                    </p>
                    <Button
                      asChild
                      className="text-white font-medium px-8 py-6 text-lg rounded-xl shadow-lg"
                      style={{ background: resource.color }}
                    >
                      <a href={resource.url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="w-5 h-5 mr-2" />
                        Visiter {resource.name}
                      </a>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-12 p-8 rounded-2xl text-center" style={{ backgroundColor: 'white' }}>
          <h3 className="text-xl font-bold mb-3" style={{ color: 'var(--dark-text)' }}>
            💡 Astuce
          </h3>
          <p className="text-lg" style={{ color: 'var(--deep-pink)' }}>
            Une fois que vous avez trouvé un livre qui vous plaît, revenez ici pour l'ajouter directement à votre bibliothèque depuis l'onglet "Ma Bibliothèque" !
          </p>
        </div>
      </div>
    </div>
  );
}