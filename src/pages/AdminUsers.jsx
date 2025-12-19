import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Shield, Search, Archive, Trash2, Download, User, Loader2, AlertTriangle, FileDown, Database, Calendar } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function AdminUsers() {
  const [user, setUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [creatingBackupFor, setCreatingBackupFor] = useState(null);
  const queryClient = useQueryClient();

  React.useEffect(() => {
    base44.auth.me().then(u => {
      setUser(u);
      if (u?.role !== 'admin') {
        window.location.href = '/';
      }
    }).catch(() => {});
  }, []);

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: !!user && user.role === 'admin',
  });

  const { data: userBackups = [] } = useQuery({
    queryKey: ['userBackups', selectedUser?.email],
    queryFn: () => base44.entities.UserBackup.filter({ created_by: selectedUser?.email }, '-created_date'),
    enabled: !!selectedUser,
  });

  const createBackupMutation = useMutation({
    mutationFn: async (targetUser) => {
      setCreatingBackupFor(targetUser.email);
      const response = await base44.functions.invoke('createBackupForUser', { user_email: targetUser.email });
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userBackups'] });
      toast.success(`✅ Sauvegarde créée : ${data.total_items} éléments`);
      setCreatingBackupFor(null);
    },
    onError: (error) => {
      console.error("Error creating backup:", error);
      toast.error("Erreur lors de la création");
      setCreatingBackupFor(null);
    }
  });

  const deleteBackupMutation = useMutation({
    mutationFn: (backupId) => base44.entities.UserBackup.delete(backupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userBackups'] });
      toast.success("Sauvegarde supprimée");
    },
  });

  const downloadUserDataMutation = useMutation({
    mutationFn: async (targetUser) => {
      const response = await base44.functions.invoke('downloadUserData', { user_email: targetUser.email });
      return response.data;
    },
    onSuccess: (data) => {
      const dataStr = JSON.stringify(data.data, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `${data.user_email}_${new Date().getTime()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success(`✅ ${data.total_items} éléments téléchargés`);
    },
    onError: (error) => {
      console.error("Error downloading data:", error);
      toast.error("Erreur lors du téléchargement");
    }
  });

  const handleDownloadBackup = (backup) => {
    const dataStr = JSON.stringify(backup.data_snapshot, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `backup_${backup.created_by}_${new Date(backup.backup_date).getTime()}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("Téléchargé !");
  };

  const filteredUsers = allUsers.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!user || user.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: 'var(--cream)' }}>
        <div className="text-center">
          <Shield className="w-20 h-20 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
          <h1 className="text-2xl font-bold" style={{ color: 'var(--dark-text)' }}>
            Accès réservé aux administrateurs
          </h1>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
               style={{ background: 'linear-gradient(135deg, #DC2626, #EF4444)' }}>
            <Shield className="w-7 h-7 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold" style={{ color: 'var(--dark-text)' }}>
              Gestion des utilisateurs
            </h1>
            <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
              {allUsers.length} utilisateur{allUsers.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Left: Users List */}
          <div className="space-y-4">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" 
                      style={{ color: 'var(--warm-pink)' }} />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher un utilisateur..."
                className="pl-12"
              />
            </div>

            <div className="space-y-3 max-h-[600px] overflow-y-auto">
              {filteredUsers.map((u) => (
                <Card 
                  key={u.id}
                  className={`cursor-pointer transition-all border-2 ${
                    selectedUser?.id === u.id ? 'shadow-lg' : 'shadow-sm hover:shadow-md'
                  }`}
                  style={{ 
                    borderColor: selectedUser?.id === u.id ? 'var(--deep-pink)' : 'var(--beige)' 
                  }}
                  onClick={() => setSelectedUser(u)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
                           style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
                        {u.profile_picture ? (
                          <img src={u.profile_picture} alt={u.full_name} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                            {u.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold truncate" style={{ color: 'var(--dark-text)' }}>
                          {u.full_name || 'Utilisateur'}
                        </p>
                        <p className="text-sm truncate" style={{ color: 'var(--warm-pink)' }}>
                          {u.email}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                          {u.role === 'admin' ? '👑 Admin' : '👤 Utilisateur'}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right: User Details & Backups */}
          <div className="space-y-4">
            {selectedUser ? (
              <>
                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-16 h-16 rounded-full overflow-hidden"
                           style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
                        {selectedUser.profile_picture ? (
                          <img src={selectedUser.profile_picture} alt={selectedUser.full_name} 
                               className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-2xl">
                            {selectedUser.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                        )}
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold" style={{ color: 'var(--dark-text)' }}>
                          {selectedUser.full_name}
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                          {selectedUser.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button
                        onClick={() => createBackupMutation.mutate(selectedUser)}
                        disabled={creatingBackupFor === selectedUser.email}
                        className="flex-1 text-white"
                        style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
                      >
                        {creatingBackupFor === selectedUser.email ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Création...
                          </>
                        ) : (
                          <>
                            <Archive className="w-4 h-4 mr-2" />
                            Créer
                          </>
                        )}
                      </Button>

                      <Button
                        onClick={() => downloadUserDataMutation.mutate(selectedUser)}
                        disabled={downloadUserDataMutation.isPending}
                        variant="outline"
                        className="flex-1"
                        style={{ borderColor: 'var(--deep-pink)', color: 'var(--deep-pink)' }}
                      >
                        {downloadUserDataMutation.isPending ? (
                          <>
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                            Export...
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mr-2" />
                            Télécharger
                          </>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-0 shadow-lg">
                  <CardContent className="p-6">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2" 
                        style={{ color: 'var(--dark-text)' }}>
                      <Database className="w-5 h-5" />
                      Sauvegardes ({userBackups.length})
                    </h3>

                    {userBackups.length > 0 ? (
                      <div className="space-y-3 max-h-[400px] overflow-y-auto">
                        {userBackups.map((backup) => (
                          <div key={backup.id} 
                               className="p-4 rounded-xl border-2"
                               style={{ backgroundColor: 'white', borderColor: 'var(--beige)' }}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <p className="font-bold text-sm mb-1" style={{ color: 'var(--dark-text)' }}>
                                  {backup.backup_name}
                                </p>
                                <div className="flex items-center gap-3 text-xs" style={{ color: 'var(--warm-pink)' }}>
                                  <span className="flex items-center gap-1">
                                    <Database className="w-3 h-3" />
                                    {backup.total_items} éléments
                                  </span>
                                  <span className="flex items-center gap-1">
                                    <Calendar className="w-3 h-3" />
                                    {format(new Date(backup.backup_date), 'dd/MM/yyyy HH:mm', { locale: fr })}
                                  </span>
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleDownloadBackup(backup)}
                                >
                                  <FileDown className="w-4 h-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    if (window.confirm("Supprimer cette sauvegarde ?")) {
                                      deleteBackupMutation.mutate(backup.id);
                                    }
                                  }}
                                  className="text-red-500 hover:text-red-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8" style={{ color: 'var(--warm-pink)' }}>
                        <Archive className="w-12 h-12 mx-auto mb-3 opacity-30" />
                        <p className="text-sm">Aucune sauvegarde</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-20">
                <User className="w-20 h-20 mx-auto mb-6 opacity-20" style={{ color: 'var(--warm-pink)' }} />
                <h3 className="text-2xl font-bold mb-2" style={{ color: 'var(--dark-text)' }}>
                  Sélectionnez un utilisateur
                </h3>
                <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                  Choisissez un compte à gérer
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}