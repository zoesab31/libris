
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Users, Plus, BookOpen, Trash2, X } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import AddSharedReadingDialog from "../components/sharedreadings/AddSharedReadingDialog";
import SharedReadingCard from "../components/sharedreadings/SharedReadingCard";
import SharedReadingDetailsDialog from "../components/sharedreadings/SharedReadingDetailsDialog";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

export default function SharedReadings() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedReading, setSelectedReading] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedReadings, setSelectedReadings] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState("leave");
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: sharedReadings = [], isLoading } = useQuery({
    queryKey: ['sharedReadings'],
    queryFn: async () => {
      const readings = await base44.entities.SharedReading.filter({ created_by: user?.email }, '-created_date');
      
      // Auto-update status based on current date
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day
      
      const updatedReadings = await Promise.all(
        readings.map(async (reading) => {
          let newStatus = reading.status;
          
          if (reading.start_date && reading.end_date) {
            const startDate = new Date(reading.start_date);
            const endDate = new Date(reading.end_date);
            startDate.setHours(0, 0, 0, 0); // Normalize to start of day
            endDate.setHours(0, 0, 0, 0);   // Normalize to start of day
            
            // Determine status based on dates
            if (today < startDate) {
              newStatus = "À venir";
            } else if (today > endDate) {
              newStatus = "Terminée";
            } else {
              newStatus = "En cours";
            }
            
            // Update if status changed
            if (newStatus !== reading.status) {
              await base44.entities.SharedReading.update(reading.id, { status: newStatus });
              return { ...reading, status: newStatus }; // Return updated reading immediately
            }
          }
          
          return reading; // Return original if no change or dates are missing
        })
      );
      
      return updatedReadings;
    },
    enabled: !!user,
    staleTime: 0, // Always consider data stale to check for status updates
    refetchOnWindowFocus: true, // Refetch when window regains focus
    refetchInterval: 60000, // Refetch every minute to check for status updates
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async () => {
      const promises = selectedReadings.map(async (readingId) => {
        const reading = sharedReadings.find(r => r.id === readingId);
        if (!reading) return;

        if (deleteMode === "leave") {
          // Remove user from participants
          const newParticipants = (reading.participants || []).filter(p => p !== user?.email);
          await base44.entities.SharedReading.update(readingId, {
            participants: newParticipants
          });
        } else {
          // Delete for everyone (owner only)
          await base44.entities.SharedReading.delete(readingId);
          
          // Delete related messages
          const messages = await base44.entities.SharedReadingMessage.filter({ shared_reading_id: readingId });
          await Promise.all(messages.map(m => base44.entities.SharedReadingMessage.delete(m.id)));
        }
      });

      await Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadings'] });
      toast.success(`${selectedReadings.length} lecture${selectedReadings.length > 1 ? 's' : ''} supprimée${selectedReadings.length > 1 ? 's' : ''}`);
      setSelectedReadings([]);
      setSelectionMode(false);
      setShowDeleteConfirm(false);
    },
    onError: () => {
      toast.error("Erreur lors de la suppression");
    }
  });

  const toggleSelection = (readingId) => {
    setSelectedReadings(prev => 
      prev.includes(readingId) 
        ? prev.filter(id => id !== readingId)
        : [...prev, readingId]
    );
  };

  const handleDelete = () => {
    if (selectedReadings.length === 0) return;
    setShowDeleteConfirm(true);
  };

  const ongoingReadings = sharedReadings.filter(r => r.status === "En cours");
  const upcomingReadings = sharedReadings.filter(r => r.status === "À venir");
  const completedReadings = sharedReadings.filter(r => r.status === "Terminée");

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
              <Users className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Lectures Communes
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                {sharedReadings.length} lecture{sharedReadings.length > 1 ? 's' : ''} partagée{sharedReadings.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          
          <div className="flex gap-3">
            {!selectionMode ? (
              <>
                {sharedReadings.length > 0 && (
                  <Button
                    variant="outline"
                    onClick={() => setSelectionMode(true)}
                    style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}
                  >
                    Sélectionner
                  </Button>
                )}
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  className="shadow-lg text-white font-medium px-6 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
                  <Plus className="w-5 h-5 mr-2" />
                  Nouvelle lecture commune
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedReadings([]);
                  }}
                >
                  Annuler
                </Button>
                {selectedReadings.length > 0 && (
                  <Button
                    onClick={handleDelete}
                    className="shadow-lg text-white font-medium"
                    style={{ background: 'linear-gradient(135deg, #FF1744, #F50057)' }}
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Supprimer {selectedReadings.length}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        {ongoingReadings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
              <BookOpen className="w-5 h-5" />
              En cours ({ongoingReadings.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {ongoingReadings.map((reading) => {
                const book = allBooks.find(b => b.id === reading.book_id);
                return (
                  <div key={reading.id} className="relative">
                    {selectionMode && (
                      <div className="absolute top-4 left-4 z-10">
                        <Checkbox
                          checked={selectedReadings.includes(reading.id)}
                          onCheckedChange={() => toggleSelection(reading.id)}
                          className="bg-white border-2"
                        />
                      </div>
                    )}
                    <SharedReadingCard 
                      reading={reading}
                      book={book}
                      onClick={() => !selectionMode && setSelectedReading(reading)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {upcomingReadings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
              À venir ({upcomingReadings.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {upcomingReadings.map((reading) => {
                const book = allBooks.find(b => b.id === reading.book_id);
                return (
                  <div key={reading.id} className="relative">
                    {selectionMode && (
                      <div className="absolute top-4 left-4 z-10">
                        <Checkbox
                          checked={selectedReadings.includes(reading.id)}
                          onCheckedChange={() => toggleSelection(reading.id)}
                          className="bg-white border-2"
                        />
                      </div>
                    )}
                    <SharedReadingCard 
                      reading={reading}
                      book={book}
                      onClick={() => !selectionMode && setSelectedReading(reading)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {completedReadings.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
              Terminées ({completedReadings.length})
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {completedReadings.map((reading) => {
                const book = allBooks.find(b => b.id === reading.book_id);
                return (
                  <div key={reading.id} className="relative">
                    {selectionMode && (
                      <div className="absolute top-4 left-4 z-10">
                        <Checkbox
                          checked={selectedReadings.includes(reading.id)}
                          onCheckedChange={() => toggleSelection(reading.id)}
                          className="bg-white border-2"
                        />
                      </div>
                    )}
                    <SharedReadingCard 
                      reading={reading}
                      book={book}
                      onClick={() => !selectionMode && setSelectedReading(reading)}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {sharedReadings.length === 0 && (
          <div className="text-center py-20">
            <Users className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              Aucune lecture commune
            </h3>
            <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
              Créez votre première lecture commune avec vos amies
            </p>
          </div>
        )}

        <AddSharedReadingDialog 
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          books={allBooks}
        />

        {selectedReading && (
          <SharedReadingDetailsDialog
            reading={selectedReading}
            book={allBooks.find(b => b.id === selectedReading.book_id)}
            open={!!selectedReading}
            onOpenChange={(open) => !open && setSelectedReading(null)}
          />
        )}

        {/* Delete Confirmation Dialog */}
        <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <DialogContent className="bg-white border border-neutral-200 rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-neutral-900">
                Supprimer {selectedReadings.length} lecture{selectedReadings.length > 1 ? 's' : ''} ?
              </DialogTitle>
              <DialogDescription className="text-neutral-600">
                Choisissez comment supprimer ces lectures communes
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <RadioGroup value={deleteMode} onValueChange={setDeleteMode}>
                <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-neutral-200 hover:border-rose-300 transition-colors">
                  <RadioGroupItem value="leave" id="leave" />
                  <div className="flex-1">
                    <Label htmlFor="leave" className="font-medium text-neutral-900 cursor-pointer">
                      Me retirer seulement (recommandé)
                    </Label>
                    <p className="text-sm text-neutral-500 mt-1">
                      Les autres participantes gardent accès à la lecture
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3 p-4 rounded-lg border-2 border-neutral-200 hover:border-rose-300 transition-colors">
                  <RadioGroupItem value="delete_all" id="delete_all" />
                  <div className="flex-1">
                    <Label htmlFor="delete_all" className="font-medium text-neutral-900 cursor-pointer">
                      Supprimer pour tout le monde
                    </Label>
                    <p className="text-sm text-neutral-500 mt-1">
                      Archive la lecture et ses discussions pour toutes les participantes
                    </p>
                  </div>
                </div>
              </RadioGroup>

              <div className="flex gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1"
                >
                  Annuler
                </Button>
                <Button
                  onClick={() => bulkDeleteMutation.mutate()}
                  disabled={bulkDeleteMutation.isPending}
                  className="flex-1 text-white"
                  style={{ background: 'linear-gradient(135deg, #FF1744, #F50057)' }}
                >
                  {bulkDeleteMutation.isPending ? "Suppression..." : "Confirmer"}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
