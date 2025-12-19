import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, Loader2, Archive, Calendar, Database, Trash2, FileDown } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { fr } from "date-fns/locale";

export default function BackupManager({ user }) {
  const queryClient = useQueryClient();
  const [creatingBackup, setCreatingBackup] = useState(false);

  const { data: backups = [], isLoading } = useQuery({
    queryKey: ['userBackups'],
    queryFn: () => base44.entities.UserBackup.filter({ created_by: user?.email }, '-created_date'),
    enabled: !!user,
  });

  const createBackupMutation = useMutation({
    mutationFn: async () => {
      setCreatingBackup(true);
      const response = await base44.functions.invoke('createBackup', {});
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['userBackups'] });
      toast.success(`✅ Sauvegarde créée : ${data.total_items} éléments sauvegardés`);
      setCreatingBackup(false);
    },
    onError: (error) => {
      console.error("Error creating backup:", error);
      toast.error("Erreur lors de la création de la sauvegarde");
      setCreatingBackup(false);
    }
  });

  const deleteBackupMutation = useMutation({
    mutationFn: (backupId) => base44.entities.UserBackup.delete(backupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['userBackups'] });
      toast.success("Sauvegarde supprimée");
    },
  });

  const handleDownloadBackup = (backup) => {
    const dataStr = JSON.stringify(backup.data_snapshot, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `${backup.backup_name}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    toast.success("Sauvegarde téléchargée !");
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader>
        <CardTitle className="flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
          <Archive className="w-5 h-5" />
          Sauvegardes de données
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="p-4 rounded-xl" style={{ backgroundColor: '#E3F2FD' }}>
          <p className="text-sm font-medium text-blue-800 mb-2">
            🔒 Sécurisez vos données
          </p>
          <p className="text-xs text-blue-700">
            Créez une sauvegarde complète de toutes vos données (livres, commentaires, amies, citations, etc.)
            et téléchargez-la en format JSON pour la conserver en sécurité.
          </p>
        </div>

        <Button
          onClick={() => createBackupMutation.mutate()}
          disabled={creatingBackup}
          className="w-full text-white"
          style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
        >
          {creatingBackup ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Création en cours...
            </>
          ) : (
            <>
              <Archive className="w-4 h-4 mr-2" />
              Créer une nouvelle sauvegarde
            </>
          )}
        </Button>

        {isLoading ? (
          <div className="flex items-center justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin" style={{ color: 'var(--warm-pink)' }} />
          </div>
        ) : backups.length > 0 ? (
          <div className="space-y-3">
            <h4 className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
              Mes sauvegardes ({backups.length})
            </h4>
            {backups.map((backup) => (
              <div key={backup.id} className="p-4 rounded-xl border-2 shadow-sm"
                   style={{ backgroundColor: 'white', borderColor: 'var(--beige)' }}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Calendar className="w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
                      <p className="font-bold text-sm" style={{ color: 'var(--dark-text)' }}>
                        {backup.backup_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 text-xs" style={{ color: 'var(--warm-pink)' }}>
                      <span className="flex items-center gap-1">
                        <Database className="w-3 h-3" />
                        {backup.total_items} éléments
                      </span>
                      <span>
                        {format(new Date(backup.backup_date), 'dd MMM yyyy HH:mm', { locale: fr })}
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
            <p className="text-sm">Aucune sauvegarde créée</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}