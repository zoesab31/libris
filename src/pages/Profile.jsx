import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Heart, Plus, User, Users } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import AddBookBoyfriendDialog from "../components/profile/AddBookBoyfriendDialog";
import BookBoyfriendCard from "../components/profile/BookBoyfriendCard";
import AddFavoriteCoupleDialog from "../components/profile/AddFavoriteCoupleDialog";
import FavoriteCoupleCard from "../components/profile/FavoriteCoupleCard";

export default function Profile() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showAddCoupleDialog, setShowAddCoupleDialog] = useState(false);
  const [editingCharacter, setEditingCharacter] = useState(null);
  const [editingCouple, setEditingCouple] = useState(null);
  const [selectedTab, setSelectedTab] = useState("male");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: bookBoyfriends = [], isLoading } = useQuery({
    queryKey: ['bookBoyfriends'],
    queryFn: () => base44.entities.BookBoyfriend.filter({ created_by: user?.email }, 'rank'),
    enabled: !!user,
  });

  const { data: favoriteCouples = [] } = useQuery({
    queryKey: ['favoriteCouples'],
    queryFn: () => base44.entities.FavoriteCouple.filter({ created_by: user?.email }, 'rank'),
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

  const handleEditCouple = (couple) => {
    setEditingCouple(couple);
    setShowAddCoupleDialog(true);
  };

  const handleCloseCoupleDialog = () => {
    setShowAddCoupleDialog(false);
    setEditingCouple(null);
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
                {bookBoyfriends.length} personnage{bookBoyfriends.length > 1 ? 's' : ''} • {favoriteCouples.length} couple{favoriteCouples.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              onClick={() => selectedTab === "couples" ? setShowAddCoupleDialog(true) : setShowAddDialog(true)}
              className="shadow-lg text-white font-medium px-6 rounded-xl"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--soft-pink))' }}>
              <Plus className="w-5 h-5 mr-2" />
              {selectedTab === "couples" ? "Ajouter un couple" : "Ajouter un personnage"}
            </Button>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="bg-white shadow-sm p-1 rounded-xl border-0 mb-8 grid grid-cols-3">
            <TabsTrigger 
              value="male" 
              className="rounded-lg font-bold data-[state=active]:text-white"
              style={selectedTab === "male" ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--soft-pink))',
                color: '#FFFFFF'
              } : {
                color: '#000000'
              }}
            >
              Masculins ({maleCharacters.length})
            </TabsTrigger>
            <TabsTrigger 
              value="female" 
              className="rounded-lg font-bold data-[state=active]:text-white"
              style={selectedTab === "female" ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--soft-pink))',
                color: '#FFFFFF'
              } : {
                color: '#000000'
              }}
            >
              Féminins ({femaleCharacters.length})
            </TabsTrigger>
            <TabsTrigger 
              value="couples" 
              className="rounded-lg font-bold data-[state=active]:text-white"
              style={selectedTab === "couples" ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--soft-pink))',
                color: '#FFFFFF'
              } : {
                color: '#000000'
              }}
            >
              <Users className="w-4 h-4 mr-1 inline" />
              Couples ({favoriteCouples.length})
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

          <TabsContent value="couples">
            {favoriteCouples.length > 0 ? (
              <div className="space-y-4">
                {favoriteCouples.map((couple) => {
                  const book = allBooks.find(b => b.id === couple.book_id);
                  return (
                    <FavoriteCoupleCard 
                      key={couple.id} 
                      couple={couple} 
                      book={book}
                      onEdit={handleEditCouple}
                    />
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-20">
                <Users className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--soft-pink)' }} />
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  Aucun couple préféré
                </h3>
                <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
                  Ajoutez vos couples préférés ! 💕
                </p>
                <Button 
                  onClick={() => setShowAddCoupleDialog(true)}
                  className="shadow-lg text-white font-medium px-6 rounded-xl"
                  style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--soft-pink))' }}>
                  <Plus className="w-5 h-5 mr-2" />
                  Ajouter un couple
                </Button>
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

        <AddFavoriteCoupleDialog 
          open={showAddCoupleDialog}
          onOpenChange={handleCloseCoupleDialog}
          books={allBooks}
          existingCouples={favoriteCouples}
          editingCouple={editingCouple}
        />
      </div>
    </div>
  );
}