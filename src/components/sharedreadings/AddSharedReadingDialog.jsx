import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AddSharedReadingDialog({ open, onOpenChange, books }) {
  const queryClient = useQueryClient();
  const [readingData, setReadingData] = useState({
    title: "",
    book_id: "",
    start_date: "",
    end_date: "",
    chapters_per_day: 1,
    status: "À venir",
    participants: [],
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.SharedReading.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadings'] });
      toast.success("Lecture commune créée !");
      onOpenChange(false);
      setReadingData({
        title: "",
        book_id: "",
        start_date: "",
        end_date: "",
        chapters_per_day: 1,
        status: "À venir",
        participants: [],
      });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--deep-brown)' }}>
            👭 Créer une lecture commune
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="title">Titre de la lecture commune *</Label>
            <Input
              id="title"
              value={readingData.title}
              onChange={(e) => setReadingData({...readingData, title: e.target.value})}
              placeholder="Ex: Lecture de ACOTAR avec Sarah"
            />
          </div>

          <div>
            <Label htmlFor="book">Livre *</Label>
            <Select value={readingData.book_id} onValueChange={(value) => setReadingData({...readingData, book_id: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un livre" />
              </SelectTrigger>
              <SelectContent>
                {books.map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.title} - {book.author}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="start">Date de début</Label>
              <Input
                id="start"
                type="date"
                value={readingData.start_date}
                onChange={(e) => setReadingData({...readingData, start_date: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="end">Date de fin</Label>
              <Input
                id="end"
                type="date"
                value={readingData.end_date}
                onChange={(e) => setReadingData({...readingData, end_date: e.target.value})}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="chapters">Chapitres par jour</Label>
            <Input
              id="chapters"
              type="number"
              min="1"
              value={readingData.chapters_per_day}
              onChange={(e) => setReadingData({...readingData, chapters_per_day: parseInt(e.target.value)})}
            />
          </div>

          <div>
            <Label htmlFor="status">Statut</Label>
            <Select value={readingData.status} onValueChange={(value) => setReadingData({...readingData, status: value})}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="À venir">À venir</SelectItem>
                <SelectItem value="En cours">En cours</SelectItem>
                <SelectItem value="Terminée">Terminée</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button
            onClick={() => createMutation.mutate(readingData)}
            disabled={!readingData.title || !readingData.book_id || createMutation.isPending}
            className="w-full text-white font-medium py-6"
            style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Création en cours...
              </>
            ) : (
              "Créer la lecture commune"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}