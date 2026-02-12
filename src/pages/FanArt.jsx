import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Image as ImageIcon, Plus, FolderOpen, ChevronLeft, Trash2, Download, Share2, Loader2 } from "lucide-react";
import AddFanArtDialog from "../components/fanart/AddFanArtDialog";
import FanArtGallery from "../components/fanart/FanArtGallery";
import { toast } from "sonner";

export default function FanArt() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedSubfolder, setSelectedSubfolder] = useState(null);
  const [importingPinterest, setImportingPinterest] = useState(false);
  const queryClient = useQueryClient();

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

  const deleteBookMutation = useMutation({
    mutationFn: async (bookId) => {
      const bookFanArts = fanArts.filter(fa => fa.book_id === bookId);
      const deletePromises = bookFanArts.map(fa => base44.entities.FanArt.delete(fa.id));
      await Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fanArts'] });
      toast.success("Livre et fan arts supprimés");
      setSelectedBook(null);
      setSelectedSubfolder(null);
    },
  });

  const deleteSubfolderMutation = useMutation({
    mutationFn: async ({ bookId, subfolder }) => {
      const bookData = fanArtsByBook[bookId];
      if (!bookData) return;
      
      const subfolderFanArts = bookData.subfolders[subfolder] || [];
      const deletePromises = subfolderFanArts.map(fa => base44.entities.FanArt.delete(fa.id));
      await Promise.all(deletePromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fanArts'] });
      toast.success("Dossier supprimé");
      setSelectedSubfolder(null);
    },
  });

  const handleImportPinterest = async () => {
    setImportingPinterest(true);
    try {
      const response = await base44.functions.invoke('importPinterestPins', {});
      if (response.data.success) {
        queryClient.invalidateQueries({ queryKey: ['fanArts'] });
        toast.success(`✅ ${response.data.imported} fan art${response.data.imported > 1 ? 's' : ''} importé${response.data.imported > 1 ? 's' : ''} de Pinterest !`);
      } else {
        toast.error('Erreur lors de l\'import Pinterest');
      }
    } catch (error) {
      toast.error('Erreur lors de l\'import: ' + error.message);
    } finally {
      setImportingPinterest(false);
    }
  };

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

  const getCurrentViewData = () => {
    if (!selectedBook) return { fanArts: [], title: "Tous les fan arts" };
    
    const bookData = fanArtsByBook[selectedBook];
    if (!bookData) return { fanArts: [], title: "Tous les fan arts" };
    
    const bookTitle = bookData.book?.title || "Sans livre";
    
    if (!selectedSubfolder) {
      const allFanArts = Object.values(bookData.subfolders).flat();
      return { fanArts: allFanArts, title: bookTitle };
    }
    
    return {
      fanArts: bookData.subfolders[selectedSubfolder] || [],
      title: `${bookTitle} → ${selectedSubfolder}`
    };
  };

  const { fanArts: displayedFanArts, title } = getCurrentViewData();

  return (
    <div className="min-h-screen" style={{ background: 'linear-gradient(135deg, #FFF0F6 0%, #FFE4EC 100%)' }}>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header rose gradient */}
        <div className="mb-8 p-6 md:p-8 rounded-3xl shadow-2xl" 
             style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4, #FFB6C8)' }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold text-white mb-2 drop-shadow-lg">
                🎨 Mes Fan Arts
              </h1>
              <p className="text-lg md:text-xl text-white text-opacity-90">
                {fanArts.length} fan art{fanArts.length > 1 ? 's' : ''} • {books.length} livre{books.length > 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex gap-3 flex-wrap">
              <Button 
                onClick={handleImportPinterest}
                disabled={importingPinterest}
                className="shadow-xl font-bold px-6 py-6 rounded-2xl hover:scale-105 transition-transform"
                style={{ backgroundColor: 'white', color: '#E60023' }}>
                {importingPinterest ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Import...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Importer Pinterest
                  </>
                )}
              </Button>
              <Button 
                onClick={() => setShowAddDialog(true)}
                className="shadow-xl font-bold px-8 py-6 rounded-2xl hover:scale-105 transition-transform"
                style={{ backgroundColor: 'white', color: '#FF1493' }}>
                <Plus className="w-5 h-5 mr-2" />
                Ajouter
              </Button>
            </div>
          </div>
        </div>

        {!selectedBook ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
            {books.map(bookId => {
              const bookData = fanArtsByBook[bookId];
              if (!bookData) return null;
              
              const book = bookData.book;
              const totalFanArts = Object.values(bookData.subfolders).flat().length;
              const subfoldersCount = Object.keys(bookData.subfolders).length;

              return (
                <div key={bookId} className="relative group">
                  <button
                    onClick={() => setSelectedBook(bookId)}
                    className="w-full p-4 md:p-6 rounded-2xl shadow-xl transition-all hover:shadow-2xl hover:-translate-y-2 hover:scale-105"
                    style={{ backgroundColor: 'white', border: 'none' }}
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
                  
                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Supprimer tous les fan arts de "${book?.title || 'Sans livre'}" ?`)) {
                        deleteBookMutation.mutate(bookId);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
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

            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold" style={{ color: 'var(--dark-text)' }}>
                {fanArtsByBook[selectedBook]?.book?.title || "Sans livre"}
              </h2>
              <Button
                variant="destructive"
                onClick={() => {
                  if (window.confirm(`Supprimer tous les fan arts de ce livre ?`)) {
                    deleteBookMutation.mutate(selectedBook);
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer le livre
              </Button>
            </div>

            {fanArtsByBook[selectedBook] && (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-8">
                {Object.keys(fanArtsByBook[selectedBook].subfolders).map(subfolder => {
                  const fanArtsCount = fanArtsByBook[selectedBook].subfolders[subfolder].length;
                  const firstFanArt = fanArtsByBook[selectedBook].subfolders[subfolder][0];

                  return (
                    <div key={subfolder} className="relative group">
                      <button
                        onClick={() => setSelectedSubfolder(subfolder)}
                        className="w-full p-6 rounded-xl shadow-lg transition-all hover:shadow-2xl hover:-translate-y-2"
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
                      
                      <Button
                        size="icon"
                        variant="destructive"
                        className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Supprimer le dossier "${subfolder}" et tous ses fan arts ?`)) {
                            deleteSubfolderMutation.mutate({ bookId: selectedBook, subfolder });
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-6">
              <Button
                variant="ghost"
                onClick={() => setSelectedSubfolder(null)}
                style={{ color: 'var(--deep-pink)' }}
              >
                <ChevronLeft className="w-4 h-4 mr-2" />
                Retour aux dossiers
              </Button>

              <Button
                variant="destructive"
                onClick={() => {
                  if (window.confirm(`Supprimer le dossier "${selectedSubfolder}" et tous ses fan arts ?`)) {
                    deleteSubfolderMutation.mutate({ bookId: selectedBook, subfolder: selectedSubfolder });
                  }
                }}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer le dossier
              </Button>
            </div>

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