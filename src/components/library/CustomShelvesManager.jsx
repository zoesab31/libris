
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, BookMarked, Edit } from "lucide-react";
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
  const [editingShelf, setEditingShelf] = useState(null);

  const createShelfMutation = useMutation({
    mutationFn: (data) => base44.entities.CustomShelf.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customShelves'] });
      toast.success("✅ Étagère créée !");
      setNewShelf({ name: "", description: "", color: "rose", icon: "📚" });
    },
  });

  const updateShelfMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CustomShelf.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customShelves'] });
      toast.success("✅ Étagère modifiée !");
      setEditingShelf(null);
    },
  });

  const deleteShelfMutation = useMutation({
    mutationFn: (shelfId) => base44.entities.CustomShelf.delete(shelfId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customShelves'] });
      toast.success("✅ Étagère supprimée !");
    },
  });

  const handleEdit = (shelf) => {
    setEditingShelf({
      id: shelf.id,
      name: shelf.name,
      description: shelf.description || "",
      color: shelf.color,
      icon: shelf.icon,
    });
  };

  const handleSaveEdit = () => {
    if (!editingShelf.name) return;
    const { id, ...data } = editingShelf;
    updateShelfMutation.mutate({ id, data });
  };

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
          {!editingShelf ? (
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
                  onClick={() => createShelfMutation.mutate(newShelf)}
                  disabled={!newShelf.name || createShelfMutation.isPending}
                  className="w-full font-medium"
                  style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))', color: '#000000' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer l'étagère
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
              <h3 className="font-semibold mb-4" style={{ color: 'var(--deep-brown)' }}>
                Modifier l'étagère
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Nom de l'étagère *</Label>
                    <Input
                      id="edit-name"
                      value={editingShelf.name}
                      onChange={(e) => setEditingShelf({...editingShelf, name: e.target.value})}
                      placeholder="Ex: Mes coups de coeur"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-icon">Emoji</Label>
                    <Input
                      id="edit-icon"
                      value={editingShelf.icon}
                      onChange={(e) => setEditingShelf({...editingShelf, icon: e.target.value})}
                      placeholder="📚"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={editingShelf.description}
                    onChange={(e) => setEditingShelf({...editingShelf, description: e.target.value})}
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
                        onClick={() => setEditingShelf({...editingShelf, color: color.value})}
                        className={`aspect-square rounded-lg border-2 transition-all ${
                          editingShelf.color === color.value ? 'border-gray-800 scale-110' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: color.bg }}
                        title={color.label}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditingShelf(null)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={!editingShelf.name || updateShelfMutation.isPending}
                    className="flex-1 font-medium"
                    style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))', color: '#000000' }}
                  >
                    Enregistrer
                  </Button>
                </div>
              </div>
            </div>
          )}

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
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(shelf)}
                          disabled={updateShelfMutation.isPending}
                        >
                          <Edit className="w-4 h-4" style={{ color: 'var(--deep-pink)' }} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => deleteShelfMutation.mutate(shelf.id)}
                          disabled={deleteShelfMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4 text-red-500" />
                        </Button>
                      </div>
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
