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
    <div className="min-h-screen" style={{ background: 'linear-gradient(160deg, #FFF8FC 0%, #FEF3F9 40%, #F9F0FA 70%, #F5F0FF 100%)' }}>
      <div className="max-w-7xl mx-auto p-4 md:p-8">
        {/* Header pastel */}
        <div className="mb-8 p-6 md:p-8 rounded-3xl shadow-lg" 
             style={{ background: '#FCE8F8', border: '1px solid #F4BDE9' }}>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl md:text-5xl font-bold mb-2" style={{ color: '#A81F8C' }}>
                💕 Mes Personnages Préférés
              </h1>
              <p className="text-lg md:text-xl" style={{ color: '#C24FAE' }}>
                {bookBoyfriends.length} personnage{bookBoyfriends.length > 1 ? 's' : ''} • {favoriteCouples.length} couple{favoriteCouples.length > 1 ? 's' : ''}
              </p>
            </div>
            <Button 
              onClick={() => selectedTab === "couples" ? setShowAddCoupleDialog(true) : setShowAddDialog(true)}
              className="shadow-lg font-bold px-8 py-6 rounded-2xl hover:scale-105 transition-transform text-white"
              style={{ background: 'linear-gradient(135deg, #A81F8C, #E06AC4)' }}>
              <Plus className="w-5 h-5 mr-2" />
              {selectedTab === "couples" ? "Couple" : "Personnage"}
            </Button>
          </div>
        </div>

        <Tabs value={selectedTab} onValueChange={setSelectedTab}>
          <TabsList className="bg-white shadow-xl p-2 rounded-2xl border-0 mb-8 grid grid-cols-3 w-full">
            <TabsTrigger 
              value="male" 
              className="rounded-xl font-bold data-[state=active]:text-white text-sm md:text-base py-3"
              style={selectedTab === "male" ? {
                background: 'linear-gradient(135deg, #FF1493, #FF69B4)',
                color: '#FFFFFF'
              } : {
                color: '#000000'
              }}
            >
              <span className="flex items-center justify-center gap-1.5"><User className="w-4 h-4" />Masculins ({maleCharacters.length})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="female" 
              className="rounded-xl font-bold data-[state=active]:text-white text-sm md:text-base py-3"
              style={selectedTab === "female" ? {
                background: 'linear-gradient(135deg, #FF1493, #FF69B4)',
                color: '#FFFFFF'
              } : {
                color: '#000000'
              }}
            >
              <span className="flex items-center justify-center gap-1.5"><User className="w-4 h-4" />Féminins ({femaleCharacters.length})</span>
            </TabsTrigger>
            <TabsTrigger 
              value="couples" 
              className="rounded-xl font-bold data-[state=active]:text-white text-sm md:text-base py-3"
              style={selectedTab === "couples" ? {
                background: 'linear-gradient(135deg, #FF1493, #FF69B4)',
                color: '#FFFFFF'
              } : {
                color: '#000000'
              }}
            >
              <span className="flex items-center justify-center gap-1.5"><Users className="w-4 h-4" />Couples ({favoriteCouples.length})</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="male">
            {maleCharacters.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4 md:gap-6">
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
              <div className="text-center py-20 bg-white rounded-3xl shadow-lg">
                <Heart className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--soft-pink)' }} />
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  Aucun personnage masculin
                </h3>
                <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
                  Ajoutez vos book boyfriends préférés
                </p>
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  className="shadow-lg text-white font-medium px-8 py-6 rounded-2xl text-lg"
                  style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
                  <Plus className="w-5 h-5 mr-2" />
                  Ajouter maintenant
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="female">
            {femaleCharacters.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4 md:gap-6">
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
              <div className="text-center py-20 bg-white rounded-3xl shadow-lg">
                <Heart className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--soft-pink)' }} />
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  Aucun personnage féminin
                </h3>
                <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
                  Ajoutez vos personnages féminins préférés
                </p>
                <Button 
                  onClick={() => setShowAddDialog(true)}
                  className="shadow-lg text-white font-medium px-8 py-6 rounded-2xl text-lg"
                  style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
                  <Plus className="w-5 h-5 mr-2" />
                  Ajouter maintenant
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="couples">
            {favoriteCouples.length > 0 ? (
              <div className="grid md:grid-cols-2 gap-4 md:gap-6">
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
              <div className="text-center py-20 bg-white rounded-3xl shadow-lg">
                <Users className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--soft-pink)' }} />
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  Aucun couple préféré
                </h3>
                <p className="text-lg mb-6" style={{ color: 'var(--warm-pink)' }}>
                  Ajoutez vos couples préférés ! 💕
                </p>
                <Button 
                  onClick={() => setShowAddCoupleDialog(true)}
                  className="shadow-lg text-white font-medium px-8 py-6 rounded-2xl text-lg"
                  style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
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