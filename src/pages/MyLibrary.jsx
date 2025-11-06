
import React, { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Library, Calendar, ChevronDown, ChevronUp, ChevronLeft } from "lucide-react";
import AddBookDialog from "../components/library/AddBookDialog";
import BookGrid from "../components/library/BookGrid";
import CustomShelvesManager from "../components/library/CustomShelvesManager";
import PALManager from "../components/library/PALManager";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from 'sonner';
import BookDetailsDialog from "../components/library/BookDetailsDialog";

export default function MyLibrary() {
  const navigate = useNavigate();
  const queryClient = useQueryClient(); // Initialize queryClient
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("tous");
  const [showAddBook, setShowAddBook] = useState(false);
  const [showShelves, setShowShelves] = useState(false);
  const [showPALs, setShowPALs] = useState(false); // New state
  const [selectedPAL, setSelectedPAL] = useState(null); // New state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedBooks, setSelectedBooks] = useState([]);
  const [expandedYears, setExpandedYears] = useState({});
  const [selectedUserBook, setSelectedUserBook] = useState(null); // New state

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [], isLoading } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: customShelves = [] } = useQuery({
    queryKey: ['customShelves'],
    queryFn: () => base44.entities.CustomShelf.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  // New query for Reading Lists (PALs)
  const { data: readingLists = [] } = useQuery({
    queryKey: ['readingLists'],
    queryFn: () => base44.entities.ReadingList.filter({ created_by: user?.email }, '-year,-month'),
    enabled: !!user,
  });

  // Helper function to check if abandoned book counts (>50%)
  const abandonedBookCounts = (userBook) => {
    if (userBook.status !== "Abandonné") return false;
    
    // Check percentage
    if (userBook.abandon_percentage >= 50) return true;
    
    // Check page count
    if (userBook.abandon_page) {
      const book = allBooks.find(b => b.id === userBook.book_id);
      if (book && book.page_count && userBook.abandon_page >= book.page_count / 2) {
        return true;
      }
    }
    
    return false;
  };

  // Organize read books + DNF >50% by year and month
  const readBooksByYearMonth = useMemo(() => {
    const booksToOrganize = myBooks.filter(b => {
      if (!b.end_date) return false;
      
      // Include "Lu" books
      if (b.status === "Lu") return true;
      
      // Include "Abandonné" books if >50%
      if (b.status === "Abandonné") {
        return abandonedBookCounts(b);
      }
      
      return false;
    });
    
    const organized = {};

    booksToOrganize.forEach(userBook => {
      const endDate = new Date(userBook.end_date);
      const year = endDate.getFullYear();
      const month = endDate.getMonth() + 1; // 1-12

      if (!organized[year]) {
        organized[year] = {};
      }
      if (!organized[year][month]) {
        organized[year][month] = [];
      }
      organized[year][month].push(userBook);
    });

    return organized;
  }, [myBooks, allBooks]);

  const years = Object.keys(readBooksByYearMonth).sort((a, b) => b - a); // Most recent first

  const toggleYear = (year) => {
    setExpandedYears(prev => ({
      ...prev,
      [year]: !prev[year]
    }));
  };

  const monthNames = [
    "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
    "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"
  ];

  const filteredBooks = activeTab === "tous"
    ? myBooks
    : activeTab === "custom"
    ? [] // Don't show individual books in custom tab, only folders
    : activeTab === "historique"
    ? [] // No books shown directly in history tab, only organized view
    : activeTab === "pal"
    ? [] // No books shown directly in PAL tab, only PALs or books within a selected PAL
    : myBooks.filter(b => b.status === activeTab);

  const getBookDetails = (userBook) => {
    return allBooks.find(b => b.id === userBook.book_id);
  };

  // Calculate average rating for each shelf
  const getShelfAverageRating = (shelfName) => {
    const shelfBooks = myBooks.filter(b => b.custom_shelf === shelfName && b.rating);
    if (shelfBooks.length === 0) return 0;
    const sum = shelfBooks.reduce((acc, b) => acc + b.rating, 0);
    return (sum / shelfBooks.length).toFixed(1);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
              <Library className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Ma Bibliothèque
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                {myBooks.length} livre{myBooks.length > 1 ? 's' : ''} dans votre collection
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {!selectionMode ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowShelves(true)}
                  className="font-medium"
                  style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}
                >
                  Gérer mes étagères
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setShowPALs(true)} // New button
                  className="font-medium"
                  style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}
                >
                  Gérer mes PAL
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setSelectionMode(true)}
                  className="font-medium"
                  style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}
                >
                  Sélectionner
                </Button>
                <Button
                  onClick={() => setShowAddBook(true)}
                  className="shadow-lg text-white font-medium px-6 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
                  <Plus className="w-5 h-5 mr-2" />
                  Ajouter un livre
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectionMode(false);
                    setSelectedBooks([]);
                  }}
                >
                  Annuler
                </Button>
                {selectedBooks.length > 0 && (
                  <Button
                    className="shadow-lg text-white font-medium"
                    style={{ background: 'linear-gradient(135deg, #FF1744, #F50057)' }}
                    onClick={() => {
                      if (window.confirm(`Êtes-vous sûre de vouloir supprimer ${selectedBooks.length} livre${selectedBooks.length > 1 ? 's' : ''} ?`)) {
                        // This will be handled by BookGrid
                      }
                    }}
                  >
                    Supprimer {selectedBooks.length} livre{selectedBooks.length > 1 ? 's' : ''}
                  </Button>
                )}
              </>
            )}
          </div>
        </div>

        <div className="mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white shadow-sm p-1 rounded-xl border-0 flex-wrap h-auto">
              {customShelves.length > 0 && (
                <TabsTrigger
                  value="custom"
                  className="rounded-lg font-bold data-[state=active]:text-white"
                  style={activeTab === "custom" ? {
                    background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                    color: '#FFFFFF'
                  } : { color: '#000000' }}
                >
                  Étagères perso
                </TabsTrigger>
              )}
              <TabsTrigger
                value="tous"
                className="rounded-lg font-bold data-[state=active]:text-white"
                style={activeTab === "tous" ? {
                  background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                  color: '#FFFFFF'
                } : { color: '#000000' }}
              >
                Tous
              </TabsTrigger>
              <TabsTrigger
                value="En cours"
                className="rounded-lg font-bold data-[state=active]:text-white"
                style={activeTab === "En cours" ? {
                  background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                  color: '#FFFFFF'
                } : { color: '#000000' }}
              >
                En cours
              </TabsTrigger>
              <TabsTrigger
                value="Lu"
                className="rounded-lg font-bold data-[state=active]:text-white"
                style={activeTab === "Lu" ? {
                  background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                  color: '#FFFFFF'
                } : { color: '#000000' }}
              >
                Lus
              </TabsTrigger>
              <TabsTrigger
                value="À lire"
                className="rounded-lg font-bold data-[state=active]:text-white"
                style={activeTab === "À lire" ? {
                  background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                  color: '#FFFFFF'
                } : { color: '#000000' }}
              >
                À lire
              </TabsTrigger>
              <TabsTrigger
                value="pal" // New Tab Trigger
                className="rounded-lg font-bold data-[state=active]:text-white flex items-center gap-1"
                style={activeTab === "pal" ? {
                  background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                  color: '#FFFFFF'
                } : { color: '#000000' }}
              >
                📚 Mes PAL
              </TabsTrigger>
              <TabsTrigger
                value="Mes envies"
                className="rounded-lg font-bold data-[state=active]:text-white"
                style={activeTab === "Mes envies" ? {
                  background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                  color: '#FFFFFF'
                } : { color: '#000000' }}
              >
                Mes envies
              </TabsTrigger>
              <TabsTrigger
                value="Abandonné"
                className="rounded-lg font-bold data-[state=active]:text-white"
                style={activeTab === "Abandonné" ? {
                  background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                  color: '#FFFFFF'
                } : { color: '#000000' }}
              >
                Abandonnés
              </TabsTrigger>
              <TabsTrigger
                value="historique"
                className="rounded-lg font-bold data-[state=active]:text-white flex items-center gap-1"
                style={activeTab === "historique" ? {
                  background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                  color: '#FFFFFF'
                } : { color: '#000000' }}
              >
                <Calendar className="w-4 h-4" />
                Historique
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* PAL View */}
        {activeTab === "pal" ? (
          <div>
            {readingLists.length === 0 ? (
              <div className="text-center py-20">
                <Library className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  Aucune PAL créée
                </h3>
                <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
                  Créez votre première PAL pour organiser vos futures lectures par mois
                </p>
                <Button
                  onClick={() => setShowPALs(true)}
                  className="font-medium"
                  style={{
                    background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                    color: 'white'
                  }}
                >
                  Créer une PAL
                </Button>
              </div>
            ) : selectedPAL ? (
              <div>
                <div className="flex items-center gap-4 mb-6">
                  <Button
                    variant="ghost"
                    onClick={() => setSelectedPAL(null)}
                    className="p-2"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </Button>
                  <div>
                    <h2 className="text-2xl font-bold" style={{ color: 'var(--dark-text)' }}>
                      {selectedPAL.icon} {selectedPAL.name}
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                      {(selectedPAL.book_ids?.length || 0)} livre{(selectedPAL.book_ids?.length || 0) > 1 ? 's' : ''}
                    </p>
                  </div>
                </div>
                
                <BookGrid
                  // Filter userBooks to show only books that are "À lire" and whose book_id is in selectedPAL.book_ids
                  userBooks={myBooks.filter(userBook => 
                    selectedPAL.book_ids?.includes(userBook.book_id) && userBook.status === "À lire"
                  )}
                  allBooks={allBooks}
                  customShelves={customShelves}
                  isLoading={isLoading}
                  selectionMode={false}
                  selectedBooks={[]}
                  onSelectionChange={() => {}}
                  onExitSelectionMode={() => {}}
                  palMode={selectedPAL} // Pass the selected PAL for context
                  onRemoveFromPAL={(bookIdToRemove) => { // bookIdToRemove is the Book entity's ID
                    const updatedBookIds = (selectedPAL.book_ids || []).filter(id => id !== bookIdToRemove);
                    base44.entities.ReadingList.update(selectedPAL.id, { book_ids: updatedBookIds })
                      .then(() => {
                        queryClient.invalidateQueries({ queryKey: ['readingLists'] });
                        // Update the local state for selectedPAL to reflect the change immediately
                        setSelectedPAL({ ...selectedPAL, book_ids: updatedBookIds });
                        toast.success("Livre retiré de la PAL");
                      })
                      .catch(error => {
                        console.error("Failed to remove book from PAL:", error);
                        toast.error("Échec de la suppression du livre de la PAL.");
                      });
                  }}
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {readingLists.map((pal) => {
                  // Filter myBooks to only show "À lire" books that are part of this PAL
                  const palBooks = myBooks.filter(userBook => 
                    pal.book_ids?.includes(userBook.book_id) && userBook.status === "À lire"
                  );
                  const previewBooks = palBooks.slice(0, 3);
                  const monthName = pal.month ? monthNames[pal.month - 1] : "";

                  return (
                    <div
                      key={pal.id}
                      onClick={() => setSelectedPAL(pal)}
                      className="group cursor-pointer p-6 rounded-xl shadow-lg transition-all hover:shadow-2xl hover:-translate-y-2"
                      style={{
                        backgroundColor: 'white',
                        border: '2px solid var(--beige)'
                      }}
                    >
                      <div className="mb-4 flex items-center justify-center gap-1 h-32">
                        {previewBooks.length > 0 ? (
                          <div className="flex gap-1 items-end">
                            {previewBooks.map((userBook, idx) => {
                              const book = allBooks.find(b => b.id === userBook.book_id);
                              return (
                                <div
                                  key={userBook.id}
                                  className="w-8 h-20 rounded-sm shadow-md overflow-hidden"
                                  style={{
                                    transform: `translateY(${idx * 2}px)`
                                  }}
                                >
                                  {book?.cover_url ? (
                                    <img
                                      src={book.cover_url}
                                      alt={book.title}
                                      className="w-full h-full object-cover"
                                    />
                                  ) : (
                                    <div className="w-full h-full bg-pink-200 flex items-center justify-center text-xs text-center text-gray-500">
                                      No Cover
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-6xl opacity-20">{pal.icon}</div>
                        )}
                      </div>

                      <div className="text-center">
                        <h3 className="text-lg font-bold mb-1"
                            style={{ color: 'var(--dark-text)' }}>
                          {pal.icon} {pal.name}
                        </h3>
                        {monthName && pal.year && (
                          <p className="text-xs mb-2 flex items-center justify-center gap-1" style={{ color: 'var(--warm-brown)' }}>
                            <Calendar className="w-3 h-3" />
                            {monthName} {pal.year}
                          </p>
                        )}
                        <p className="text-sm font-medium" style={{ color: 'var(--warm-pink)' }}>
                          {palBooks.length} livre{palBooks.length > 1 ? 's' : ''}
                        </p>
                        {pal.description && (
                          <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                            {pal.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : activeTab === "historique" ? (
          <div className="space-y-6">
            {years.length === 0 ? (
              <div className="text-center py-20">
                <Calendar className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  Aucune lecture terminée
                </h3>
                <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                  Vos livres lus apparaîtront ici organisés par année et mois
                </p>
              </div>
            ) : (
              years.map(year => {
                const yearData = readBooksByYearMonth[year];
                const months = Object.keys(yearData).sort((a, b) => b - a);
                const totalBooksYear = months.reduce((sum, month) => sum + yearData[month].length, 0);
                const isExpanded = expandedYears[year];

                return (
                  <div key={year} className="bg-white rounded-2xl shadow-lg overflow-hidden">
                    <button
                      onClick={() => toggleYear(year)}
                      className="w-full p-6 flex items-center justify-between hover:bg-opacity-50 transition-colors"
                      style={{ backgroundColor: 'var(--cream)' }}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                             style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
                          <span className="text-white font-bold text-lg">{year}</span>
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold text-left" style={{ color: 'var(--dark-text)' }}>
                            {year}
                          </h2>
                          <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                            {totalBooksYear} livre{totalBooksYear > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {isExpanded ? (
                        <ChevronUp className="w-6 h-6" style={{ color: 'var(--deep-pink)' }} />
                      ) : (
                        <ChevronDown className="w-6 h-6" style={{ color: 'var(--deep-pink)' }} />
                      )}
                    </button>

                    {isExpanded && (
                      <div className="p-6 space-y-8">
                        {months.map(month => {
                          const monthBooks = yearData[month];
                          const monthName = monthNames[month - 1];

                          return (
                            <div key={month}>
                              <div className="flex items-center gap-3 mb-4">
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center shadow-sm"
                                     style={{ backgroundColor: 'var(--soft-pink)' }}>
                                  <span className="text-white font-bold text-sm">{month}</span>
                                </div>
                                <div>
                                  <h3 className="text-xl font-bold" style={{ color: 'var(--dark-text)' }}>
                                    {monthName}
                                  </h3>
                                  <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                                    {monthBooks.length} livre{monthBooks.length > 1 ? 's' : ''}
                                  </p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 md::grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                                {monthBooks.map(userBook => {
                                  const book = allBooks.find(b => b.id === userBook.book_id);
                                  if (!book) return null;
                                  
                                  const isDNF = userBook.status === "Abandonné";

                                  return (
                                    <div
                                      key={userBook.id}
                                      className="group cursor-pointer relative"
                                      onClick={() => setSelectedUserBook(userBook)}
                                    >
                                      {isDNF && (
                                        <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-black flex items-center justify-center shadow-lg z-10">
                                          <span className="text-lg">💀</span>
                                        </div>
                                      )}
                                      <div className="w-full aspect-[2/3] rounded-xl overflow-hidden shadow-lg 
                                                    transition-all duration-300 group-hover:shadow-2xl group-hover:-translate-y-2"
                                           style={{ backgroundColor: 'var(--beige)' }}>
                                        {book.cover_url ? (
                                          <img 
                                            src={book.cover_url} 
                                            alt={book.title}
                                            className="w-full h-full object-cover"
                                          />
                                        ) : (
                                          <div className="w-full h-full flex items-center justify-center">
                                            <Library className="w-12 h-12" style={{ color: 'var(--warm-pink)' }} />
                                          </div>
                                        )}
                                      </div>
                                      <h4 className="font-bold text-sm mt-2 line-clamp-2 group-hover:underline" 
                                          style={{ color: 'var(--dark-text)' }}>
                                        {book.title}
                                      </h4>
                                      <p className="text-xs line-clamp-1" style={{ color: 'var(--warm-pink)' }}>
                                        {book.author}
                                      </p>
                                      {userBook.rating && (
                                        <div className="flex items-center gap-1 mt-1">
                                          <span className="text-xs font-bold" style={{ color: 'var(--gold)' }}>
                                            ⭐ {userBook.rating}/5
                                          </span>
                                        </div>
                                      )}
                                      {isDNF && (
                                        <p className="text-xs mt-1 font-medium" style={{ color: '#666' }}>
                                          DNF {userBook.abandon_percentage ? `${userBook.abandon_percentage}%` : ''}
                                        </p>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : activeTab === "custom" ? (
          <div>
            {customShelves.length === 0 ? (
              <div className="text-center py-20">
                <Library className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  Aucune étagère personnalisée
                </h3>
                <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
                  Créez votre première étagère pour organiser vos livres
                </p>
                <Button
                  onClick={() => setShowShelves(true)}
                  className="font-medium"
                  style={{
                    background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                    color: 'white'
                  }}
                >
                  Créer une étagère
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {customShelves.map((shelf) => {
                  const shelfBooks = myBooks.filter(b => b.custom_shelf === shelf.name);
                  const previewBooks = shelfBooks.slice(0, 3);
                  const avgRating = getShelfAverageRating(shelf.name);

                  return (
                    <div
                      key={shelf.id}
                      onClick={() => {
                        sessionStorage.setItem('currentShelf', JSON.stringify(shelf));
                        navigate(createPageUrl("ShelfView"));
                      }}
                      className="group cursor-pointer p-6 rounded-xl shadow-lg transition-all hover:shadow-2xl hover:-translate-y-2"
                      style={{
                        backgroundColor: 'white',
                        border: '2px solid var(--beige)'
                      }}
                    >
                      <div className="mb-4 flex items-center justify-center gap-1 h-32">
                        {previewBooks.length > 0 ? (
                          <div className="flex gap-1 items-end">
                            {previewBooks.map((userBook, idx) => {
                              const book = allBooks.find(b => b.id === userBook.book_id);
                              return (
                                <div
                                  key={userBook.id}
                                  className="w-8 h-20 rounded-sm shadow-md"
                                  style={{
                                    backgroundColor: userBook.book_color || '#FFB3D9',
                                    transform: `translateY(${idx * 2}px)`
                                  }}
                                >
                                  {book?.cover_url && (
                                    <img
                                      src={book.cover_url}
                                      alt={book.title}
                                      className="w-full h-full object-cover rounded-sm opacity-40"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        ) : (
                          <div className="text-6xl opacity-20">{shelf.icon}</div>
                        )}
                      </div>

                      <div className="text-center">
                        <h3 className="text-lg font-bold mb-1 flex items-center justify-center gap-2"
                            style={{ color: 'var(--dark-text)' }}>
                          <span className="text-2xl">{shelf.icon}</span>
                          {shelf.name}
                        </h3>
                        <p className="text-sm font-medium" style={{ color: 'var(--warm-pink)' }}>
                          {shelfBooks.length} livre{shelfBooks.length > 1 ? 's' : ''}
                        </p>
                        {avgRating > 0 && (
                          <div className="flex items-center justify-center gap-1 mt-2">
                            <span className="text-lg font-bold" style={{ color: 'var(--gold)' }}>
                              ⭐ {avgRating}
                            </span>
                            <span className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                              / 5
                            </span>
                          </div>
                        )}
                        {shelf.description && (
                          <p className="text-xs mt-2 line-clamp-2" style={{ color: 'var(--dark-text)' }}>
                            {shelf.description}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        ) : (
          <BookGrid
            userBooks={filteredBooks}
            allBooks={allBooks}
            customShelves={customShelves}
            isLoading={isLoading}
            selectionMode={selectionMode}
            selectedBooks={selectedBooks}
            onSelectionChange={setSelectedBooks}
            onExitSelectionMode={() => {
              setSelectionMode(false);
              setSelectedBooks([]);
            }}
            showPALSelector={activeTab === "À lire"} // New prop
            readingLists={readingLists} // New prop
          />
        )}

        <AddBookDialog
          open={showAddBook}
          onOpenChange={setShowAddBook}
          user={user}
        />

        <CustomShelvesManager
          open={showShelves}
          onOpenChange={setShowShelves}
          shelves={customShelves}
        />

        <PALManager // New component
          open={showPALs}
          onOpenChange={setShowPALs}
          pals={readingLists}
        />

        {selectedUserBook && (
          <BookDetailsDialog
            userBook={selectedUserBook}
            book={allBooks.find(b => b.id === selectedUserBook.book_id)}
            open={!!selectedUserBook}
            onOpenChange={(open) => !open && setSelectedUserBook(null)}
          />
        )}
      </div>
    </div>
  );
}
