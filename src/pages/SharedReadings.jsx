import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Users, Plus, BookOpen, Trash2, X, Search, Check } from "lucide-react";
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

// New imports for Tabs and Wishlist features
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";


export default function SharedReadings() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showWishlistDialog, setShowWishlistDialog] = useState(false); // New state
  const [selectedReading, setSelectedReading] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedReadings, setSelectedReadings] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteMode, setDeleteMode] = useState("leave");
  const [activeTab, setActiveTab] = useState("active"); // New state
  const [selectedWishlist, setSelectedWishlist] = useState(null); // New state for editing wishlist
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: sharedReadings = [], isLoading } = useQuery({
    queryKey: ['sharedReadings'],
    queryFn: async () => {
      // Filter for readings created by user OR where user is a participant
      const createdReadings = await base44.entities.SharedReading.filter({ created_by: user?.email }, '-created_date');
      const participatedReadings = await base44.entities.SharedReading.filter({ participants: user?.email }, '-created_date');

      // Combine and deduplicate
      const allUserReadings = [...createdReadings, ...participatedReadings];
      const uniqueReadings = Array.from(new Map(allUserReadings.map(reading => [reading.id, reading])).values());
      
      // Auto-update status based on current date
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Normalize to start of day
      
      const updatedReadings = await Promise.all(
        uniqueReadings.map(async (reading) => {
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

  const { data: wishlists = [] } = useQuery({
    queryKey: ['sharedReadingWishlists'],
    queryFn: async () => {
      if (!user?.email) return [];
      const createdWishlists = await base44.entities.SharedReadingWishlist.filter({ created_by: user.email }, '-created_date');
      const sharedWishlists = await base44.entities.SharedReadingWishlist.filter({ shared_with: user.email }, '-created_date');
      const pendingWishlists = await base44.entities.SharedReadingWishlist.filter({ pending_invitations: user.email }, '-created_date');

      const allWishlists = [...createdWishlists, ...sharedWishlists, ...pendingWishlists];
      return Array.from(new Map(allWishlists.map(w => [w.id, w])).values());
    },
    enabled: !!user,
  });

  // Separate pending invitations from regular wishlists
  const pendingInvitations = wishlists.filter(w => 
    w.pending_invitations?.includes(user?.email)
  );
  
  const myWishlists = wishlists.filter(w => 
    !w.pending_invitations?.includes(user?.email) && (w.created_by === user?.email || w.shared_with?.includes(user?.email))
  );

  // Mutations for accepting/rejecting invitations
  const acceptInvitationMutation = useMutation({
    mutationFn: async (wishlistId) => {
      const wishlist = wishlists.find(w => w.id === wishlistId);
      if (!wishlist) return;

      const newSharedWith = [...(wishlist.shared_with || []), user.email];
      const newPendingInvitations = (wishlist.pending_invitations || []).filter(email => email !== user.email);

      await base44.entities.SharedReadingWishlist.update(wishlistId, {
        shared_with: newSharedWith,
        pending_invitations: newPendingInvitations
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadingWishlists'] });
      toast.success("✅ Invitation acceptée ! Vous pouvez maintenant modifier cette liste.");
    },
    onError: () => {
      toast.error("Erreur lors de l'acceptation de l'invitation.");
    }
  });

  const rejectInvitationMutation = useMutation({
    mutationFn: async (wishlistId) => {
      const wishlist = wishlists.find(w => w.id === wishlistId);
      if (!wishlist) return;

      const newPendingInvitations = (wishlist.pending_invitations || []).filter(email => email !== user.email);

      await base44.entities.SharedReadingWishlist.update(wishlistId, {
        pending_invitations: newPendingInvitations
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadingWishlists'] });
      toast.success("❌ Invitation refusée.");
    },
    onError: () => {
      toast.error("Erreur lors du refus de l'invitation.");
    }
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
    <div className="p-4 md:p-8 min-h-screen" style={{ background: 'linear-gradient(160deg, #FFF8FC 0%, #FEF3F9 40%, #F9F0FA 70%, #F5F0FF 100%)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4 p-5 rounded-3xl shadow-lg"
             style={{ background: 'rgba(255,255,255,0.85)', border: '1px solid rgba(255,105,180,0.15)' }}>
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
              <Users className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-extrabold" style={{ color: '#2D1F3F' }}>
                Lectures Communes
              </h1>
              <p className="text-sm font-medium" style={{ color: '#A78BBA' }}>
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

        {/* Tabs for Active Readings and Wishlists */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
          <TabsList className="bg-white shadow-md p-1 rounded-xl border-0 w-full">
            <TabsTrigger
              value="active"
              className="flex-1 rounded-lg font-bold data-[state=active]:text-white"
              style={activeTab === "active" ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                color: '#FFFFFF'
              } : { color: '#000000' }}
            >
              📚 Lectures actives ({sharedReadings.length})
            </TabsTrigger>
            <TabsTrigger
              value="wishlist"
              className="flex-1 rounded-lg font-bold data-[state=active]:text-white relative"
              style={activeTab === "wishlist" ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                color: '#FFFFFF'
              } : { color: '#000000' }}
            >
              💭 Listes de souhaits ({myWishlists.length})
              {pendingInvitations.length > 0 && (
                <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white"
                      style={{ backgroundColor: '#FF0000' }}>
                  {pendingInvitations.length}
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="active">
            {ongoingReadings.length > 0 && (
              <div className="mb-8 mt-6">
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
              <div className="mb-8 mt-6">
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
              <div className="mb-8 mt-6">
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
          </TabsContent>

          <TabsContent value="wishlist">
            <div className="flex justify-end mb-6 mt-6">
              <Button 
                onClick={() => setShowWishlistDialog(true)}
                className="shadow-lg text-white font-medium px-6 rounded-xl"
                style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
                <Plus className="w-5 h-5 mr-2" />
                Nouvelle liste de souhaits
              </Button>
            </div>

            {/* Pending Invitations Section */}
            {pendingInvitations.length > 0 && (
              <div className="mb-8">
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                  ✉️ Invitations en attente ({pendingInvitations.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {pendingInvitations.map((wishlist) => (
                    <Card key={wishlist.id} className="shadow-lg border-0 overflow-hidden"
                          style={{ backgroundColor: 'white', borderLeft: '4px solid var(--warm-pink)' }}>
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-3xl">{wishlist.icon || '📚'}</span>
                            <div>
                              <h3 className="font-bold text-lg" style={{ color: 'var(--dark-text)' }}>
                                {wishlist.title}
                              </h3>
                              {wishlist.description && (
                                <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                                  {wishlist.description}
                                </p>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 mb-4">
                          <BookOpen className="w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
                          <p className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                            {wishlist.book_ids?.length || 0} livre{(wishlist.book_ids?.length || 0) > 1 ? 's' : ''}
                          </p>
                        </div>

                        <p className="text-xs mb-4 p-2 rounded-lg" 
                           style={{ backgroundColor: 'var(--cream)', color: 'var(--warm-pink)' }}>
                          💌 Invitation de la part de {wishlist.created_by?.split('@')[0]}
                        </p>

                        <div className="flex gap-2">
                          <Button
                            onClick={() => acceptInvitationMutation.mutate(wishlist.id)}
                            disabled={acceptInvitationMutation.isPending}
                            className="flex-1 text-white font-medium"
                            style={{ background: 'linear-gradient(135deg, #10B981, #34D399)' }}
                          >
                            <Check className="w-4 h-4 mr-2" />
                            Accepter
                          </Button>
                          <Button
                            onClick={() => rejectInvitationMutation.mutate(wishlist.id)}
                            disabled={rejectInvitationMutation.isPending}
                            variant="outline"
                            className="flex-1 text-red-600 border-red-300 hover:bg-red-50"
                          >
                            <X className="w-4 h-4 mr-2" />
                            Refuser
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* My Wishlists Section */}
            {myWishlists.length > 0 && (
              <div>
                <h2 className="text-xl font-bold mb-4 flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
                  📚 Mes listes ({myWishlists.length})
                </h2>
                <div className="grid md:grid-cols-2 gap-4">
                  {myWishlists.map((wishlist) => (
                    <WishlistCard
                      key={wishlist.id}
                      wishlist={wishlist}
                      books={allBooks}
                      onEdit={(w) => setSelectedWishlist(w)}
                      userEmail={user?.email}
                    />
                  ))}
                </div>
              </div>
            )}

            {myWishlists.length === 0 && pendingInvitations.length === 0 && (
              <div className="text-center py-20">
                <BookOpen className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  Aucune liste de souhaits
                </h3>
                <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
                  Créez des listes de livres à lire avec vos amies
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <AddSharedReadingDialog 
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          books={allBooks}
        />

        <AddWishlistDialog
          open={showWishlistDialog}
          onOpenChange={setShowWishlistDialog}
          user={user}
        />

        {selectedReading && (
          <SharedReadingDetailsDialog
            reading={selectedReading}
            book={allBooks.find(b => b.id === selectedReading.book_id)}
            open={!!selectedReading}
            onOpenChange={(open) => !open && setSelectedReading(null)}
          />
        )}

        {selectedWishlist && (
          <WishlistDetailsDialog
            wishlist={selectedWishlist}
            open={!!selectedWishlist}
            onOpenChange={(open) => !open && setSelectedWishlist(null)}
            user={user}
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

// Wishlist Card Component
function WishlistCard({ wishlist, books, onEdit, userEmail }) {
  const wishlistBooks = books.filter(b => wishlist.book_ids?.includes(b.id));
  const totalCollaborators = (wishlist.shared_with?.length || 0) + (wishlist.pending_invitations?.length || 0);
  const isOwner = wishlist.created_by === userEmail;
  
  return (
    <Card className="shadow-lg border-0 transition-all hover:shadow-xl hover:-translate-y-1 cursor-pointer"
          style={{ backgroundColor: 'white' }}
          onClick={() => onEdit(wishlist)}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-2">
            <span className="text-3xl">{wishlist.icon || '📚'}</span>
            <div>
              <h3 className="font-bold text-lg" style={{ color: 'var(--dark-text)' }}>
                {wishlist.title}
              </h3>
              {wishlist.description && (
                <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                  {wishlist.description}
                </p>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 items-end">
            {wishlist.is_public && (
              <span className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: 'var(--beige)', color: 'var(--deep-pink)' }}>
                Publique
              </span>
            )}
            {!isOwner && (
              <span className="px-2 py-1 rounded-full text-xs font-medium"
                    style={{ backgroundColor: '#E6B3E8', color: 'white' }}>
                Partagée
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
            {wishlistBooks.length} livre{wishlistBooks.length > 1 ? 's' : ''}
          </p>
        </div>

        {totalCollaborators > 0 && (
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
            <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
              {wishlist.shared_with?.length || 0} collaborat{(wishlist.shared_with?.length || 0) > 1 ? 'rices' : 'rice'}
              {(wishlist.pending_invitations?.length || 0) > 0 && ` • ${wishlist.pending_invitations.length} en attente`}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Add Wishlist Dialog Component
function AddWishlistDialog({ open, onOpenChange, user }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("📚");
  const [isPublic, setIsPublic] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooks, setSelectedBooks] = useState([]);
  const queryClient = useQueryClient();

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
    enabled: open,
  });

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user && open,
  });

  // Filter books from library
  const myLibraryBooks = useMemo(() => {
    if (!user) return [];
    const myBookIds = myBooks.map(ub => ub.book_id);
    return allBooks.filter(book => myBookIds.includes(book.id));
  }, [allBooks, myBooks, user]);

  // Filter books by search query
  const filteredBooks = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase().trim();
    return myLibraryBooks
      .filter(book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [searchQuery, myLibraryBooks]);

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SharedReadingWishlist.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadingWishlists'] });
      toast.success("✨ Liste créée !");
      handleClose();
    },
    onError: (error) => {
      console.error("Error creating wishlist:", error);
      toast.error("Erreur lors de la création de la liste.");
    },
  });

  const handleClose = () => {
    setTitle("");
    setDescription("");
    setIcon("📚");
    setIsPublic(false);
    setSearchQuery("");
    setSelectedBooks([]);
    onOpenChange(false);
  };

  const toggleBookSelection = (bookId) => {
    setSelectedBooks(prev =>
      prev.includes(bookId)
        ? prev.filter(id => id !== bookId)
        : [...prev, bookId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Le titre est requis.");
      return;
    }
    createMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      icon,
      is_public: isPublic,
      book_ids: selectedBooks,
      shared_with: [],
      pending_invitations: [],
      created_by: user?.email,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--dark-text)' }}>
            💭 Nouvelle liste de souhaits
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div>
            <Label htmlFor="title">Titre *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Lectures d'été 2025"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez cette liste..."
              rows={3}
            />
          </div>

          <div>
            <Label htmlFor="icon">Emoji</Label>
            <Select value={icon} onValueChange={setIcon}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["📚", "💭", "🌸", "☀️", "❄️", "🍂", "🌺", "💕", "✨", "🎀"].map(e => (
                  <SelectItem key={e} value={e}>{e}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Book search and selection */}
          <div>
            <Label>Ajouter des livres à la liste</Label>
            <p className="text-xs mb-2" style={{ color: 'var(--warm-pink)' }}>
              Recherchez et sélectionnez des livres de votre bibliothèque
            </p>
            
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                      style={{ color: 'var(--warm-pink)' }} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un livre par titre ou auteur..."
                className="pl-10"
              />
            </div>

            {/* Selected books */}
            {selectedBooks.length > 0 && (
              <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--cream)' }}>
                <p className="text-sm font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  {selectedBooks.length} livre{selectedBooks.length > 1 ? 's' : ''} sélectionné{selectedBooks.length > 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedBooks.map((bookId) => {
                    const book = allBooks.find(b => b.id === bookId);
                    if (!book) return null;
                    return (
                      <div
                        key={bookId}
                        className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: 'var(--soft-pink)' }}
                      >
                        <span>{book.title}</span>
                        <button
                          type="button"
                          onClick={() => toggleBookSelection(bookId)}
                          className="hover:opacity-70"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Search results */}
            {searchQuery.length >= 2 && filteredBooks.length > 0 && (
              <div className="border rounded-lg max-h-64 overflow-y-auto" 
                   style={{ borderColor: 'var(--beige)' }}>
                {filteredBooks.map((book) => {
                  const isSelected = selectedBooks.includes(book.id);
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => toggleBookSelection(book.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-pink-50 transition-colors text-left border-b last:border-b-0"
                      style={{
                        backgroundColor: isSelected ? 'var(--cream)' : 'white',
                        borderColor: 'var(--beige)'
                      }}
                    >
                      {/* Book cover */}
                      <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0" 
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} 
                               className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-5 h-5" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                      </div>
                      
                      {/* Book info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1" 
                           style={{ color: 'var(--dark-text)' }}>
                          {book.title}
                        </p>
                        <p className="text-xs line-clamp-1" 
                           style={{ color: 'var(--warm-pink)' }}>
                          {book.author}
                        </p>
                      </div>

                      {/* Selection indicator */}
                      {isSelected && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                             style={{ backgroundColor: 'var(--deep-pink)' }}>
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {searchQuery.length >= 2 && filteredBooks.length === 0 && (
              <p className="text-center py-4 text-sm" style={{ color: 'var(--warm-pink)' }}>
                Aucun livre trouvé dans votre bibliothèque
              </p>
            )}
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg"
               style={{ backgroundColor: 'var(--cream)' }}>
            <Label htmlFor="public">Liste publique (visible par toutes vos amies)</Label>
            <Switch
              id="public"
              checked={isPublic}
              onCheckedChange={setIsPublic}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!title.trim() || createMutation.isPending}
              className="text-white font-medium"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
            >
              {createMutation.isPending ? "Création..." : "Créer"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// WishlistDetailsDialog Component
function WishlistDetailsDialog({ wishlist, open, onOpenChange, user }) {
  const [title, setTitle] = useState(wishlist?.title || "");
  const [description, setDescription] = useState(wishlist?.description || "");
  const [icon, setIcon] = useState(wishlist?.icon || "📚");
  const [isPublic, setIsPublic] = useState(wishlist?.is_public || false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedBooks, setSelectedBooks] = useState(wishlist?.book_ids || []);
  const [friendSearchQuery, setFriendSearchQuery] = useState("");
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const queryClient = useQueryClient();

  useEffect(() => {
    if (wishlist) {
      setTitle(wishlist.title || "");
      setDescription(wishlist.description || "");
      setIcon(wishlist.icon || "📚");
      setIsPublic(wishlist.is_public || false);
      setSelectedBooks(wishlist.book_ids || []);
      setSearchQuery(""); // Clear search query when wishlist changes
    }
  }, [wishlist]);

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
    enabled: open,
  });

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user && open,
  });

  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ 
      created_by: user?.email,
      status: "Acceptée"
    }),
    enabled: !!user && open,
  });

  const myLibraryBooks = useMemo(() => {
    if (!user) return [];
    const myBookIds = myBooks.map(ub => ub.book_id);
    return allBooks.filter(book => myBookIds.includes(book.id));
  }, [allBooks, myBooks, user]);

  const filteredBooks = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    const query = searchQuery.toLowerCase().trim();
    return myLibraryBooks
      .filter(book =>
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
      )
      .slice(0, 10);
  }, [searchQuery, myLibraryBooks]);

  const filteredFriends = useMemo(() => {
    // Show all eligible friends if search query is short or empty
    let friendsToFilter = myFriends.filter(friend =>
      !wishlist.shared_with?.includes(friend.friend_email) &&
      !wishlist.pending_invitations?.includes(friend.friend_email)
    );

    if (!friendSearchQuery || friendSearchQuery.length < 2) return friendsToFilter;

    const query = friendSearchQuery.toLowerCase().trim();
    return friendsToFilter.filter(friend =>
      friend.friend_name?.toLowerCase().includes(query) ||
      friend.friend_email?.toLowerCase().includes(query)
    );
  }, [friendSearchQuery, myFriends, wishlist]);

  const updateMutation = useMutation({
    mutationFn: (data) => base44.entities.SharedReadingWishlist.update(wishlist.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadingWishlists'] });
      toast.success("✨ Liste mise à jour !");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error updating wishlist:", error);
      toast.error("Erreur lors de la mise à jour de la liste.");
    },
  });

  // Separate mutation for books only (for collaborators)
  const updateBooksMutation = useMutation({
    mutationFn: (bookIds) => base44.entities.SharedReadingWishlist.update(wishlist.id, { book_ids: bookIds }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadingWishlists'] });
      toast.success("📚 Livres mis à jour !");
    },
    onError: (error) => {
      console.error("Error updating books:", error);
      toast.error("Erreur lors de la mise à jour des livres.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => base44.entities.SharedReadingWishlist.delete(wishlist.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadingWishlists'] });
      toast.success("✅ Liste supprimée !");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error deleting wishlist:", error);
      toast.error("Erreur lors de la suppression.");
    },
  });

  const inviteFriendMutation = useMutation({
    mutationFn: async (friendEmail) => {
      const currentWishlist = queryClient.getQueryData(['sharedReadingWishlists'])?.find(w => w.id === wishlist.id) || wishlist;
      const pendingInvites = currentWishlist.pending_invitations || [];
      if (pendingInvites.includes(friendEmail)) {
        throw new Error("Cette amie a déjà été invitée");
      }
      
      // Update wishlist with new invitation
      await base44.entities.SharedReadingWishlist.update(currentWishlist.id, {
        pending_invitations: [...pendingInvites, friendEmail]
      });
      
      // Create notification for invited friend
      const friend = myFriends.find(f => f.friend_email === friendEmail);
      await base44.entities.Notification.create({
        type: "wishlist_invitation",
        title: "📚 Nouvelle invitation",
        message: `${user?.full_name || user?.email} vous invite à collaborer sur la liste "${wishlist.title}"`,
        link_type: "wishlist",
        link_id: wishlist.id,
        is_read: false,
        from_user: user?.email,
        created_by: friendEmail
      });
      
      return true;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadingWishlists'] });
      toast.success("✉️ Invitation envoyée !");
      setFriendSearchQuery("");
    },
    onError: (error) => {
      toast.error(error.message || "Erreur lors de l'envoi de l'invitation.");
    }
  });

  const removeCollaboratorMutation = useMutation({
    mutationFn: async (email) => {
      const currentWishlist = queryClient.getQueryData(['sharedReadingWishlists'])?.find(w => w.id === wishlist.id) || wishlist;
      const sharedWith = (currentWishlist.shared_with || []).filter(e => e !== email);
      const pendingInvites = (currentWishlist.pending_invitations || []).filter(e => e !== email);
      return base44.entities.SharedReadingWishlist.update(currentWishlist.id, {
        shared_with: sharedWith,
        pending_invitations: pendingInvites
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadingWishlists'] });
      toast.success("Collaborateur retiré");
    },
    onError: () => {
      toast.error("Erreur lors du retrait du collaborateur.");
    }
  });

  const toggleBookSelection = (bookId) => {
    const newSelectedBooks = selectedBooks.includes(bookId)
      ? selectedBooks.filter(id => id !== bookId)
      : [...selectedBooks, bookId];
    
    setSelectedBooks(newSelectedBooks);
    
    // If user is a collaborator (not owner), update immediately
    if (canEditBooks && !canEditSettings) {
      updateBooksMutation.mutate(newSelectedBooks);
    }
  };

  const handleUpdate = (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Le titre est requis.");
      return;
    }
    updateMutation.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      icon,
      is_public: isPublic,
      book_ids: selectedBooks,
    });
  };

  const handleDelete = () => {
    if (window.confirm(`Êtes-vous sûre de vouloir supprimer la liste "${wishlist.title}" ?`)) {
      deleteMutation.mutate();
    }
  };

  const isOwner = wishlist.created_by === user?.email;
  const isCollaborator = wishlist.shared_with?.includes(user?.email) || isOwner;
  const canEditBooks = isCollaborator; // Collaborators and owner can edit books
  const canEditSettings = isOwner; // Only owner can edit settings (title, desc, icon, public, collaborators)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center justify-between" style={{ color: 'var(--dark-text)' }}>
            <span>💭 {canEditSettings ? 'Modifier la liste' : 'Liste de souhaits'}</span>
            {canEditSettings && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                disabled={deleteMutation.isPending}
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleUpdate} className="space-y-6 py-4">
          {/* Title, description, icon, public - only for owner */}
          {canEditSettings && (
            <>
              <div>
                <Label htmlFor="title">Titre *</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Lectures d'été 2025"
                  required
                />
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez cette liste..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="icon">Emoji</Label>
                <Select value={icon} onValueChange={setIcon}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["📚", "💭", "🌸", "☀️", "❄️", "🍂", "🌺", "💕", "✨", "🎀"].map(e => (
                      <SelectItem key={e} value={e}>{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {/* Display title and description for collaborators (read-only) */}
          {!canEditSettings && (
            <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-3xl">{wishlist.icon}</span>
                <h3 className="text-xl font-bold" style={{ color: 'var(--dark-text)' }}>
                  {wishlist.title}
                </h3>
              </div>
              {wishlist.description && (
                <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                  {wishlist.description}
                </p>
              )}
              <p className="text-xs mt-2" style={{ color: 'var(--warm-brown)' }}>
                📝 Créée par {wishlist.created_by?.split('@')[0]}
              </p>
            </div>
          )}

          {/* Collaborators section - only for owner */}
          {canEditSettings && (
            <div className="border-t pt-4" style={{ borderColor: 'var(--beige)' }}>
              <div className="flex items-center justify-between mb-3">
                <Label>Collaborateurs ({(wishlist.shared_with?.length || 0) + (wishlist.pending_invitations?.length || 0)})</Label>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => setShowInviteDialog(true)}
                  style={{ backgroundColor: 'var(--deep-pink)', color: 'white' }}
                >
                  <Users className="w-4 h-4 mr-2" />
                  Inviter une amie
                </Button>
              </div>

              {/* List of collaborators */}
              <div className="space-y-2">
                {(wishlist.shared_with || []).map((email) => {
                  const friend = myFriends.find(f => f.friend_email === email);
                  return (
                    <div key={email} className="flex items-center justify-between p-3 rounded-lg"
                         style={{ backgroundColor: 'var(--cream)' }}>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--dark-text)' }}>
                          {friend?.friend_name || email}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                          ✅ Peut modifier
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeCollaboratorMutation.mutate(email)}
                        disabled={removeCollaboratorMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}

                {(wishlist.pending_invitations || []).map((email) => {
                  const friend = myFriends.find(f => f.friend_email === email);
                  return (
                    <div key={email} className="flex items-center justify-between p-3 rounded-lg"
                         style={{ backgroundColor: 'var(--cream)', opacity: 0.7 }}>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--dark-text)' }}>
                          {friend?.friend_name || email}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                          ⏳ Invitation en attente
                        </p>
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => removeCollaboratorMutation.mutate(email)}
                        disabled={removeCollaboratorMutation.isPending}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>

              {(wishlist.shared_with?.length === 0 && wishlist.pending_invitations?.length === 0) && (
                <p className="text-sm text-center py-4" style={{ color: 'var(--warm-pink)' }}>
                  Aucun collaborateur pour le moment
                </p>
              )}
            </div>
          )}

          {/* Book search and selection - for all collaborators */}
          <div>
            <Label>Livres dans la liste</Label>
            <p className="text-xs mb-2" style={{ color: 'var(--warm-pink)' }}>
              {canEditBooks ? 'Recherchez et ajoutez des livres de votre bibliothèque' : 'Livres de cette liste'}
            </p>
            
            {canEditBooks && (
              <div className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                        style={{ color: 'var(--warm-pink)' }} />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher un livre..."
                  className="pl-10"
                />
              </div>
            )}

            {/* Selected books */}
            {selectedBooks.length > 0 && (
              <div className="mb-3 p-3 rounded-lg" style={{ backgroundColor: 'var(--cream)' }}>
                <p className="text-sm font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  {selectedBooks.length} livre{selectedBooks.length > 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-2">
                  {selectedBooks.map((bookId) => {
                    const book = allBooks.find(b => b.id === bookId);
                    if (!book) return null;
                    return (
                      <div
                        key={bookId}
                        className="flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: 'var(--soft-pink)' }}
                      >
                        <span>{book.title}</span>
                        {canEditBooks && (
                          <button
                            type="button"
                            onClick={() => toggleBookSelection(bookId)}
                            className="hover:opacity-70"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {(selectedBooks.length === 0 && !canEditBooks) && (
              <p className="text-sm text-center py-4" style={{ color: 'var(--warm-pink)' }}>
                Cette liste ne contient pas encore de livres.
              </p>
            )}

            {/* Search results - for all collaborators */}
            {canEditBooks && searchQuery.length >= 2 && filteredBooks.length > 0 && (
              <div className="border rounded-lg max-h-64 overflow-y-auto" 
                   style={{ borderColor: 'var(--beige)' }}>
                {filteredBooks.map((book) => {
                  const isSelected = selectedBooks.includes(book.id);
                  return (
                    <button
                      key={book.id}
                      type="button"
                      onClick={() => toggleBookSelection(book.id)}
                      className="w-full flex items-center gap-3 p-3 hover:bg-pink-50 transition-colors text-left border-b last:border-b-0"
                      style={{
                        backgroundColor: isSelected ? 'var(--cream)' : 'white',
                        borderColor: 'var(--beige)'
                      }}
                    >
                      <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0" 
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} 
                               className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-5 h-5" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1" 
                           style={{ color: 'var(--dark-text)' }}>
                          {book.title}
                        </p>
                        <p className="text-xs line-clamp-1" 
                           style={{ color: 'var(--warm-pink)' }}>
                          {book.author}
                        </p>
                      </div>

                      {isSelected && (
                        <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                             style={{ backgroundColor: 'var(--deep-pink)' }}>
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
            {canEditBooks && searchQuery.length >= 2 && filteredBooks.length === 0 && (
              <p className="text-center py-4 text-sm" style={{ color: 'var(--warm-pink)' }}>
                Aucun livre trouvé dans votre bibliothèque
              </p>
            )}
          </div>

          {canEditSettings && (
            <>
              <div className="flex items-center justify-between p-3 rounded-lg"
                   style={{ backgroundColor: 'var(--cream)' }}>
                <Label htmlFor="public">Liste publique</Label>
                <Switch
                  id="public"
                  checked={isPublic}
                  onCheckedChange={setIsPublic}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                >
                  Annuler
                </Button>
                <Button
                  type="submit"
                  disabled={!title.trim() || updateMutation.isPending}
                  className="text-white font-medium"
                  style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                >
                  {updateMutation.isPending ? "Mise à jour..." : "Enregistrer"}
                </Button>
              </div>
            </>
          )}

          {/* For collaborators - just a close button */}
          {!canEditSettings && canEditBooks && (
            <div className="flex justify-end pt-4 border-t" style={{ borderColor: 'var(--beige)' }}>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Fermer
              </Button>
            </div>
          )}
        </form>

        {/* Invite Friend Dialog */}
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Inviter une amie</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div>
                <Input
                  value={friendSearchQuery}
                  onChange={(e) => setFriendSearchQuery(e.target.value)}
                  placeholder="Rechercher une amie..."
                />
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {filteredFriends.length > 0 ? filteredFriends.map((friend) => {
                  const isAlreadyInvited = wishlist.pending_invitations?.includes(friend.friend_email);
                  const isAlreadyCollaborator = wishlist.shared_with?.includes(friend.friend_email);
                  
                  return (
                    <button
                      key={friend.id}
                      type="button"
                      onClick={() => inviteFriendMutation.mutate(friend.friend_email)}
                      disabled={isAlreadyInvited || isAlreadyCollaborator || inviteFriendMutation.isPending}
                      className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-pink-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ backgroundColor: 'var(--cream)' }}
                    >
                      <p className="font-medium" style={{ color: 'var(--dark-text)' }}>
                        {friend.friend_name}
                      </p>
                      {isAlreadyCollaborator && (
                        <span className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                          ✅ Déjà collaborateur
                        </span>
                      )}
                      {isAlreadyInvited && (
                        <span className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                          ⏳ Invitation envoyée
                        </span>
                      )}
                      {!(isAlreadyCollaborator || isAlreadyInvited) && (
                        <span className="text-xs" style={{ color: 'var(--deep-pink)' }}>
                          Inviter
                        </span>
                      )}
                    </button>
                  );
                }) : (
                  <p className="text-center py-4 text-sm" style={{ color: 'var(--warm-pink)' }}>
                    {friendSearchQuery.length < 2 
                    ? "Commencez à taper pour rechercher des amies"
                    : "Aucune amie trouvée ou déjà collaboratrice/invitée"}
                  </p>
                )}
              </div>
              
            </div>
            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
              >
                Fermer
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}