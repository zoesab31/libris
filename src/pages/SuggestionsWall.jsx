import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Heart, Check, X, Clock, Sparkles, Send, ChevronDown } from "lucide-react";
import { useState as useLocalState } from "react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SuggestionsWall() {
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("nouvelle_fonctionnalité");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [showDone, setShowDone] = useState(false);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['suggestions'],
    queryFn: () => base44.entities.Suggestion.list('-created_date'),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const createSuggestionMutation = useMutation({
    mutationFn: (data) => base44.entities.Suggestion.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      setTitle("");
      setDescription("");
      setCategory("nouvelle_fonctionnalité");
      setShowSuccessDialog(true);
    },
  });

  const toggleLikeMutation = useMutation({
    mutationFn: async ({ id, likes }) => {
      const hasLiked = likes.includes(user?.email);
      const newLikes = hasLiked 
        ? likes.filter(email => email !== user?.email)
        : [...likes, user?.email];
      
      return base44.entities.Suggestion.update(id, { likes: newLikes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }) => {
      if (status === 'refusée') {
        await base44.entities.Suggestion.delete(id);
      } else {
        await base44.entities.Suggestion.update(id, { status });
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      toast.success(variables.status === 'refusée' ? "Suggestion supprimée" : "Statut mis à jour");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      toast.error("Veuillez remplir tous les champs");
      return;
    }
    createSuggestionMutation.mutate({ title, description, category });
  };

  const getUserInfo = (email) => {
    const userInfo = allUsers.find(u => u.email === email);
    return userInfo?.display_name || userInfo?.full_name || email.split('@')[0];
  };

  // Sort by likes count
  const sortedSuggestions = [...suggestions].sort((a, b) => {
    const likesA = a.likes?.length || 0;
    const likesB = b.likes?.length || 0;
    return likesB - likesA;
  });

  const filteredSuggestions = sortedSuggestions.filter(s => {
    const statusMatch = filterStatus === "all" || s.status === filterStatus;
    const categoryMatch = filterCategory === "all" || s.category === filterCategory;
    return statusMatch && categoryMatch;
  });

  const statusColors = {
    en_attente: { bg: '#FEF3C7', text: '#92400E', icon: Clock },
    en_cours: { bg: '#DBEAFE', text: '#1E40AF', icon: Sparkles },
    réalisée: { bg: '#D1FAE5', text: '#065F46', icon: Check },
    refusée: { bg: '#FEE2E2', text: '#991B1B', icon: X }
  };

  const categoryIcons = {
    nouvelle_fonctionnalité: '🆕',
    amélioration: '✨',
    bug: '🐛',
    contenu: '📚'
  };

  return (
    <div className="p-4 md:p-8" style={{ backgroundColor: 'var(--cream)', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8 p-5 rounded-3xl shadow-lg"
             style={{ background: '#FCE8F8', border: '1px solid #F4BDE9' }}>
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
               style={{ background: 'linear-gradient(135deg, #E06AC4, #F4BDE9)' }}>
            <Lightbulb className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: '#A81F8C' }}>
              Mur des idées
            </h1>
            <p className="text-lg" style={{ color: '#C24FAE' }}>
              Proposez et votez pour vos idées préférées
            </p>
          </div>
        </div>

        {/* Formulaire de suggestion */}
        <Card className="border-0 shadow-lg mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
              <Lightbulb className="w-5 h-5" style={{ color: '#F59E0B' }} />
              Proposer une idée
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Titre de votre idée..."
                  className="text-base"
                />
              </div>

              <div>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez votre idée en détail..."
                  rows={4}
                />
              </div>

              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="nouvelle_fonctionnalité">🆕 Nouvelle fonctionnalité</SelectItem>
                      <SelectItem value="amélioration">✨ Amélioration</SelectItem>
                      <SelectItem value="bug">🐛 Bug à corriger</SelectItem>
                      <SelectItem value="contenu">📚 Contenu</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  type="submit"
                  disabled={createSuggestionMutation.isPending || !title.trim() || !description.trim()}
                  className="text-white"
                  style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                >
                  <Send className="w-4 h-4 mr-2" />
                  Envoyer
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Filtres */}
        <div className="flex gap-4 mb-6 flex-wrap">
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrer par statut" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="en_attente">En attente</SelectItem>
              <SelectItem value="en_cours">En cours</SelectItem>
              <SelectItem value="réalisée">Réalisée</SelectItem>
              <SelectItem value="refusée">Refusée</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filtrer par catégorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les catégories</SelectItem>
              <SelectItem value="nouvelle_fonctionnalité">Nouvelle fonctionnalité</SelectItem>
              <SelectItem value="amélioration">Amélioration</SelectItem>
              <SelectItem value="bug">Bug</SelectItem>
              <SelectItem value="contenu">Contenu</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Liste des suggestions */}
        {(() => {
          const activeSuggestions = filteredSuggestions.filter(s => s.status !== 'réalisée');
          const doneSuggestions = filteredSuggestions.filter(s => s.status === 'réalisée');

          const renderCard = (suggestion, grayed = false) => {
            const statusConfig = statusColors[suggestion.status] || statusColors.en_attente;
            const StatusIcon = statusConfig.icon;
            const likesCount = suggestion.likes?.length || 0;
            const hasLiked = suggestion.likes?.includes(user?.email);

            return (
              <Card key={suggestion.id} className={`border-0 shadow-md transition-all ${grayed ? 'opacity-50' : 'hover:shadow-xl'}`}
                style={grayed ? { filter: 'grayscale(1)' } : {}}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="text-2xl">{categoryIcons[suggestion.category]}</span>
                        <Badge variant="outline" style={{ borderColor: 'var(--warm-pink)', color: 'var(--warm-pink)' }}>
                          {suggestion.category.replace('_', ' ')}
                        </Badge>
                        <Badge style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}>
                          <StatusIcon className="w-3 h-3 mr-1" />
                          {suggestion.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <CardTitle className="text-xl mb-2" style={{ color: 'var(--dark-text)' }}>
                        {suggestion.title}
                      </CardTitle>
                      <p className="text-sm" style={{ color: '#6B7280' }}>
                        Par {getUserInfo(suggestion.created_by)} • {new Date(suggestion.created_date).toLocaleDateString('fr-FR')}
                      </p>
                    </div>
                    <Button
                      onClick={() => toggleLikeMutation.mutate({ id: suggestion.id, likes: suggestion.likes || [] })}
                      variant="outline"
                      className={`flex items-center gap-2 ${hasLiked ? 'border-red-500' : ''}`}
                    >
                      <Heart className={`w-5 h-5 ${hasLiked ? 'fill-red-500' : ''}`}
                        style={{ color: hasLiked ? '#EF4444' : '#9CA3AF' }} />
                      <span className="font-bold">{likesCount}</span>
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-base mb-4 whitespace-pre-wrap" style={{ color: '#374151' }}>
                    {suggestion.description}
                  </p>
                  {user?.role === 'admin' && (
                    <div className="flex gap-2 flex-wrap pt-4 border-t" style={{ borderColor: '#E5E7EB' }}>
                      <Button onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "en_cours" })}
                        disabled={suggestion.status === "en_cours"} variant="outline" size="sm"
                        className="border-blue-500 text-blue-600 hover:bg-blue-50">
                        <Sparkles className="w-4 h-4 mr-1" /> En cours
                      </Button>
                      <Button onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "réalisée" })}
                        disabled={suggestion.status === "réalisée"} variant="outline" size="sm"
                        className="border-green-500 text-green-600 hover:bg-green-50">
                        <Check className="w-4 h-4 mr-1" /> Réalisée
                      </Button>
                      <Button onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "refusée" })}
                        disabled={suggestion.status === "refusée"} variant="outline" size="sm"
                        className="border-red-500 text-red-600 hover:bg-red-50">
                        <X className="w-4 h-4 mr-1" /> Refusée
                      </Button>
                      <Button onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "en_attente" })}
                        disabled={suggestion.status === "en_attente"} variant="outline" size="sm"
                        className="border-yellow-500 text-yellow-600 hover:bg-yellow-50">
                        <Clock className="w-4 h-4 mr-1" /> En attente
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          };

          return (
            <div className="space-y-4">
              {activeSuggestions.length === 0 && doneSuggestions.length === 0 ? (
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-12 text-center">
                    <Lightbulb className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                    <p style={{ color: '#6B7280' }}>Aucune suggestion pour ces filtres</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="grid gap-4">
                    {activeSuggestions.map(s => renderCard(s, false))}
                  </div>

                  {doneSuggestions.length > 0 && (
                    <div className="mt-6">
                      <button
                        onClick={() => setShowDone(v => !v)}
                        className="flex items-center gap-2 text-sm font-semibold mb-3 px-3 py-2 rounded-xl transition-all"
                        style={{ color: '#6B7280', background: '#F3F4F6' }}
                      >
                        <Check className="w-4 h-4 text-green-500" />
                        {doneSuggestions.length} idée{doneSuggestions.length > 1 ? 's' : ''} réalisée{doneSuggestions.length > 1 ? 's' : ''}
                        <ChevronDown className={`w-4 h-4 transition-transform ${showDone ? 'rotate-180' : ''}`} />
                      </button>
                      {showDone && (
                        <div className="grid gap-4">
                          {doneSuggestions.map(s => renderCard(s, true))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          );
        })()}
      </div>

      {/* Success Dialog */}
      <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl" style={{ color: 'var(--deep-pink)' }}>
              <Check className="w-6 h-6" />
              Suggestion envoyée !
            </DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-center mb-4" style={{ color: '#374151' }}>
              Votre suggestion a bien été envoyée et est maintenant visible sur le mur des idées. 
              Les autres utilisateurs peuvent maintenant la liker ! 💡
            </p>
            <Button
              onClick={() => setShowSuccessDialog(false)}
              className="w-full text-white"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
            >
              D'accord
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}