import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Star,
  Music,
  Calendar,
  BookOpen,
  Heart,
  Globe,
  Plus,
  Sparkles,
  User,
  Play,
  Check,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

const STATUSES = ["Lu", "En cours", "À lire", "Abandonné", "Wishlist"];

const LANGUAGE_FLAGS = {
  "Français": "🇫🇷",
  "Anglais": "🇬🇧",
  "Espagnol": "🇪🇸",
  "Italien": "🇮🇹",
  "Allemand": "🇩🇪",
  "Portugais": "🇵🇹",
  "Japonais": "🇯🇵",
  "Coréen": "🇰🇷",
  "Chinois": "🇨🇳",
  "Autre": "🌍"
};

export default function FriendBookDialog({ friendUserBook, book, friendName, friendUser, open, onOpenChange }) {
  const [selectedStatus, setSelectedStatus] = useState("À lire");
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: currentUser?.email }),
    enabled: !!currentUser,
  });

  const alreadyInLibrary = myBooks.some(ub => ub.book_id === book?.id);

  const addToLibraryMutation = useMutation({
    mutationFn: async () => {
      if (!currentUser || !book) throw new Error("User or book not loaded");
      
      await base44.entities.UserBook.create({
        book_id: book.id,
        status: selectedStatus,
        created_by: currentUser.email
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success(`✅ "${book.title}" ajouté à votre bibliothèque !`);
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error adding book to library:", error);
      toast.error("Erreur lors de l'ajout du livre.");
    }
  });

  const statusColors = {
    "Lu": "bg-green-100 text-green-800 border-green-300",
    "En cours": "bg-blue-100 text-blue-800 border-blue-300",
    "À lire": "bg-purple-100 text-purple-800 border-purple-300",
    "Abandonné": "bg-red-100 text-red-800 border-red-300",
    "Wishlist": "bg-pink-100 text-pink-800 border-pink-300",
  };

  const getPlatform = (link) => {
    if (!link) return null;
    if (link.includes('youtube.com') || link.includes('youtu.be')) return 'YouTube';
    if (link.includes('spotify.com')) return 'Spotify';
    if (link.includes('deezer.com')) return 'Deezer';
    if (link.includes('apple.com')) return 'Apple Music';
    return 'Lien';
  };

  const getPlatformColor = (platform) => {
    switch(platform) {
      case 'YouTube': return '#FF0000';
      case 'Spotify': return '#1DB954';
      case 'Deezer': return '#FF6600';
      case 'Apple Music': return '#FA243C';
      default: return '#9B59B6';
    }
  };

  if (!book || !friendUserBook) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-gradient-to-br from-pink-50 via-white to-purple-50">
        {/* HEADER */}
        <div className="p-8 bg-white/80 backdrop-blur-sm border-b-2 border-pink-200">
          <div className="flex gap-8 items-start">
            {/* Book Cover */}
            <div className="relative flex-shrink-0">
              <div className="absolute -top-3 -left-3 z-10 px-3 py-1 rounded-full shadow-lg text-2xl bg-white border-2 border-pink-200">
                {LANGUAGE_FLAGS[friendUserBook.reading_language || "Français"]}
              </div>
              <div className="w-48 h-72 rounded-2xl overflow-hidden shadow-2xl"
                   style={{ backgroundColor: 'var(--beige)' }}>
                {book.cover_url ? (
                  <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                  </div>
                )}
              </div>
            </div>

            {/* Book Info */}
            <div className="flex-1 space-y-4">
              <div>
                <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  {book.title}
                </h1>
                <p className="text-xl" style={{ color: 'var(--warm-pink)' }}>
                  par {book.author}
                </p>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <div className={`px-4 py-2 rounded-full font-semibold text-sm border-2 ${statusColors[friendUserBook.status]}`}>
                  {friendUserBook.status}
                </div>

                {friendUserBook.reading_language && (
                  <div className="px-4 py-2 rounded-full font-semibold text-sm bg-gray-100 text-gray-800 border-2 border-gray-300">
                    {LANGUAGE_FLAGS[friendUserBook.reading_language]} {friendUserBook.reading_language}
                  </div>
                )}
              </div>

              {/* Friend Info */}
              <div className="flex items-center gap-3 p-4 rounded-xl" 
                   style={{ backgroundColor: 'var(--cream)' }}>
                <div className="w-12 h-12 rounded-full overflow-hidden"
                     style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
                  {friendUser?.profile_picture ? (
                    <img src={friendUser.profile_picture} 
                         alt={friendName} 
                         className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                      {friendName?.[0]?.toUpperCase()}
                    </div>
                  )}
                </div>
                <div>
                  <p className="font-bold" style={{ color: 'var(--dark-text)' }}>
                    Bibliothèque de {friendName}
                  </p>
                  {friendUserBook.rating && (
                    <div className="flex items-center gap-1">
                      <Star className="w-4 h-4 fill-current" style={{ color: '#FFD700' }} />
                      <span className="font-bold" style={{ color: '#FFD700' }}>
                        {friendUserBook.rating}/5
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CONTENT */}
        <div className="p-8 space-y-6">
          {/* Synopsis */}
          {book.synopsis && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
              <h3 className="flex items-center gap-2 text-lg font-bold mb-4" 
                  style={{ color: 'var(--dark-text)', borderBottom: '2px solid var(--beige)', paddingBottom: '0.5rem' }}>
                <BookOpen className="w-5 h-5" />
                Synopsis
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" 
                 style={{ color: 'var(--dark-text)' }}>
                {book.synopsis}
              </p>
            </div>
          )}

          {/* Friend's Review */}
          {friendUserBook.review && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
              <h3 className="flex items-center gap-2 text-lg font-bold mb-4" 
                  style={{ color: 'var(--dark-text)', borderBottom: '2px solid var(--beige)', paddingBottom: '0.5rem' }}>
                <Sparkles className="w-5 h-5" />
                Avis de {friendName}
              </h3>
              <p className="text-sm leading-relaxed whitespace-pre-wrap" 
                 style={{ color: 'var(--dark-text)' }}>
                {friendUserBook.review}
              </p>
            </div>
          )}

          {/* Reading Details */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Dates */}
            {(friendUserBook.start_date || friendUserBook.end_date) && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
                <h3 className="flex items-center gap-2 text-lg font-bold mb-4" 
                    style={{ color: 'var(--dark-text)', borderBottom: '2px solid var(--beige)', paddingBottom: '0.5rem' }}>
                  <Calendar className="w-5 h-5" />
                  Dates de lecture
                </h3>
                <div className="space-y-2">
                  {friendUserBook.start_date && (
                    <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                      <span className="font-bold">Début :</span> {format(new Date(friendUserBook.start_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  )}
                  {friendUserBook.end_date && (
                    <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                      <span className="font-bold">Fin :</span> {format(new Date(friendUserBook.end_date), 'dd MMMM yyyy', { locale: fr })}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Favorite Character */}
            {friendUserBook.favorite_character && (
              <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
                <h3 className="flex items-center gap-2 text-lg font-bold mb-4" 
                    style={{ color: 'var(--dark-text)', borderBottom: '2px solid var(--beige)', paddingBottom: '0.5rem' }}>
                  <Heart className="w-5 h-5" />
                  Personnage préféré
                </h3>
                <p className="text-sm font-medium" style={{ color: 'var(--warm-pink)' }}>
                  {friendUserBook.favorite_character}
                </p>
              </div>
            )}
          </div>

          {/* Music Playlist */}
          {friendUserBook.music_playlist && friendUserBook.music_playlist.length > 0 && (
            <div className="bg-white rounded-2xl p-6 shadow-lg border-2 border-pink-100">
              <h3 className="flex items-center gap-2 text-lg font-bold mb-4" 
                  style={{ color: 'var(--dark-text)', borderBottom: '2px solid var(--beige)', paddingBottom: '0.5rem' }}>
                <Music className="w-5 h-5" />
                Playlist musicale ({friendUserBook.music_playlist.length})
              </h3>
              <div className="space-y-3">
                {friendUserBook.music_playlist.map((music, index) => {
                  const platform = getPlatform(music.link);
                  const platformColor = platform ? getPlatformColor(platform) : 'var(--warm-pink)';

                  return (
                    <div key={index} className="flex items-center gap-3 p-3 rounded-xl"
                         style={{ backgroundColor: 'var(--cream)' }}>
                      <Music className="w-5 h-5 flex-shrink-0" style={{ color: platformColor }} />
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
                          {music.title}
                        </p>
                        {music.artist && (
                          <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                            {music.artist}
                          </p>
                        )}
                        {platform && (
                          <p className="text-xs mt-1" style={{ color: platformColor }}>
                            📱 {platform}
                          </p>
                        )}
                      </div>
                      {music.link && (
                        <a href={music.link} target="_blank" rel="noopener noreferrer">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="flex-shrink-0"
                          >
                            <Play className="w-4 h-4" />
                          </Button>
                        </a>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Book Technical Info */}
          {(book.page_count || book.publication_year || book.genre) && (
            <div className="bg-gradient-to-r from-pink-50 to-purple-50 rounded-2xl p-6 shadow-lg border-2 border-pink-100">
              <h3 className="flex items-center gap-2 text-lg font-bold mb-4" 
                  style={{ color: 'var(--dark-text)', borderBottom: '2px solid var(--beige)', paddingBottom: '0.5rem' }}>
                <BookOpen className="w-5 h-5" />
                Informations techniques
              </h3>
              <div className="grid grid-cols-3 gap-4">
                {book.page_count && (
                  <div className="text-center p-3 bg-white rounded-xl shadow">
                    <p className="text-2xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                      {book.page_count}
                    </p>
                    <p className="text-sm text-gray-600">pages</p>
                  </div>
                )}
                {book.publication_year && (
                  <div className="text-center p-3 bg-white rounded-xl shadow">
                    <p className="text-2xl font-bold" style={{ color: 'var(--deep-pink)' }}>
                      {book.publication_year}
                    </p>
                    <p className="text-sm text-gray-600">année</p>
                  </div>
                )}
                {book.genre && (
                  <div className="text-center p-3 bg-white rounded-xl shadow">
                    <p className="text-lg font-bold" style={{ color: 'var(--deep-pink)' }}>
                      {book.genre}
                    </p>
                    <p className="text-sm text-gray-600">genre</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Add to Library Section */}
          {!alreadyInLibrary && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-2xl p-6 shadow-lg border-2 border-purple-200">
              <h3 className="flex items-center gap-2 text-lg font-bold mb-4" 
                  style={{ color: 'var(--dark-text)' }}>
                <Plus className="w-5 h-5" />
                Ajouter à ma bibliothèque
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold mb-2 block">
                    Statut du livre dans votre bibliothèque
                  </Label>
                  <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                    <SelectTrigger className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map(status => (
                        <SelectItem key={status} value={status}>{status}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <Button
                  onClick={() => addToLibraryMutation.mutate()}
                  disabled={addToLibraryMutation.isPending}
                  className="w-full py-6 text-lg font-medium bg-gradient-to-r from-pink-500 to-purple-500 text-white hover:scale-105 transition-transform shadow-lg"
                >
                  {addToLibraryMutation.isPending ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Ajout en cours...
                    </>
                  ) : (
                    <>
                      <Plus className="w-5 h-5 mr-2" />
                      Ajouter à ma bibliothèque
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {alreadyInLibrary && (
            <div className="bg-green-50 rounded-2xl p-6 shadow-lg border-2 border-green-200 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Check className="w-6 h-6" style={{ color: '#10B981' }} />
                <h3 className="text-lg font-bold" style={{ color: '#10B981' }}>
                  Déjà dans votre bibliothèque
                </h3>
              </div>
              <p className="text-sm" style={{ color: '#059669' }}>
                Ce livre est déjà dans votre collection !
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}