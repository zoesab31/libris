// MyLibrary.tsx
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Library } from "lucide-react";
import AddBookDialog from "../components/library/AddBookDialog";
import BookGrid from "../components/library/BookGrid";
import CustomShelvesManager from "../components/library/CustomShelvesManager";
import BookDetailsSheet from "../components/library/BookDetailsSheet";

export default function MyLibrary() {
  const [user, setUser] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("tous");
  const [showAddBook, setShowAddBook] = useState(false);
  const [showShelves, setShowShelves] = useState(false);
  const [selectedUserBook, setSelectedUserBook] = useState<any | null>(null);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [], isLoading } = useQuery({
    queryKey: ["myBooks", user?.email],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ["books"],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: customShelves = [] } = useQuery({
    queryKey: ["customShelves", user?.email],
    queryFn: () => base44.entities.CustomShelf.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const filteredBooks =
    activeTab === "tous"
      ? myBooks
      : myBooks.filter((b: any) => {
          if (activeTab === "custom") return b.custom_shelf;
          return b.status === activeTab;
        });

  const getBookDetails = (userBook: any) =>
    allBooks.find((b: any) => b.id === userBook.book_id);

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: "var(--cream)" }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
              style={{ background: "linear-gradient(135deg, var(--deep-pink), var(--warm-pink))" }}
            >
              <Library className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: "var(--dark-text)" }}>
                Ma Bibliothèque
              </h1>
              <p className="text-lg" style={{ color: "var(--warm-pink)" }}>
                {myBooks.length} livre{myBooks.length > 1 ? "s" : ""} dans votre collection
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setShowShelves(true)}
              className="font-medium"
              style={{ borderColor: "var(--beige)", color: "var(--deep-pink)" }}
            >
              Gérer mes étagères
            </Button>
            <Button
              onClick={() => setShowAddBook(true)}
              className="shadow-lg text-white font-medium px-6 rounded-xl"
              style={{ background: "linear-gradient(135deg, var(--deep-pink), var(--warm-pink))" }}
            >
              <Plus className="w-5 h-5 mr-2" />
              Ajouter un livre
            </Button>
          </div>
        </div>

        <div className="mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="bg-white shadow-sm p-1 rounded-xl border-0">
              {["tous","En cours","Lu","À lire","Mes envies","Abandonné"].map(val => (
                <TabsTrigger
                  key={val}
                  value={val}
                  className="rounded-lg font-medium data-[state=active]:text-white"
                  style={activeTab === val ? { background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' } : {}}
                >
                  {val === "Lu" ? "Lus" : val}
                </TabsTrigger>
              ))}
              {customShelves.length > 0 && (
                <TabsTrigger
                  value="custom"
                  className="rounded-lg font-medium data-[state=active]:text-white"
                  style={activeTab === "custom" ? { background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' } : {}}
                >
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
          onSelect={(ub:any) => setSelectedUserBook(ub)} // <— clic ouvre le sheet
        />

        <AddBookDialog open={showAddBook} onOpenChange={setShowAddBook} user={user} />
        <CustomShelvesManager open={showShelves} onOpenChange={setShowShelves} shelves={customShelves} />

        <BookDetailsSheet
          open={!!selectedUserBook}
          onOpenChange={(o)=>!o && setSelectedUserBook(null)}
          userBook={selectedUserBook}
          book={selectedUserBook ? getBookDetails(selectedUserBook) : null}
        />
      </div>
    </div>
  );
}
