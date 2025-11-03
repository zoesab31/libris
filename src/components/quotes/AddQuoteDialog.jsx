import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function AddQuoteDialog({ open, onOpenChange, books }) {
  const queryClient = useQueryClient();
  const [quoteData, setQuoteData] = useState({
    book_id: "",
    quote_text: "",
    page_number: "",
    note: "",
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Quote.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success("Citation ajoutée !");
      onOpenChange(false);
      setQuoteData({ book_id: "", quote_text: "", page_number: "", note: "" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--deep-brown)' }}>
            ✨ Ajouter une citation
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="book">Livre *</Label>
            <Select value={quoteData.book_id} onValueChange={(value) => setQuoteData({...quoteData, book_id: value})}>
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

          <div>
            <Label htmlFor="quote">Citation *</Label>
            <Textarea
              id="quote"
              value={quoteData.quote_text}
              onChange={(e) => setQuoteData({...quoteData, quote_text: e.target.value})}
              placeholder="La citation que vous souhaitez sauvegarder..."
              rows={5}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="page">Page</Label>
              <Input
                id="page"
                type="number"
                value={quoteData.page_number}
                onChange={(e) => setQuoteData({...quoteData, page_number: e.target.value})}
                placeholder="150"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="note">Note personnelle</Label>
            <Textarea
              id="note"
              value={quoteData.note}
              onChange={(e) => setQuoteData({...quoteData, note: e.target.value})}
              placeholder="Pourquoi vous aimez cette citation..."
              rows={3}
            />
          </div>

          <Button
            onClick={() => createMutation.mutate(quoteData)}
            disabled={!quoteData.book_id || !quoteData.quote_text || createMutation.isPending}
            className="w-full text-white font-medium py-6"
            style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              "Ajouter la citation"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}