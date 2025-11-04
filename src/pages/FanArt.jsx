
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Image as ImageIcon, Plus, FolderPlus, Trash2 } from "lucide-react";
import AddFanArtDialog from "../components/fanart/AddFanArtDialog";
import FanArtGallery from "../components/fanart/FanArtGallery";

export default function FanArt() {
  const [user, setUser] = useState(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("all");

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: fanArts = [], isLoading } = useQuery({
    queryKey: ['fanArts'],
    queryFn: () => base44.entities.FanArt.filter({ created_by: user?.email }, '-created_date'),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  // Group by folder
  const fanArtsByFolder = fanArts.reduce((acc, fanArt) => {
    const folder = fanArt.folder_name || "Sans dossier";
    if (!acc[folder]) {
      acc[folder] = [];
    }
    acc[folder].push(fanArt);
    return acc;
  }, {});

  const folders = Object.keys(fanArtsByFolder);

  return (
    <div className="p-4 md:p-8 min-h-screen" style={{ backgroundColor: 'var(--cream)' }}>
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-md"
                 style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
              <ImageIcon className="w-7 h-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl md:text-4xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Mes Fan Arts
              </h1>
              <p className="text-lg" style={{ color: 'var(--warm-pink)' }}>
                {fanArts.length} fan art{fanArts.length > 1 ? 's' : ''} • {folders.length} dossier{folders.length > 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowAddDialog(true)}
            className="shadow-lg text-white font-medium px-6 rounded-xl"
            style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
            <Plus className="w-5 h-5 mr-2" />
            Ajouter un fan art
          </Button>
        </div>

        {/* Folder tabs */}
        <div className="mb-6 flex gap-2 overflow-x-auto pb-2">
          <Button
            variant={selectedFolder === "all" ? "default" : "outline"}
            onClick={() => setSelectedFolder("all")}
            className="rounded-xl"
            style={selectedFolder === "all" ? {
              background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
              color: 'white'
            } : {
              borderColor: 'var(--beige)',
              color: 'var(--deep-pink)'
            }}
          >
            Tous ({fanArts.length})
          </Button>
          {folders.map(folder => (
            <Button
              key={folder}
              variant={selectedFolder === folder ? "default" : "outline"}
              onClick={() => setSelectedFolder(folder)}
              className="rounded-xl whitespace-nowrap"
              style={selectedFolder === folder ? {
                background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))',
                color: 'white'
              } : {
                borderColor: 'var(--beige)',
                color: 'var(--deep-pink)'
              }}
            >
              {folder} ({fanArtsByFolder[folder].length})
            </Button>
          ))}
        </div>

        <FanArtGallery 
          fanArts={selectedFolder === "all" ? fanArts : fanArtsByFolder[selectedFolder] || []}
          isLoading={isLoading}
        />

        <AddFanArtDialog 
          open={showAddDialog}
          onOpenChange={setShowAddDialog}
          books={allBooks}
          existingFolders={folders}
        />
      </div>
    </div>
  );
}
