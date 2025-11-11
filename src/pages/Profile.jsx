import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Heart, Plus, User } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AddBookBoyfriendDialog from "../components/profile/AddBookBoyfriendDialog";
import BookBoyfriendCard from "../components/profile/BookBoyfriendCard";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [selectedGender, setSelectedGender] = useState("male");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: bookBoyfriends = [], isLoading } = useQuery({
    queryKey: ['bookBoyfriends'],
    queryFn: () => base44.entities.BookBoyfriend.filter({ created_by: user?.email }, 'rank'),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const maleCharacters = bookBoyfriends.filter(bf => !bf.gender || bf.gender === 'male');
  const femaleCharacters = bookBoyfriends.filter(bf => bf.gender === 'female');

  const handleEdit = (character) => {
    setEditingCharacter(character);
    setShowAddDialog(true);
  };

  const handleCloseDialog = () => {
    setShowAddDialog(false);
    setEditingCharacter(null);
  };

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--soft-pink))' }}>
              <Heart className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Mes Personnages Préférés 💕
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                {bookBoyfriends.length} personnage{bookBoyfriends.length > 1 ? 's' : ''} adoré{bookBoyfriends.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="shadow-lg text-white font-medium px-6 rounded-xl"
            style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--soft-pink))' }}>
            <Plus className="w-5 h-5 mr-2" />
            Ajouter un personnage
          </Button>
        </div>

        <Tabs value={selectedGender} onValueChange={setSelectedGender}>
          <TabsList className="bg-white shadow-sm p-1 rounded-xl border-0 mb-8">
            <TabsTrigger 
              value="male" 
              className="rounded-lg font-bold data-[state=active]:text-white"
              style={selectedGender === "male" ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--soft-pink))',
                color: '#FFFFFF'
              } : {
                color: '#000000'
              }}
            >
              Personnages masculins ({maleCharacters.length})
            </TabsTrigger>
            <TabsTrigger 
              value="female" 
              className="rounded-lg font-bold data-[state=active]:text-white"
              style={selectedGender === "female" ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--soft-pink))',
                color: '#FFFFFF'
              } : {
                color: '#000000'
              }}
            >
              Personnages féminins ({femaleCharacters.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="male">
            {maleCharacters.length > 0 ? (
              <div className="space-y-4">
                {maleCharacters.map((char) => {
                  const book = allBooks.find(b => b.id === char.book_id);
                  return (
                    <BookBoyfriendCard 
                      key={char.id} 
                      character={char} 
                      book={book}
                      onEdit={handleEdit}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <Heart className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--soft-pink)' }} />
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  Aucun personnage masculin
                </h3>
                <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                  Ajoutez vos book boyfriends préférés
                </p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="female">
            {femaleCharacters.length > 0 ? (
              <div className="space-y-4">
                {femaleCharacters.map((char) => {
                  const book = allBooks.find(b => b.id === char.book_id);
                  return (
                    <BookBoyfriendCard 
                      key={char.id} 
                      character={char} 
                      book={book}
                      onEdit={handleEdit}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <Heart className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--soft-pink)' }} />
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  Aucun personnage féminin
                </h3>
                <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                  Ajoutez vos personnages féminins préférés
                </p>
              </div>
            )}
          </TabsContent>
        </Tabs>

        <AddBookBoyfriendDialog 
          open={showAddDialog}
          onOpenChange={handleCloseDialog}
          books={allBooks}
          existingCharacters={bookBoyfriends}
          editingCharacter={editingCharacter}
        />
      </div>
    </div>
  );
}