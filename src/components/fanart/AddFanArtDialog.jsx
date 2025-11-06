
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Loader2, Search, BookOpen, X } from "lucide-react";
import { toast } from "sonner";

export default function AddFanArtDialog({ open, onOpenChange, user }) {
  const [imageUrls, setImageUrls] = useState([""]); // Changed from imageUrl to imageUrls (array)
  const [selectedBookId, setSelectedBookId] = useState("");
  const [artistName, setArtistName] = useState("");
  const [note, setNote] = useState(""); // Removed sourceUrl state
  const [folderPath, setFolderPath] = useState("");
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);
  const queryClient = useQueryClient();

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user && open,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
    enabled: open,
  });

  // Filter books based on search query
  const filteredBooks = useMemo(() => {
    if (!searchQuery || searchQuery.length < 2) return [];
    
    const query = searchQuery.toLowerCase().trim();
    
    // Get books from my library
    const myBookIds = myBooks.map(ub => ub.book_id);
    const myLibraryBooks = allBooks.filter(book => myBookIds.includes(book.id));
    
    // Filter by search query
    return myLibraryBooks
      .filter(book => 
        book.title.toLowerCase().includes(query) ||
        book.author.toLowerCase().includes(query)
      )
      .slice(0, 10); // Limit to 10 results
  }, [searchQuery, myBooks, allBooks]);

  const selectedBook = allBooks.find(b => b.id === selectedBookId);

  const createMutation = useMutation({
    mutationFn: async (fanArts) => { // Now expects an array of fan art data
      const promises = fanArts.map(data => base44.entities.FanArt.create(data));
      return await Promise.all(promises);
    },
    onSuccess: (data, fanArts) => { // data is the result of Promise.all, fanArts is the variables passed
      queryClient.invalidateQueries({ queryKey: ['fanArts'] });
      toast.success(`✨ ${fanArts.length} fan art${fanArts.length > 1 ? 's' : ''} ajouté${fanArts.length > 1 ? 's' : ''} !`);
      handleClose();
    },
    onError: (error) => {
      console.error("Error creating fan art:", error);
      toast.error("Erreur lors de l'ajout du fan art");
    }
  });

  const handleClose = () => {
    setImageUrls([""]); // Reset to a single empty input field
    setSelectedBookId("");
    setArtistName("");
    setNote(""); // Removed setSourceUrl
    setFolderPath("");
    setSearchQuery("");
    setShowSuggestions(false);
    onOpenChange(false);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const validUrls = imageUrls.filter(url => url.trim());
    if (validUrls.length === 0) {
      toast.error("Veuillez ajouter au moins une image");
      return;
    }

    const fanArts = validUrls.map(url => ({
      image_url: url.trim(),
      book_id: selectedBookId || undefined,
      artist_name: artistName.trim() || undefined,
      note: note.trim() || undefined,
      folder_path: folderPath.trim() || undefined,
    }));

    createMutation.mutate(fanArts); // Pass the array of fan arts
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []); // Handle multiple files
    if (files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = files.map(file => 
        base44.integrations.Core.UploadFile({ file })
      );
      const results = await Promise.all(uploadPromises);
      
      const newUrls = results.map(r => r.file_url);
      setImageUrls(prev => {
        // Filter out any empty strings from the previous state before adding new ones
        const filtered = prev.filter(url => url.trim()); 
        return [...filtered, ...newUrls];
      });
      
      toast.success(`${files.length} image${files.length > 1 ? 's' : ''} uploadée${files.length > 1 ? 's' : ''} !`);
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploading(false);
    }
  };

  const selectBook = (book) => {
    setSelectedBookId(book.id);
    setSearchQuery(book.title);
    setShowSuggestions(false);
  };

  // Functions to manage multiple image URLs
  const addUrlField = () => {
    setImageUrls([...imageUrls, ""]);
  };

  const removeUrlField = (index) => {
    setImageUrls(imageUrls.filter((_, i) => i !== index));
  };

  const updateUrl = (index, value) => {
    const newUrls = [...imageUrls];
    newUrls[index] = value;
    setImageUrls(newUrls);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2" style={{ color: 'var(--dark-text)' }}>
            🎨 Ajouter un fan art
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          {/* Images */}
          <div>
            <Label>Images *</Label>
            <div className="space-y-3">
              {/* Dynamically rendered URL input fields */}
              {imageUrls.map((url, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Input
                    value={url}
                    onChange={(e) => updateUrl(index, e.target.value)}
                    placeholder="URL de l'image..."
                    className="flex-1"
                  />
                  {imageUrls.length > 1 && ( // Only show remove button if more than one field
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeUrlField(index)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}
              
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={addUrlField}
                  className="flex-1"
                >
                  + Ajouter une URL
                </Button>
                
                <label className="cursor-pointer flex-1">
                  <input
                    type="file"
                    accept="image/*"
                    multiple // Allow multiple file selection
                    onChange={handleFileUpload}
                    className="hidden"
                    disabled={uploading}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={uploading}
                    className="w-full"
                    asChild
                  >
                    <span>
                      {uploading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Upload...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Upload images
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </div>

              {/* Preview section */}
              {imageUrls.some(url => url.trim()) && ( // Only show if at least one URL is present
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {imageUrls.filter(url => url.trim()).map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border">
                      <img src={url} alt={`Preview ${idx + 1}`} className="w-full h-full object-cover" />
                      <Button
                        type="button"
                        size="icon"
                        variant="destructive"
                        className="absolute top-1 right-1 w-6 h-6 rounded-full p-0 flex items-center justify-center z-10"
                        onClick={() => {
                          setImageUrls(prev => {
                            // Find the first occurrence of the URL in the state
                            const indexToRemove = prev.indexOf(url);
                            if (indexToRemove > -1) {
                              const newUrls = prev.filter((_, i) => i !== indexToRemove);
                              // If all URLs are removed (meaning the array is now empty or only contains empty strings),
                              // ensure there's at least one empty string for new input.
                              if (newUrls.length === 0 || !newUrls.some(u => u.trim())) {
                                return [""];
                              }
                              return newUrls;
                            }
                            return prev; // Should not happen if `url` is truly in `prev`
                          });
                        }}
                      >
                        <X className="w-3 h-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Book Selection with Search */}
          <div>
            <Label htmlFor="bookSearch">Livre associé (optionnel)</Label>
            <div className="relative">
              <Input
                id="bookSearch"
                value={showSuggestions ? searchQuery : (selectedBook?.title || searchQuery)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSuggestions(true);
                  if (!e.target.value) {
                    setSelectedBookId("");
                  }
                }}
                onFocus={() => {
                  setShowSuggestions(true);
                  if (selectedBook) {
                    setSearchQuery(selectedBook.title);
                  }
                }}
                onBlur={() => {
                  setTimeout(() => setShowSuggestions(false), 200);
                }}
                placeholder="Rechercher un livre de votre bibliothèque..."
                className="pr-10"
              />
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />

              {/* Autocomplete dropdown */}
              {showSuggestions && searchQuery.length >= 2 && filteredBooks.length > 0 && (
                <div className="absolute z-50 w-full mt-1 bg-white rounded-lg shadow-lg border-2 max-h-64 overflow-y-auto"
                     style={{ borderColor: 'var(--beige)' }}>
                  {filteredBooks.map((book) => (
                    <button
                      key={book.id}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        selectBook(book);
                      }}
                      className="w-full flex items-center gap-3 p-3 hover:bg-pink-50 transition-colors text-left"
                    >
                      <div className="w-12 h-16 rounded overflow-hidden flex-shrink-0"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        {book.cover_url ? (
                          <img src={book.cover_url} alt={book.title} 
                               className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <BookOpen className="w-6 h-6" style={{ color: 'var(--warm-pink)' }} />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm line-clamp-1" 
                           style={{ color: 'var(--dark-text)' }}>
                          {book.title}
                        </p>
                        <p className="text-xs line-clamp-1" 
                           style={{ color: 'var(--warm-pink)' }}>
                          {book.author}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {selectedBook && (
              <div className="mt-2 flex items-center gap-2 p-2 rounded-lg" 
                   style={{ backgroundColor: 'var(--cream)' }}>
                <div className="w-10 h-14 rounded overflow-hidden flex-shrink-0"
                     style={{ backgroundColor: 'var(--beige)' }}>
                  {selectedBook.cover_url ? (
                    <img src={selectedBook.cover_url} alt={selectedBook.title} 
                         className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
                    </div>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold line-clamp-1" style={{ color: 'var(--dark-text)' }}>
                    {selectedBook.title}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                    {selectedBook.author}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Folder Path */}
          <div>
            <Label htmlFor="folderPath">Dossier (optionnel)</Label>
            <Input
              id="folderPath"
              value={folderPath}
              onChange={(e) => setFolderPath(e.target.value)}
              placeholder="Ex: ACOTAR/Rhysand ou Keleana/Personnages"
            />
            <p className="text-xs mt-1" style={{ color: 'var(--warm-pink)' }}>
              Organisez vos fan arts par dossier pour mieux les retrouver
            </p>
          </div>

          {/* Artist Name */}
          <div>
            <Label htmlFor="artistName">Artiste</Label>
            <Input
              id="artistName"
              value={artistName}
              onChange={(e) => setArtistName(e.target.value)}
              placeholder="Nom de l'artiste"
            />
          </div>

          {/* Removed Source URL section */}

          {/* Note */}
          <div>
            <Label htmlFor="note">Note</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Pourquoi vous aimez ce fan art..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={createMutation.isPending || !imageUrls.some(url => url.trim())} // Disable if no valid URLs
              className="text-white font-medium"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}
            >
              {createMutation.isPending ? "Ajout..." : `Ajouter ${imageUrls.filter(u => u.trim()).length} fan art${imageUrls.filter(u => u.trim()).length > 1 ? 's' : ''}`}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
