
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Plus, Check, X, Mail, Copy, RefreshCw } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";

export default function Friends() {
  const [user, setUser] = useState(null);
  const [friendCode, setFriendCode] = useState("");
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(async (u) => {
      setUser(u);
      // Generate friend code if doesn't exist
      if (!u.friend_code) {
        const code = Math.random().toString(36).substring(2, 8).toUpperCase();
        await base44.auth.updateMe({ friend_code: code });
        u.friend_code = code;
        setUser(u); // Update user state with the new friend_code
      }
    }).catch(() => {});
  }, []);

  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['pendingFriendRequests'],
    queryFn: () => base44.entities.Friendship.filter({ friend_email: user?.email, status: "En attente" }),
    enabled: !!user,
  });

  const addFriendMutation = useMutation({
    mutationFn: async (code) => {
      // Find user by friend code
      const users = await base44.entities.User.filter({ friend_code: code });
      if (users.length === 0) {
        throw new Error("Code ami invalide");
      }
      
      const friendUser = users[0];
      
      if (friendUser.email === user.email) {
        throw new Error("Vous ne pouvez pas vous ajouter vous-même");
      }
      
      // Check if already friends or if a request is pending
      const existingFriendship = myFriends.find(f => 
        (f.friend_email === friendUser.email && f.status !== "Rejetée") || // Already friends or pending outgoing
        (f.created_by === friendUser.email && f.status !== "Rejetée")      // Pending incoming
      );

      const existingPendingRequest = pendingRequests.find(r => r.created_by === friendUser.email);

      if (existingFriendship || existingPendingRequest) {
        if (existingFriendship?.status === "Acceptée") {
          throw new Error("Cette personne est déjà dans vos amis");
        } else if (existingFriendship?.status === "En attente") {
          throw new Error("Une demande d'ami est déjà en attente avec cette personne.");
        } else if (existingPendingRequest) {
          throw new Error("Vous avez déjà une demande d'ami en attente de cette personne.");
        }
      }

      await base44.entities.Friendship.create({
        friend_email: friendUser.email,
        friend_name: friendUser.full_name,
        status: "En attente"
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myFriends'] });
      setFriendCode("");
      toast.success("Invitation envoyée !");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const acceptFriendMutation = useMutation({
    mutationFn: (friendshipId) => base44.entities.Friendship.update(friendshipId, { status: "Acceptée" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingFriendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['myFriends'] }); // Invalidate myFriends as well to update accepted list
      toast.success("Amie acceptée !");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const rejectFriendMutation = useMutation({
    mutationFn: (friendshipId) => base44.entities.Friendship.delete(friendshipId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pendingFriendRequests'] });
      queryClient.invalidateQueries({ queryKey: ['myFriends'] });
      toast.success("Invitation refusée");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const regenerateCodeMutation = useMutation({
    mutationFn: async () => {
      const code = Math.random().toString(36).substring(2, 8).toUpperCase();
      await base44.auth.updateMe({ friend_code: code });
      return code;
    },
    onSuccess: (newCode) => {
      setUser((prevUser) => ({ ...prevUser, friend_code: newCode }));
      toast.success("Nouveau code généré !");
    },
    onError: (error) => {
      toast.error(error.message);
    },
  });

  const copyCode = () => {
    navigator.clipboard.writeText(user?.friend_code || "");
    toast.success("Code copié !");
  };

  const acceptedFriends = myFriends.filter(f => f.status === "Acceptée");
  const sentRequests = myFriends.filter(f => f.status === "En attente");

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
               style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
            <Users className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
              Mes Amies
            </h1>
            <p className="text-lg font-medium" style={{ color: 'var(--deep-pink)' }}>
              {acceptedFriends.length} amie{acceptedFriends.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* My friend code */}
        <Card className="shadow-lg border-0 mb-8" style={{ backgroundColor: 'white' }}>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
              💌 Mon code ami
            </h2>
            <p className="text-sm mb-4" style={{ color: 'var(--deep-pink)' }}>
              Partagez ce code avec vos amies pour qu'elles puissent vous ajouter
            </p>
            <div className="flex gap-3">
              <div className="flex-1 relative">
                <Input
                  value={user?.friend_code || ""}
                  readOnly
                  className="text-2xl font-bold text-center tracking-wider py-6"
                  style={{ backgroundColor: 'var(--cream)', color: 'var(--deep-pink)' }}
                />
              </div>
              <Button
                onClick={copyCode}
                variant="outline"
                className="px-6"
                style={{ borderColor: 'var(--soft-pink)', color: 'var(--deep-pink)' }}
              >
                <Copy className="w-5 h-5" />
              </Button>
              <Button
                onClick={() => regenerateCodeMutation.mutate()}
                variant="outline"
                disabled={regenerateCodeMutation.isPending}
                style={{ borderColor: 'var(--soft-pink)', color: 'var(--deep-pink)' }}
              >
                <RefreshCw className="w-5 h-5" />
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Add friend */}
        <Card className="shadow-lg border-0 mb-8" style={{ backgroundColor: 'white' }}>
          <CardContent className="p-6">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
              Ajouter une amie
            </h2>
            <div className="flex gap-3">
              <Input
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                placeholder="Entrez le code ami"
                className="flex-1 text-lg font-bold tracking-wider"
                maxLength={6}
              />
              <Button
                onClick={() => addFriendMutation.mutate(friendCode)}
                disabled={!friendCode || friendCode.length !== 6 || addFriendMutation.isPending}
                className="text-white font-medium px-8"
                style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
              >
                <Plus className="w-4 h-4 mr-2" />
                Ajouter
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Pending requests received */}
        {pendingRequests.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
              Invitations reçues ({pendingRequests.length})
            </h2>
            <div className="space-y-3">
              {pendingRequests.map((request) => (
                <Card key={request.id} className="shadow-lg border-0" style={{ backgroundColor: 'white' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                             style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
                          {request.created_by?.split('@')[0]?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div>
                          <p className="font-bold" style={{ color: 'var(--dark-text)' }}>
                            {request.created_by}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                            Souhaite être votre amie
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="icon"
                          onClick={() => acceptFriendMutation.mutate(request.id)}
                          className="text-white"
                          style={{ background: 'linear-gradient(135deg, #10b981, #059669)' }}
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="destructive"
                          onClick={() => rejectFriendMutation.mutate(request.id)}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* My friends */}
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
            Mes amies ({acceptedFriends.length})
          </h2>
          {acceptedFriends.length > 0 ? (
            <div className="grid md:grid-cols-2 gap-4">
              {acceptedFriends.map((friend) => (
                <Card key={friend.id} className="shadow-lg border-0 hover:shadow-xl transition-all" 
                      style={{ backgroundColor: 'white' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                             style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
                          {friend.friend_name?.[0]?.toUpperCase() || friend.friend_email?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div>
                          <p className="font-bold" style={{ color: 'var(--dark-text)' }}>
                            {friend.friend_name}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                            {friend.friend_email}
                          </p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => rejectFriendMutation.mutate(friend.id)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-lg border-0" style={{ backgroundColor: 'white' }}>
              <CardContent className="p-8 text-center">
                <Mail className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <p style={{ color: 'var(--warm-pink)' }}>
                  Vous n'avez pas encore d'amies
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sent requests */}
        {sentRequests.length > 0 && (
          <div>
            <h2 className="text-xl font-bold mb-4" style={{ color: 'var(--dark-text)' }}>
              Invitations envoyées ({sentRequests.length})
            </h2>
            <div className="space-y-3">
              {sentRequests.map((request) => (
                <Card key={request.id} className="shadow-lg border-0" style={{ backgroundColor: 'white' }}>
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                             style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
                          {request.friend_email?.[0]?.toUpperCase() || 'A'}
                        </div>
                        <div>
                          <p className="font-bold" style={{ color: 'var(--dark-text)' }}>
                            {request.friend_name || request.friend_email}
                          </p>
                          <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                            En attente de réponse
                          </p>
                        </div>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => rejectFriendMutation.mutate(request.id)}
                      >
                        <X className="w-4 h-4 text-red-500" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
