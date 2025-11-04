import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Info } from "lucide-react";
import { toast } from "sonner";
import { differenceInDays, addDays, format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AddSharedReadingDialog({ open, onOpenChange, books }) {
  const queryClient = useQueryClient();
  const [user, setUser] = React.useState(null);
  const [selectedBook, setSelectedBook] = useState(null);
  const [readingData, setReadingData] = useState({
    note: "",
    start_date: "",
    end_date: "",
    total_chapters: "",
    chapters_per_day: "",
    status: "À venir",
  });
  const [generatedPlan, setGeneratedPlan] = useState([]);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooksForSharedReading'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const availableBooks = books.filter(book => 
    myBooks.some(ub => ub.book_id === book.id)
  );

  // Generate reading plan
  const generatePlan = () => {
    if (!readingData.start_date || !readingData.end_date || !readingData.total_chapters) {
      return;
    }

    const totalChapters = parseInt(readingData.total_chapters);
    const startDate = new Date(readingData.start_date);
    const endDate = new Date(readingData.end_date);
    const days = differenceInDays(endDate, startDate) + 1;

    if (days <= 0 || totalChapters <= 0) {
      toast.error("Vérifiez les dates et le nombre de chapitres");
      return;
    }

    const baseChaptersPerDay = Math.floor(totalChapters / days);
    const remainder = totalChapters % days;

    const plan = [];
    let currentChapter = 1;

    for (let i = 0; i < days; i++) {
      const chaptersToday = baseChaptersPerDay + (i < remainder ? 1 : 0);
      const dayDate = addDays(startDate, i);
      
      plan.push({
        day: i + 1,
        date: format(dayDate, 'dd MMM yyyy', { locale: fr }),
        chapters: `Ch. ${currentChapter}-${currentChapter + chaptersToday - 1}`,
        count: chaptersToday
      });

      currentChapter += chaptersToday;
    }

    setGeneratedPlan(plan);
    setReadingData({...readingData, chapters_per_day: baseChaptersPerDay});
    toast.success(`✅ Planning généré : ${days} jours`);
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      // Auto-generate title from selected book
      const title = selectedBook ? 
        `${selectedBook.title}${data.note ? ` - ${data.note}` : ''}` : 
        data.note || 'Lecture commune';

      await base44.entities.SharedReading.create({
        title,
        book_id: data.book_id,
        start_date: data.start_date,
        end_date: data.end_date,
        chapters_per_day: parseInt(data.chapters_per_day) || 1,
        status: data.status,
        participants: [user?.email],
      });

      // Create daily chat rooms
      for (const day of generatedPlan) {
        await base44.entities.SharedReadingMessage.create({
          shared_reading_id: data.shared_reading_id || "temp",
          day_number: day.day,
          message: `📅 Jour ${day.day} • ${day.chapters}`,
          chapter: day.chapters,
          is_spoiler: false
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadings'] });
      toast.success("Lecture commune créée avec planning !");
      onOpenChange(false);
      setReadingData({
        note: "",
        start_date: "",
        end_date: "",
        total_chapters: "",
        chapters_per_day: "",
        status: "À venir",
      });
      setGeneratedPlan([]);
      setSelectedBook(null);
    },
    onError: (error) => {
      toast.error("Échec de la création: " + error.message);
    }
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--deep-brown)' }}>
            👭 Créer une lecture commune
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="book">Livre *</Label>
            <Select 
              value={readingData.book_id} 
              onValueChange={(value) => {
                setReadingData({...readingData, book_id: value});
                setSelectedBook(availableBooks.find(b => b.id === value));
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Sélectionner un livre" />
              </SelectTrigger>
              <SelectContent>
                {availableBooks.map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.title} - {book.author}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {selectedBook && (
              <p className="text-xs mt-2 font-medium" style={{ color: 'var(--warm-pink)' }}>
                Titre auto : {selectedBook.title}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="note">Note (optionnel)</Label>
            <Input
              id="note"
              value={readingData.note}
              onChange={(e) => setReadingData({...readingData, note: e.target.value})}
              placeholder="ex: avec Sarah"
            />
          </div>

          <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
            <div className="flex items-start gap-2 mb-3">
              <Info className="w-5 h-5 mt-0.5" style={{ color: 'var(--deep-pink)' }} />
              <div>
                <p className="text-sm font-bold mb-1" style={{ color: 'var(--dark-text)' }}>
                  Planning automatique
                </p>
                <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                  Renseignez les dates et le nombre total de chapitres pour générer un planning équilibré
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-3">
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

            <div className="mb-3">
              <Label htmlFor="chapters">Nombre total de chapitres</Label>
              <Input
                id="chapters"
                type="number"
                min="1"
                value={readingData.total_chapters}
                onChange={(e) => setReadingData({...readingData, total_chapters: e.target.value})}
                placeholder="Ex: 40"
              />
            </div>

            <Button
              onClick={generatePlan}
              disabled={!readingData.start_date || !readingData.end_date || !readingData.total_chapters}
              className="w-full"
              style={{ backgroundColor: 'var(--deep-pink)', color: 'white' }}
            >
              Générer le planning
            </Button>
          </div>

          {generatedPlan.length > 0 && (
            <div className="p-4 rounded-xl border-2" style={{ backgroundColor: 'white', borderColor: 'var(--beige)' }}>
              <h3 className="font-bold mb-3" style={{ color: 'var(--dark-text)' }}>
                📅 Planning généré ({generatedPlan.length} jours)
              </h3>
              <div className="max-h-[200px] overflow-y-auto space-y-2">
                {generatedPlan.map((day) => (
                  <div key={day.day} className="flex justify-between text-sm p-2 rounded-lg"
                       style={{ backgroundColor: 'var(--cream)' }}>
                    <span className="font-medium" style={{ color: 'var(--dark-text)' }}>
                      Jour {day.day} • {day.date}
                    </span>
                    <span className="font-bold" style={{ color: 'var(--deep-pink)' }}>
                      {day.chapters} ({day.count} ch.)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            disabled={!readingData.book_id || !selectedBook || generatedPlan.length === 0 || createMutation.isPending}
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