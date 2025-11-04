
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Users, Plus, BookOpen } from "lucide-react";
import AddSharedReadingDialog from "../components/sharedreadings/AddSharedReadingDialog";
import SharedReadingCard from "../components/sharedreadings/SharedReadingCard";
import SharedReadingDetailsDialog from "../components/sharedreadings/SharedReadingDetailsDialog";

export default function SharedReadings() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedReading, setSelectedReading] = useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: sharedReadings = [], isLoading } = useQuery({
    queryKey: ['sharedReadings'],
    queryFn: () => base44.entities.SharedReading.filter({ created_by: user?.email }, '-created_date'),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

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
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="shadow-lg text-white font-medium px-6 rounded-xl"
            style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
            <Plus className="w-5 h-5 mr-2" />
            Nouvelle lecture commune
          </Button>
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
                  <SharedReadingCard 
                    key={reading.id}
                    reading={reading}
                    book={book}
                    onClick={() => setSelectedReading(reading)}
                  />
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
                  <SharedReadingCard 
                    key={reading.id}
                    reading={reading}
                    book={book}
                    onClick={() => setSelectedReading(reading)}
                  />
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
                  <SharedReadingCard 
                    key={reading.id}
                    reading={reading}
                    book={book}
                    onClick={() => setSelectedReading(reading)}
                  />
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
      </div>
    </div>
  );
}
