import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Upload, FolderPlus, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function AddFanArtDialog({ open, onOpenChange, books, existingFolders }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [showNewSubfolder, setShowNewSubfolder] = useState(false);
  const [newSubfolderName, setNewSubfolderName] = useState("");
  const [fanArtData, setFanArtData] = useState({
    image_url: "",
    book_id: "",
    folder_path: "",
    artist_name: "",
    source_url: "",
    note: "",
  });

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooksForFanArt', user?.email],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: fanArts = [] } = useQuery({
    queryKey: ['fanArts'],
    queryFn: () => base44.entities.FanArt.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  // Filter to only show books that user has in their library
  const availableBooks = books.filter(book => 
    myBooks.some(ub => ub.book_id === book.id)
  );

  // Get existing subfolders for selected book
  const selectedBookFanArts = fanArtData.book_id 
    ? fanArts.filter(fa => fa.book_id === fanArtData.book_id && fa.folder_path)
    : [];
  
  const existingSubfolders = [...new Set(selectedBookFanArts.map(fa => fa.folder_path))];

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.FanArt.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['fanArts'] });
      toast.success("Fan art ajouté !");
      onOpenChange(false);
      setFanArtData({ image_url: "", book_id: "", folder_path: "", artist_name: "", source_url: "", note: "" });
      setShowNewSubfolder(false);
      setNewSubfolderName("");
    },
  });

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setFanArtData({ ...fanArtData, image_url: result.file_url });
      toast.success("Image uploadée !");
    } catch (error) {
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const selectedBook = availableBooks.find(b => b.id === fanArtData.book_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl" style={{ color: 'var(--deep-brown)' }}>
            🎨 Ajouter un fan art
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div>
            <Label htmlFor="book">Livre associé *</Label>
            <Select value={fanArtData.book_id} onValueChange={(value) => {
              setFanArtData({...fanArtData, book_id: value, folder_path: ""});
              setShowNewSubfolder(false);
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Sélectionnez un livre" />
              </SelectTrigger>
              <SelectContent>
                {availableBooks.map((book) => (
                  <SelectItem key={book.id} value={book.id}>
                    {book.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {fanArtData.book_id && (
            <div className="p-3 rounded-lg" style={{ backgroundColor: 'var(--cream)' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-bold" style={{ color: 'var(--dark-text)' }}>
                  📚 {selectedBook?.title}
                </span>
                <ChevronRight className="w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
                <span className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                  Sous-dossier
                </span>
              </div>

              <div className="space-y-2">
                {existingSubfolders.length > 0 && (
                  <div>
                    <Label className="text-xs">Dossiers existants</Label>
                    <div className="grid grid-cols-2 gap-2 mt-1">
                      {existingSubfolders.map((subfolder) => (
                        <button
                          key={subfolder}
                          onClick={() => {
                            setFanArtData({...fanArtData, folder_path: subfolder});
                            setShowNewSubfolder(false);
                          }}
                          className="p-2 rounded-lg text-left text-sm font-medium transition-all hover:shadow-md"
                          style={{
                            backgroundColor: fanArtData.folder_path === subfolder ? 'var(--soft-pink)' : 'white',
                            color: fanArtData.folder_path === subfolder ? 'white' : 'var(--dark-text)',
                            border: '2px solid',
                            borderColor: fanArtData.folder_path === subfolder ? 'var(--deep-pink)' : 'var(--beige)'
                          }}
                        >
                          📁 {subfolder}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowNewSubfolder(!showNewSubfolder)}
                  className="w-full"
                  style={{ borderColor: 'var(--beige)', color: 'var(--deep-pink)' }}
                >
                  <FolderPlus className="w-4 h-4 mr-2" />
                  {showNewSubfolder ? "Annuler" : "Nouveau sous-dossier"}
                </Button>

                {showNewSubfolder && (
                  <div className="space-y-2">
                    <Input
                      value={newSubfolderName}
                      onChange={(e) => setNewSubfolderName(e.target.value)}
                      placeholder="Ex: Personnages, Scènes, Couples..."
                    />
                    <Button
                      type="button"
                      onClick={() => {
                        if (newSubfolderName.trim()) {
                          setFanArtData({...fanArtData, folder_path: newSubfolderName.trim()});
                          setShowNewSubfolder(false);
                          setNewSubfolderName("");
                        }
                      }}
                      className="w-full"
                      style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))', color: 'white' }}
                    >
                      Créer "{newSubfolderName}"
                    </Button>
                  </div>
                )}
              </div>
            </div>
          )}

          <div>
            <Label>Image *</Label>
            <div className="flex gap-3">
              <Input
                value={fanArtData.image_url}
                onChange={(e) => setFanArtData({...fanArtData, image_url: e.target.value})}
                placeholder="URL de l'image ou..."
              />
              <label className="cursor-pointer">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  disabled={uploading}
                />
                <Button type="button" variant="outline" disabled={uploading} asChild>
                  <span>
                    {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  </span>
                </Button>
              </label>
            </div>
          </div>

          {fanArtData.image_url && (
            <div className="rounded-xl overflow-hidden">
              <img src={fanArtData.image_url} alt="Preview" className="w-full h-64 object-cover" />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="artist">Artiste</Label>
              <Input
                id="artist"
                value={fanArtData.artist_name}
                onChange={(e) => setFanArtData({...fanArtData, artist_name: e.target.value})}
                placeholder="Nom de l'artiste"
              />
            </div>
            <div>
              <Label htmlFor="source">Source URL</Label>
              <Input
                id="source"
                value={fanArtData.source_url}
                onChange={(e) => setFanArtData({...fanArtData, source_url: e.target.value})}
                placeholder="https://..."
              />
            </div>
          </div>

          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={fanArtData.note}
              onChange={(e) => setFanArtData({...fanArtData, note: e.target.value})}
              placeholder="Pourquoi vous aimez ce fan art..."
              rows={3}
            />
          </div>

          <Button
            onClick={() => createMutation.mutate(fanArtData)}
            disabled={!fanArtData.book_id || !fanArtData.image_url || createMutation.isPending}
            className="w-full font-medium py-6"
            style={{ background: 'linear-gradient(135deg, var(--warm-brown), var(--soft-brown))', color: '#000000' }}
          >
            {createMutation.isPending ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Ajout en cours...
              </>
            ) : (
              "Ajouter le fan art"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}