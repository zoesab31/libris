import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, FolderOpen, Edit, Calendar } from "lucide-react";
import { toast } from "sonner";

const MONTHS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
];

export default function PALManager({ open, onOpenChange, pals }) {
  const queryClient = useQueryClient();
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;
  
  const [newPAL, setNewPAL] = useState({
    name: "",
    month: currentMonth,
    year: currentYear,
    description: "",
    icon: "📚",
  });
  const [editingPAL, setEditingPAL] = useState(null);

  const createPALMutation = useMutation({
    mutationFn: (data) => base44.entities.ReadingList.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingLists'] });
      toast.success("✅ PAL créée !");
      setNewPAL({ name: "", month: currentMonth, year: currentYear, description: "", icon: "📚" });
    },
  });

  const updatePALMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.ReadingList.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingLists'] });
      toast.success("✅ PAL modifiée !");
      setEditingPAL(null);
    },
  });

  const deletePALMutation = useMutation({
    mutationFn: (palId) => base44.entities.ReadingList.delete(palId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['readingLists'] });
      toast.success("✅ PAL supprimée !");
    },
  });

  const handleEdit = (pal) => {
    setEditingPAL({
      id: pal.id,
      name: pal.name,
      month: pal.month || currentMonth,
      year: pal.year || currentYear,
      description: pal.description || "",
      icon: pal.icon || "📚",
    });
  };

  const handleSaveEdit = () => {
    if (!editingPAL.name) return;
    const { id, ...data } = editingPAL;
    updatePALMutation.mutate({ id, data });
  };

  const handleCreate = () => {
    if (!newPAL.name) return;
    createPALMutation.mutate(newPAL);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2" style={{ color: 'var(--deep-brown)' }}>
            <FolderOpen className="w-6 h-6" />
            Gérer mes PAL (Piles À Lire)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!editingPAL ? (
            <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
              <h3 className="font-semibold mb-4" style={{ color: 'var(--deep-brown)' }}>
                Créer une nouvelle PAL
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="name">Nom de la PAL *</Label>
                    <Input
                      id="name"
                      value={newPAL.name}
                      onChange={(e) => setNewPAL({...newPAL, name: e.target.value})}
                      placeholder="Ex: PAL Novembre 2025"
                    />
                  </div>
                  <div>
                    <Label htmlFor="icon">Emoji</Label>
                    <Input
                      id="icon"
                      value={newPAL.icon}
                      onChange={(e) => setNewPAL({...newPAL, icon: e.target.value})}
                      placeholder="📚"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="month">Mois</Label>
                    <Select 
                      value={newPAL.month?.toString()} 
                      onValueChange={(value) => setNewPAL({...newPAL, month: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, idx) => (
                          <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="year">Année</Label>
                    <Input
                      id="year"
                      type="number"
                      value={newPAL.year}
                      onChange={(e) => setNewPAL({...newPAL, year: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newPAL.description}
                    onChange={(e) => setNewPAL({...newPAL, description: e.target.value})}
                    placeholder="Pour mes lectures du mois..."
                  />
                </div>

                <Button
                  onClick={handleCreate}
                  disabled={!newPAL.name || createPALMutation.isPending}
                  className="w-full font-medium"
                  style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))', color: '#000000' }}
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Créer la PAL
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-6 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
              <h3 className="font-semibold mb-4" style={{ color: 'var(--deep-brown)' }}>
                Modifier la PAL
              </h3>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-name">Nom de la PAL *</Label>
                    <Input
                      id="edit-name"
                      value={editingPAL.name}
                      onChange={(e) => setEditingPAL({...editingPAL, name: e.target.value})}
                      placeholder="Ex: PAL Novembre 2025"
                    />
                  </div>
                  <div>
                    <Label htmlFor="edit-icon">Emoji</Label>
                    <Input
                      id="edit-icon"
                      value={editingPAL.icon}
                      onChange={(e) => setEditingPAL({...editingPAL, icon: e.target.value})}
                      placeholder="📚"
                      maxLength={2}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="edit-month">Mois</Label>
                    <Select 
                      value={editingPAL.month?.toString()} 
                      onValueChange={(value) => setEditingPAL({...editingPAL, month: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {MONTHS.map((m, idx) => (
                          <SelectItem key={idx + 1} value={(idx + 1).toString()}>
                            {m}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="edit-year">Année</Label>
                    <Input
                      id="edit-year"
                      type="number"
                      value={editingPAL.year}
                      onChange={(e) => setEditingPAL({...editingPAL, year: parseInt(e.target.value)})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    value={editingPAL.description}
                    onChange={(e) => setEditingPAL({...editingPAL, description: e.target.value})}
                    placeholder="Pour mes lectures du mois..."
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setEditingPAL(null)}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    onClick={handleSaveEdit}
                    disabled={!editingPAL.name || updatePALMutation.isPending}
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
              Mes PAL ({pals.length})
            </h3>
            {pals.length > 0 ? (
              <div className="space-y-2">
                {pals.map((pal) => {
                  const monthName = pal.month ? MONTHS[pal.month - 1] : "";
                  const bookCount = pal.book_ids?.length || 0;
                  
                  return (
                    <div
                      key={pal.id}
                      className="flex items-center justify-between p-4 rounded-lg border"
                      style={{ 
                        backgroundColor: 'var(--cream)',
                        borderColor: 'var(--beige)'
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{pal.icon}</span>
                        <div>
                          <p className="font-semibold" style={{ color: 'var(--deep-brown)' }}>
                            {pal.icon} {pal.name}
                          </p>
                          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--warm-brown)' }}>
                            {monthName && pal.year && (
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3 h-3" />
                                {monthName} {pal.year}
                              </span>
                            )}
                            <span>• {bookCount} livre{bookCount > 1 ? 's' : ''}</span>
                          </div>
                          {pal.description && (
                            <p className="text-xs mt-1" style={{ color: 'var(--warm-brown)' }}>
                              {pal.description}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(pal)}
                          disabled={updatePALMutation.isPending}
                        >
                          <Edit className="w-4 h-4" style={{ color: 'var(--deep-pink)' }} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (window.confirm(`Supprimer la PAL "${pal.name}" ?`)) {
                              deletePALMutation.mutate(pal.id);
                            }
                          }}
                          disabled={deletePALMutation.isPending}
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
                Aucune PAL pour le moment
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}