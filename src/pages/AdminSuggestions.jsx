import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Check, X, Clock, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminSuggestions() {
  const [user, setUser] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.role !== 'admin') {
        window.location.href = '/';
      }
    }).catch(() => {});
  }, []);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['suggestions'],
    queryFn: () => base44.entities.Suggestion.list('-created_date'),
    enabled: user?.role === 'admin',
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: user?.role === 'admin',
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Suggestion.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suggestions'] });
      toast.success("Statut mis à jour");
    },
  });

  const getUserInfo = (email) => {
    const userInfo = allUsers.find(u => u.email === email);
    return userInfo?.display_name || userInfo?.full_name || email.split('@')[0];
  };

  const filteredSuggestions = suggestions.filter(s => {
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

  if (!user || user.role !== 'admin') {
    return (
      <div className="p-8 text-center">
        <AlertCircle className="w-16 h-16 mx-auto mb-4" style={{ color: '#EF4444' }} />
        <p className="text-lg font-bold" style={{ color: '#1F2937' }}>
          Accès réservé aux administrateurs
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8" style={{ backgroundColor: 'var(--cream)', minHeight: '100vh' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
               style={{ background: 'linear-gradient(135deg, var(--app-primary), var(--app-secondary))' }}>
            <Lightbulb className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--app-primary)' }}>
              Suggestions des utilisateurs
            </h1>
            <p className="text-lg" style={{ color: 'var(--app-secondary)' }}>
              {suggestions.length} suggestion{suggestions.length > 1 ? 's' : ''} au total
            </p>
          </div>
        </div>

        {/* Filters */}
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

        {/* Suggestions grid */}
        <div className="grid gap-4">
          {filteredSuggestions.length === 0 ? (
            <Card className="border-0 shadow-lg">
              <CardContent className="p-12 text-center">
                <Lightbulb className="w-16 h-16 mx-auto mb-4 opacity-20" 
                          style={{ color: 'var(--app-primary)' }} />
                <p style={{ color: '#6B7280' }}>
                  Aucune suggestion pour ces filtres
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredSuggestions.map(suggestion => {
              const statusConfig = statusColors[suggestion.status] || statusColors.en_attente;
              const StatusIcon = statusConfig.icon;

              return (
                <Card key={suggestion.id} className="border-0 shadow-lg hover:shadow-xl transition-all">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className="text-2xl">{categoryIcons[suggestion.category]}</span>
                          <Badge variant="outline" style={{ borderColor: 'var(--app-primary)', color: 'var(--app-primary)' }}>
                            {suggestion.category.replace('_', ' ')}
                          </Badge>
                          <Badge style={{ backgroundColor: statusConfig.bg, color: statusConfig.text }}>
                            <StatusIcon className="w-3 h-3 mr-1" />
                            {suggestion.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <CardTitle className="text-xl" style={{ color: 'var(--app-primary)' }}>
                          {suggestion.title}
                        </CardTitle>
                        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                          Par {getUserInfo(suggestion.created_by)} • {new Date(suggestion.created_date).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-base mb-4 whitespace-pre-wrap" style={{ color: '#374151' }}>
                      {suggestion.description}
                    </p>

                    <div className="flex gap-2 flex-wrap">
                      <Button
                        onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "en_cours" })}
                        disabled={suggestion.status === "en_cours"}
                        variant="outline"
                        size="sm"
                        className="border-blue-500 text-blue-600 hover:bg-blue-50"
                      >
                        <Sparkles className="w-4 h-4 mr-1" />
                        En cours
                      </Button>
                      <Button
                        onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "réalisée" })}
                        disabled={suggestion.status === "réalisée"}
                        variant="outline"
                        size="sm"
                        className="border-green-500 text-green-600 hover:bg-green-50"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Réalisée
                      </Button>
                      <Button
                        onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "refusée" })}
                        disabled={suggestion.status === "refusée"}
                        variant="outline"
                        size="sm"
                        className="border-red-500 text-red-600 hover:bg-red-50"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Refusée
                      </Button>
                      <Button
                        onClick={() => updateStatusMutation.mutate({ id: suggestion.id, status: "en_attente" })}
                        disabled={suggestion.status === "en_attente"}
                        variant="outline"
                        size="sm"
                        className="border-yellow-500 text-yellow-600 hover:bg-yellow-50"
                      >
                        <Clock className="w-4 h-4 mr-1" />
                        En attente
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}