
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Plus, FolderOpen, ChevronLeft } from "lucide-react";
import AddFanArtDialog from "../components/fanart/AddFanArtDialog";
import FanArtGallery from "../components/fanart/FanArtGallery";

export default function FanArt() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedSubfolder, setSelectedSubfolder] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: fanArts = [], isLoading } = useQuery({
    queryKey: ['fanArts'],
    queryFn: () => base44.entities.FanArt.filter({ created_by: user?.email }, '-created_date'),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  // Group by book
  const fanArtsByBook = fanArts.reduce((acc, fanArt) => {
    const bookId = fanArt.book_id || "Sans livre";
    if (!acc[bookId]) {
      acc[bookId] = { book: null, subfolders: {} };
      if (bookId !== "Sans livre") {
        acc[bookId].book = allBooks.find(b => b.id === bookId);
      }
    }
    
    const subfolder = fanArt.folder_path || "Général";
    if (!acc[bookId].subfolders[subfolder]) {
      acc[bookId].subfolders[subfolder] = [];
    }
    acc[bookId].subfolders[subfolder].push(fanArt);
    
    return acc;
  }, {});

  const books = Object.keys(fanArtsByBook);

  // Get current view data
  const getCurrentViewData = () => {
    if (!selectedBook) return { fanArts: [], title: "Tous les fan arts" };
    
    const bookData = fanArtsByBook[selectedBook];
    if (!bookData) return { fanArts: [], title: "Tous les fan arts" }; // Safety check
    
    const bookTitle = bookData.book?.title || "Sans livre";
    
    if (!selectedSubfolder) {
      // Show all fan arts for this book
      const allFanArts = Object.values(bookData.subfolders).flat();
      return { fanArts: allFanArts, title: bookTitle };
    }
    
    // Show fan arts for specific subfolder
    return {
      fanArts: bookData.subfolders[selectedSubfolder] || [],
      title: `${bookTitle} → ${selectedSubfolder}`
    };
  };

  const { fanArts: displayedFanArts, title } = getCurrentViewData();

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
              <ImageIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Mes Fan Arts
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                {fanArts.length} fan art{fanArts.length > 1 ? 's' : ''} • {books.length} livre{books.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="shadow-lg text-white font-medium px-6 rounded-xl"
            style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
            <Plus className="w-5 h-5 mr-2" />
            Ajouter un fan art
          </Button>
        </div>

        {/* Navigation */}
        {!selectedBook ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {books.map(bookId => {
              const bookData = fanArtsByBook[bookId];
              if (!bookData) return null; // Safety check
              
              const book = bookData.book;
              const totalFanArts = Object.values(bookData.subfolders).flat().length;
              const subfoldersCount = Object.keys(bookData.subfolders).length;

              return (
                <button
                  key={bookId}
                  onClick={() => setSelectedBook(bookId)}
                  className="group p-6 rounded-xl shadow-lg transition-all hover:shadow-2xl hover:-translate-y-2"
                  style={{ backgroundColor: 'white', border: '2px solid var(--beige)' }}
                >
                  <div className="mb-4">
                    {book?.cover_url ? (
                      <div className="w-full aspect-[2/3] rounded-lg overflow-hidden shadow-md">
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      </div>
                    ) : (
                      <div className="w-full aspect-[2/3] rounded-lg flex items-center justify-center"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        <FolderOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                      </div>
                    )}
                  </div>
                  <h3 className="font-bold text-center mb-2 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                    {book?.title || "Sans livre"}
                  </h3>
                  <p className="text-sm text-center" style={{ color: 'var(--warm-pink)' }}>
                    {totalFanArts} fan art{totalFanArts > 1 ? 's' : ''} • {subfoldersCount} dossier{subfoldersCount > 1 ? 's' : ''}
                  </p>
                </button>
              );
            })}
          </div>
        ) : !selectedSubfolder ? (
          <div>
            <Button
              variant="ghost"
              onClick={() => setSelectedBook(null)}
              className="mb-6"
              style={{ color: 'var(--deep-pink)' }}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Retour aux livres
            </Button>

            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--dark-text)' }}>
              {fanArtsByBook[selectedBook]?.book?.title || "Sans livre"}
            </h2>

            {fanArtsByBook[selectedBook] && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {Object.keys(fanArtsByBook[selectedBook].subfolders).map(subfolder => {
                  const fanArtsCount = fanArtsByBook[selectedBook].subfolders[subfolder].length;
                  const firstFanArt = fanArtsByBook[selectedBook].subfolders[subfolder][0];

                  return (
                    <button
                      key={subfolder}
                      onClick={() => setSelectedSubfolder(subfolder)}
                      className="group p-6 rounded-xl shadow-lg transition-all hover:shadow-2xl hover:-translate-y-2"
                      style={{ backgroundColor: 'white', border: '2px solid var(--beige)' }}
                    >
                      <div className="mb-4 w-full aspect-square rounded-lg overflow-hidden shadow-md"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {firstFanArt?.image_url ? (
                          <img src={firstFanArt.image_url} alt={subfolder} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <FolderOpen className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                      </div>
                      <h3 className="font-bold text-center mb-2" style={{ color: 'var(--dark-text)' }}>
                        📁 {subfolder}
                      </h3>
                      <p className="text-sm text-center" style={{ color: 'var(--warm-pink)' }}>
                        {fanArtsCount} fan art{fanArtsCount > 1 ? 's' : ''}
                      </p>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <Button
              variant="ghost"
              onClick={() => setSelectedSubfolder(null)}
              className="mb-6"
              style={{ color: 'var(--deep-pink)' }}
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Retour aux dossiers
            </Button>

            <h2 className="text-2xl font-bold mb-6" style={{ color: 'var(--dark-text)' }}>
              {title}
            </h2>

            <FanArtGallery fanArts={displayedFanArts} isLoading={isLoading} />
          </div>
        )}

        <AddFanArtDialog 
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          user={user}
        />
      </div>
    </div>
  );
}
