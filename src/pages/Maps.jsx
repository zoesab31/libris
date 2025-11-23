import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Map, Plus, MapPin, Users } from "lucide-react";
import AddLocationDialog from "../components/maps/AddLocationDialog";
import LocationCard from "../components/maps/LocationCard";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Maps() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [filterCategory, setFilterCategory] = useState("all");
  const [activeTab, setActiveTab] = useState("my_locations"); // New state for tabs

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: locations = [], isLoading } = useQuery({
    queryKey: ['readingLocations'],
    queryFn: () => base44.entities.ReadingLocation.filter({ created_by: user?.email }, '-date'),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  // NEW: Fetch friends
  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ 
      created_by: user?.email, 
      status: "Acceptée" 
    }),
    enabled: !!user,
  });

  // NEW: Fetch friends' locations
  const { data: friendsLocations = [] } = useQuery({
    queryKey: ['friendsLocations'],
    queryFn: async () => {
      if (myFriends.length === 0) return [];
      
      const friendEmails = myFriends.map(f => f.friend_email);
      const allFriendsLocations = await Promise.all(
        friendEmails.map(email => 
          base44.entities.ReadingLocation.filter({ created_by: email }, '-date')
        )
      );
      
      return allFriendsLocations.flat();
    },
    enabled: !!user && myFriends.length > 0,
  });

  // NEW: Fetch all users to get profile pictures
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: activeTab === "friends_locations",
  });

  const currentLocations = activeTab === "my_locations" ? locations : friendsLocations;

  const filteredLocations = filterCategory === "all" 
    ? currentLocations 
    : currentLocations.filter(loc => loc.category === filterCategory);

  // Stats by category
  const statsByCategory = currentLocations.reduce((acc, loc) => {
    acc[loc.category] = (acc[loc.category] || 0) + 1;
    return acc;
  }, {});

  const categories = ["À la maison", "Au parc", "Au café", "Salle de sport", "En voiture", "Autre"];

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
              <Map className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Lieux de Lecture 📍
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                {activeTab === "my_locations" 
                  ? `${locations.length} lieu${locations.length > 1 ? 'x' : ''} enregistré${locations.length > 1 ? 's' : ''}`
                  : `${friendsLocations.length} lieu${friendsLocations.length > 1 ? 'x' : ''} de vos amies`
                }
              </p>
            </div>
          </div>
          {activeTab === "my_locations" && (
            <Button 
              onClick={() => setShowAddDialog(true)}
              className="shadow-lg text-white font-medium px-6 rounded-xl"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
              <Plus className="w-5 h-5 mr-2" />
              Ajouter un lieu
            </Button>
          )}
        </div>

        {/* NEW: Tabs for My Locations vs Friends' Locations */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full mb-6">
          <TabsList className="bg-white shadow-md p-1 rounded-xl border-0 w-full">
            <TabsTrigger
              value="my_locations"
              className="flex-1 rounded-lg font-bold data-[state=active]:text-white"
              style={activeTab === "my_locations" ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                color: '#FFFFFF'
              } : { color: '#000000' }}
            >
              <MapPin className="w-4 h-4 mr-2" />
              Mes lieux ({locations.length})
            </TabsTrigger>
            <TabsTrigger
              value="friends_locations"
              className="flex-1 rounded-lg font-bold data-[state=active]:text-white"
              style={activeTab === "friends_locations" ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                color: '#FFFFFF'
              } : { color: '#000000' }}
            >
              <Users className="w-4 h-4 mr-2" />
              Lieux de mes amies ({friendsLocations.length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
          {categories.map((cat) => (
            <div key={cat} 
                 className="p-4 rounded-xl text-center shadow-md cursor-pointer transition-all hover:shadow-lg"
                 style={{ 
                   backgroundColor: filterCategory === cat ? 'var(--soft-pink)' : 'white',
                   color: filterCategory === cat ? 'white' : 'var(--dark-text)'
                 }}
                 onClick={() => setFilterCategory(filterCategory === cat ? "all" : cat)}>
              <p className="text-2xl font-bold mb-1">{statsByCategory[cat] || 0}</p>
              <p className="text-xs">{cat}</p>
            </div>
          ))}
        </div>

        {/* Location cards */}
        {filteredLocations.length > 0 ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLocations.map((location) => {
              const book = location.book_id ? allBooks.find(b => b.id === location.book_id) : null;
              const friend = activeTab === "friends_locations" 
                ? myFriends.find(f => f.friend_email === location.created_by)
                : null;
              const friendUser = activeTab === "friends_locations"
                ? allUsers.find(u => u.email === location.created_by)
                : null;
              
              return (
                <LocationCard 
                  key={location.id} 
                  location={location} 
                  book={book}
                  friend={friend}
                  friendUser={friendUser}
                  showFriendInfo={activeTab === "friends_locations"}
                />
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20">
            <MapPin className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
            <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
              {activeTab === "friends_locations" && friendsLocations.length === 0
                ? "Vos amies n'ont pas encore de lieux enregistrés"
                : filterCategory === "all" 
                  ? "Aucun lieu enregistré" 
                  : `Aucun lieu "${filterCategory}"`
              }
            </h3>
            <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
              {activeTab === "friends_locations"
                ? "Encouragez vos amies à enregistrer leurs lieux de lecture préférés !"
                : "Commencez à enregistrer vos endroits préférés pour lire"
              }
            </p>
          </div>
        )}

        <AddLocationDialog 
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          books={allBooks}
        />
      </div>
    </div>
  );
}