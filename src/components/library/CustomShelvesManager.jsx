import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, BookMarked } from "lucide-react";
import { toast } from "sonner";

const COLORS = [
  { value: "rose", label: "Rose", bg: "#E6C7B8" },
  { value: "bleu", label: "Bleu", bg: "#A8C5DD" },
  { value: "vert", label: "Vert", bg: "#B8D4B8" },
  { value: "violet", label: "Violet", bg: "#D4B8E6" },
  { value: "orange", label: "Orange", bg: "#F4C7A3" },
  { value: "rouge", label: "Rouge", bg: "#E6B8B8" },
];

export default function CustomShelvesManager({ open, onOpenChange, shelves }) {
  const queryClient = useQueryClient();
  const [newShelf, setNewShelf] = useState({
    name: "",
    description: "",
    color: "rose",
    icon: "📚",
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomShelf.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customShelves'] });
      toast.success("Étagère créée !");
      setNewShelf({ name: "", description: "", color: "rose", icon: "📚" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.CustomShelf.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customShelves'] });
      toast.success("Étagère supprimée");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2" style={{ color: 'var(--deep-brown)' }}>
            <BookMarked className="w-6 h-6" />
            Gérer mes étagères personnalisées
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--deep-brown)' }}>
              Créer une nouvelle étagère
            </h3>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nom de l'étagère *</Label>
                  <Input
                    id="name"
                    value={newShelf.name}
                    onChange={(e) => setNewShelf({...newShelf, name: e.target.value})}
                    placeholder="Ex: Mes coups de coeur"
                  />
                </div>
                <div>
                  <Label htmlFor="icon">Emoji</Label>
                  <Input
                    id="icon"
                    value={newShelf.icon}
                    onChange={(e) => setNewShelf({...newShelf, icon: e.target.value})}
                    placeholder="📚"
                    maxLength={2}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  value={newShelf.description}
                  onChange={(e) => setNewShelf({...newShelf, description: e.target.value})}
                  placeholder="Pour ranger mes livres préférés..."
                />
              </div>

              <div>
                <Label>Couleur</Label>
                <div className="grid grid-cols-6 gap-2 mt-2">
                  {COLORS.map((color) => (
                    <button
                      key={color.value}
                      type="button"
                      onClick={() => setNewShelf({...newShelf, color: color.value})}
                      className={`aspect-square rounded-lg border-2 transition-all ${
                        newShelf.color === color.value ? 'border-gray-800 scale-110' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: color.bg }}
                      title={color.label}
                    />
                  ))}
                </div>
              </div>

              <Button
                onClick={() => createMutation.mutate(newShelf)}
                disabled={!newShelf.name || createMutation.isPending}
                className="w-full text-white font-medium"
                style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Créer l'étagère
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-4" style={{ color: 'var(--deep-brown)' }}>
              Mes étagères ({shelves.length})
            </h3>
            {shelves.length > 0 ? (
              <div className="space-y-2">
                {shelves.map((shelf) => {
                  const colorConfig = COLORS.find(c => c.value === shelf.color);
                  return (
                    <div
                      key={shelf.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                      style={{ 
                        backgroundColor: colorConfig?.bg || 'var(--cream)',
                        borderColor: 'var(--beige)'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{shelf.icon}</span>
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--deep-brown)' }}>
                            {shelf.name}
                          </p>
                          {shelf.description && (
                            <p className="text-sm" style={{ color: 'var(--warm-brown)' }}>
                              {shelf.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(shelf.id)}
                        disabled={deleteMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8" style={{ color: 'var(--warm-brown)' }}>
                Aucune étagère personnalisée pour le moment
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}