import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Library } from "lucide-react";
import AddBookDialog from "../components/library/AddBookDialog";
import BookGrid from "../components/library/BookGrid";
import CustomShelvesManager from "../components/library/CustomShelvesManager";

export default function MyLibrary() {
  const [user, setUser] = useState(null);
  const [activeTab, setActiveTab] = useState("tous");
  const [showAddBook, setShowAddBook] = useState(false);
  const [showShelves, setShowShelves] = useState(false);

  React.useEffect(() => {
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

  const filteredBooks = activeTab === "tous" 
    ? myBooks 
    : myBooks.filter(b => {
        if (activeTab === "custom") return b.custom_shelf;
        return b.status === activeTab;
      });

  const getBookDetails = (userBook) => {
    return allBooks.find(b => b.id === userBook.book_id);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}>
              <Library className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--deep-brown)' }}>
                Ma Bibliothèque
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-brown)' }}>
                {myBooks.length} livre{myBooks.length > 1 ? 's' : ''} dans votre collection
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button 
              variant="outline"
              onClick={() => setShowShelves(true)}
              className="font-medium"
              style={{ borderColor: 'var(--beige)' }}
            >
              Gérer mes étagères
            </Button>
            <Button 
              onClick={() => setShowAddBook(true)}
              className="shadow-lg text-white font-medium px-6 rounded-xl"
              style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))' }}>
              <Plus className="w-5 h-5 mr-2" />
              Ajouter un livre
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white shadow-sm p-1 rounded-xl border-0">
              <TabsTrigger value="tous" className="data-[state=active]:text-white rounded-lg data-[state=active]:shadow-md"
                           style={{ '--tw-shadow-color': 'var(--warm-brown)' }}>
                Tous
              </TabsTrigger>
              <TabsTrigger value="En cours" className="data-[state=active]:text-white rounded-lg">
                En cours
              </TabsTrigger>
              <TabsTrigger value="Lu" className="data-[state=active]:text-white rounded-lg">
                Lus
              </TabsTrigger>
              <TabsTrigger value="À lire" className="data-[state=active]:text-white rounded-lg">
                À lire
              </TabsTrigger>
              <TabsTrigger value="Mes envies" className="data-[state=active]:text-white rounded-lg">
                Mes envies
              </TabsTrigger>
              <TabsTrigger value="Abandonné" className="data-[state=active]:text-white rounded-lg">
                Abandonnés
              </TabsTrigger>
              {customShelves.length > 0 && (
                <TabsTrigger value="custom" className="data-[state=active]:text-white rounded-lg">
                  Étagères perso
                </TabsTrigger>
              )}
            </TabsList>
          </Tabs>
        </div>

        <BookGrid 
          userBooks={filteredBooks}
          allBooks={allBooks}
          customShelves={customShelves}
          isLoading={isLoading}
        />

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
      </div>
    </div>
  );
}