import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, AlertTriangle, Trash2, Eye, EyeOff, UserPlus, Mail, Search, Check, Upload, X, Loader2, Heart, Smile, Music, BookOpen, Edit2, Calendar } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const EMOJI_REACTIONS = ["❤️", "😂", "😍", "😱", "😭", "🔥", "👏", "🤯"];

export default function SharedReadingDetailsDialog({ reading, book, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState(null);
  const [newMessage, setNewMessage] = useState({
    message: "",
    chapter: "",
    is_spoiler: false,
    photo_url: "",
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [revealedSpoilers, setRevealedSpoilers] = useState(new Set());
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFriends, setSelectedFriends] = useState([]);
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedStartDate, setEditedStartDate] = useState("");

  const { data: user } = useQuery({
    queryKey: ['me'],
    queryFn: () => base44.auth.me(),
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['sharedReadingMessages', reading.id],
    queryFn: () => base44.entities.SharedReadingMessage.filter({ 
      shared_reading_id: reading.id 
    }, 'created_date'),
    enabled: !!reading.id,
  });

  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ created_by: user?.email, status: "Acceptée" }),
    enabled: !!user && open,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  const { data: musicBooks = [] } = useQuery({
    queryKey: ['musicBooks', reading.book_id],
    queryFn: async () => {
      const userBooks = await base44.entities.UserBook.filter({ 
        book_id: reading.book_id,
        created_by: user?.email
      });
      return userBooks.filter(ub => ub.music_playlist && ub.music_playlist.length > 0);
    },
    enabled: !!reading.book_id && !!user && open,
  });

  // Calculate number of days for the reading
  const numberOfDays = reading.start_date && reading.end_date 
    ? differenceInDays(new Date(reading.end_date), new Date(reading.start_date)) + 1
    : 0;

  // Calculate current day based on dates
  const getCurrentDay = () => {
    if (!reading.start_date) return 1;
    const now = new Date();
    const start = new Date(reading.start_date);
    const daysPassed = differenceInDays(now, start) + 1;
    return Math.max(1, Math.min(daysPassed, numberOfDays));
  };

  // Auto-select current day on mount
  useEffect(() => {
    if (numberOfDays > 0 && !selectedDay) {
      setSelectedDay(getCurrentDay());
    }
  }, [numberOfDays]);

  // Initialize edit date when opening dialog
  useEffect(() => {
    if (open && reading.start_date) {
      setEditedStartDate(reading.start_date);
    }
  }, [open, reading.start_date]);

  // Get day status
  const getDayStatus = (day) => {
    const currentDay = getCurrentDay();
    if (day < currentDay) return 'completed';
    if (day === currentDay) return 'current';
    return 'upcoming';
  };

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.SharedReadingMessage.create({
      ...data,
      shared_reading_id: reading.id,
      day_number: selectedDay,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadingMessages', reading.id] });
      setNewMessage({ message: "", chapter: "", is_spoiler: false, photo_url: "" });
      toast.success("Message envoyé !");
    },
  });

  const deleteMessageMutation = useMutation({
    mutationFn: (id) => base44.entities.SharedReadingMessage.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadingMessages', reading.id] });
      toast.success("Message supprimé");
    },
  });

  const reactToMessageMutation = useMutation({
    mutationFn: async ({ messageId, emoji }) => {
      const message = messages.find(m => m.id === messageId);
      const reactions = message.reactions || {};
      const userReactions = reactions[user.email] || [];
      
      const newUserReactions = userReactions.includes(emoji)
        ? userReactions.filter(e => e !== emoji)
        : [...userReactions, emoji];
      
      await base44.entities.SharedReadingMessage.update(messageId, {
        reactions: {
          ...reactions,
          [user.email]: newUserReactions
        }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadingMessages'] });
      setShowEmojiPicker(null);
    },
  });

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setNewMessage({ ...newMessage, photo_url: result.file_url });
      toast.success("Photo uploadée !");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const updateStartDateMutation = useMutation({
    mutationFn: async (newStartDate) => {
      // Calculate new end date to maintain the same duration
      if (reading.end_date && reading.start_date) {
        const originalDuration = differenceInDays(new Date(reading.end_date), new Date(reading.start_date));
        const newEndDate = new Date(newStartDate);
        newEndDate.setDate(newEndDate.getDate() + originalDuration);
        
        await base44.entities.SharedReading.update(reading.id, {
          start_date: newStartDate,
          end_date: newEndDate.toISOString().split('T')[0]
        });
      } else {
        await base44.entities.SharedReading.update(reading.id, {
          start_date: newStartDate
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadings'] });
      setIsEditing(false);
      toast.success("✅ Date de début modifiée !");
    },
    onError: (error) => {
      console.error("Error updating date:", error);
      toast.error("Erreur lors de la modification");
    }
  });

  const deleteReadingMutation = useMutation({
    mutationFn: async () => {
      // Delete all messages first
      const allMessages = await base44.entities.SharedReadingMessage.filter({ 
        shared_reading_id: reading.id 
      });
      await Promise.all(allMessages.map(msg => base44.entities.SharedReadingMessage.delete(msg.id)));
      
      // Then delete the reading
      await base44.entities.SharedReading.delete(reading.id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadings'] });
      toast.success("🗑️ Lecture commune supprimée");
      onOpenChange(false);
    },
    onError: (error) => {
      console.error("Error deleting reading:", error);
      toast.error("Erreur lors de la suppression");
    }
  });

  const inviteFriendsMutation = useMutation({
    mutationFn: async (friendsToInvite) => {
      const currentParticipants = reading.participants || [];
      const newParticipants = [...new Set([...currentParticipants, ...friendsToInvite])];
      
      await base44.entities.SharedReading.update(reading.id, {
        participants: newParticipants
      });
      
      const notificationPromises = friendsToInvite.map(friendEmail =>
        base44.entities.Notification.create({
          type: "shared_reading_update",
          title: "Invitation à une lecture commune",
          message: `${user?.display_name || user?.full_name || 'Une amie'} vous a invitée à lire "${book?.title}"`,
          link_type: "shared_reading",
          link_id: reading.id,
          created_by: friendEmail,
          from_user: user?.email,
        })
      );

      await Promise.all(notificationPromises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadings'] });
      setSelectedFriends([]);
      setSearchQuery("");
      toast.success("✅ Invitations envoyées !");
    },
    onError: (error) => {
      console.error("Error inviting friends:", error);
      toast.error("Erreur lors de l'envoi des invitations");
    }
  });

  const toggleSpoiler = (messageId) => {
    setRevealedSpoilers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(messageId)) {
        newSet.delete(messageId);
      } else {
        newSet.add(messageId);
      }
      return newSet;
    });
  };

  const toggleFriend = (friendEmail) => {
    setSelectedFriends(prev =>
      prev.includes(friendEmail)
        ? prev.filter(email => email !== friendEmail)
        : [...prev, friendEmail]
    );
  };

  const availableFriends = myFriends.filter(f => 
    !(reading.participants || []).includes(f.friend_email) &&
    !(reading.pending_invitations || []).includes(f.friend_email)
  );

  const filteredFriends = availableFriends.filter(f =>
    (f.friend_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.friend_email?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Get user info helper
  const getUserInfo = (email) => {
    const userProfile = allUsers.find(u => u.email === email);
    const friend = myFriends.find(f => f.friend_email === email);
    return {
      name: friend?.friend_name || userProfile?.display_name || userProfile?.full_name || email.split('@')[0],
      picture: userProfile?.profile_picture,
      email
    };
  };

  // Group messages for continuous flow with day separators
  const groupedMessages = messages.reduce((acc, msg) => {
    const day = msg.day_number;
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4" style={{ borderColor: '#E6B3E8' }}>
          <DialogTitle className="text-2xl" style={{ color: 'var(--deep-brown)' }}>
            {reading.title}
          </DialogTitle>
          <p style={{ color: 'var(--warm-brown)' }}>
            {book?.title} - {book?.author}
          </p>
          {user?.email === reading.created_by && (
            <div className="mt-3">
              <Button
                variant="destructive"
                size="sm"
                onClick={() => {
                  if (window.confirm("Êtes-vous sûre de vouloir supprimer cette lecture commune ? Tous les messages seront également supprimés.")) {
                    deleteReadingMutation.mutate();
                  }
                }}
                disabled={deleteReadingMutation.isPending}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Supprimer la lecture
              </Button>
            </div>
          )}
        </DialogHeader>

        <Tabs defaultValue="discussion" className="flex-1 flex flex-col overflow-hidden">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="discussion" style={{ color: '#000000' }}>💬 Discussion</TabsTrigger>
            <TabsTrigger value="program" style={{ color: '#000000' }}>📅 Programme</TabsTrigger>
            <TabsTrigger value="participants" style={{ color: '#000000' }}>👥 Participants</TabsTrigger>
            <TabsTrigger value="music" style={{ color: '#000000' }}>🎵 Ambiance</TabsTrigger>
          </TabsList>

          <TabsContent value="discussion" className="flex-1 flex flex-col overflow-hidden">
            {/* Day selector with status colors */}
            {numberOfDays > 0 && (
              <div className="p-4 mb-4 rounded-xl" style={{ backgroundColor: '#FFF0F6' }}>
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-sm font-bold" style={{ color: 'var(--dark-text)' }}>
                    📅 Programme de lecture
                  </Label>
                  <span className="text-xs px-3 py-1 rounded-full font-bold text-white"
                        style={{ backgroundColor: '#FF1493' }}>
                    Jour {getCurrentDay()}/{numberOfDays}
                  </span>
                </div>
                <div className="grid grid-cols-7 gap-2">
                  {Array.from({ length: numberOfDays }, (_, i) => i + 1).map(day => {
                    const status = getDayStatus(day);
                    const statusColors = {
                      completed: { bg: '#98D8C8', text: 'white', border: '#4DB3A0' },
                      current: { bg: '#FF1493', text: 'white', border: '#FF0080' },
                      upcoming: { bg: 'white', text: '#999', border: '#E0E0E0' }
                    };
                    const colors = statusColors[status];
                    
                    return (
                      <Button
                        key={day}
                        size="sm"
                        onClick={() => setSelectedDay(day)}
                        className={`relative ${selectedDay === day ? 'ring-2' : ''}`}
                        style={{
                          backgroundColor: colors.bg,
                          color: colors.text,
                          borderColor: colors.border,
                          border: '2px solid',
                          fontWeight: selectedDay === day ? 'bold' : 'normal',
                          ringColor: '#FF69B4'
                        }}
                      >
                        {status === 'completed' && <span className="absolute -top-1 -right-1">✓</span>}
                        J{day}
                      </Button>
                    );
                  })}
                </div>
                {reading.chapters_per_day && (
                  <p className="text-xs mt-2 text-center" style={{ color: 'var(--warm-pink)' }}>
                    📖 {reading.chapters_per_day} chapitre{reading.chapters_per_day > 1 ? 's' : ''} par jour
                  </p>
                )}
              </div>
            )}

            {/* Participants avatars */}
            <div className="flex items-center gap-2 px-4 mb-4">
              <span className="text-sm font-medium" style={{ color: 'var(--warm-pink)' }}>
                Tu lis avec :
              </span>
              <div className="flex -space-x-2">
                {(reading.participants || []).filter(email => email !== user?.email).slice(0, 5).map((email, idx) => {
                  const userInfo = getUserInfo(email);
                  return (
                    <div key={idx} 
                         className="w-8 h-8 rounded-full border-2 border-white overflow-hidden"
                         style={{ backgroundColor: '#FF69B4' }}
                         title={userInfo.name}>
                      {userInfo.picture ? (
                        <img src={userInfo.picture} alt={userInfo.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-white text-xs font-bold">
                          {userInfo.name[0]?.toUpperCase()}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {(reading.participants || []).length > 6 && (
                <span className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                  +{(reading.participants || []).length - 6}
                </span>
              )}
            </div>

            {/* Messages area */}
            <div className="flex-1 overflow-y-auto px-4 space-y-4 mb-4">
              {Object.keys(groupedMessages).sort((a, b) => a - b).map(day => (
                <div key={day}>
                  {/* Day separator */}
                  <div className="flex items-center gap-3 my-4">
                    <div className="flex-1 h-px" style={{ backgroundColor: '#FFE1F0' }} />
                    <span className="text-xs font-bold px-3 py-1 rounded-full"
                          style={{ backgroundColor: '#FFE1F0', color: '#FF1493' }}>
                      Jour {day}
                    </span>
                    <div className="flex-1 h-px" style={{ backgroundColor: '#FFE1F0' }} />
                  </div>

                  {/* Messages for this day */}
                  {groupedMessages[day].map((msg) => {
                    const isSpoilerRevealed = revealedSpoilers.has(msg.id);
                    const isMyMessage = msg.created_by === user?.email;
                    const userInfo = getUserInfo(msg.created_by);
                    const allReactions = msg.reactions || {};
                    const reactionCounts = {};
                    Object.values(allReactions).flat().forEach(emoji => {
                      reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
                    });
                    
                    return (
                      <div
                        key={msg.id}
                        className={`flex gap-3 ${isMyMessage ? 'flex-row-reverse' : 'flex-row'}`}
                      >
                        {/* Avatar */}
                        {!isMyMessage && (
                          <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden"
                               style={{ backgroundColor: '#FF69B4' }}>
                            {userInfo.picture ? (
                              <img src={userInfo.picture} alt={userInfo.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                {userInfo.name[0]?.toUpperCase()}
                              </div>
                            )}
                          </div>
                        )}

                        {/* Message bubble */}
                        <div className={`max-w-[70%] ${isMyMessage ? 'items-end' : 'items-start'} flex flex-col`}>
                          {!isMyMessage && (
                            <span className="text-xs font-medium mb-1 px-3" style={{ color: 'var(--warm-pink)' }}>
                              {userInfo.name}
                            </span>
                          )}

                          <div
                            className="rounded-2xl px-4 py-3 shadow-md"
                            style={{
                              backgroundColor: isMyMessage ? '#FF1493' : 'white',
                              color: isMyMessage ? 'white' : '#333',
                              borderRadius: isMyMessage ? '20px 20px 4px 20px' : '20px 20px 20px 4px'
                            }}
                          >
                            {msg.photo_url && (
                              <div className="mb-2 rounded-lg overflow-hidden cursor-pointer"
                                   onClick={() => window.open(msg.photo_url, '_blank')}>
                                <img 
                                  src={msg.photo_url} 
                                  alt="Photo" 
                                  className="w-full max-h-48 object-cover hover:scale-105 transition-transform" 
                                />
                              </div>
                            )}

                            {msg.chapter && (
                              <p className="text-xs font-bold mb-1 opacity-80">
                                📖 {msg.chapter}
                              </p>
                            )}

                            {msg.is_spoiler && !isSpoilerRevealed ? (
                              <div className="text-center py-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => toggleSpoiler(msg.id)}
                                  className="text-xs"
                                  style={{ color: isMyMessage ? 'white' : 'var(--deep-pink)' }}
                                >
                                  <Eye className="w-3 h-3 mr-1" />
                                  Révéler le spoiler
                                </Button>
                              </div>
                            ) : (
                              <p className="text-sm leading-relaxed whitespace-pre-wrap">
                                {msg.message}
                              </p>
                            )}

                            <p className="text-xs mt-2 opacity-70">
                              {format(new Date(msg.created_date), 'HH:mm', { locale: fr })}
                            </p>
                          </div>

                          {/* Reactions */}
                          <div className="flex items-center gap-1 mt-1 px-2">
                            {Object.entries(reactionCounts).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                onClick={() => reactToMessageMutation.mutate({ messageId: msg.id, emoji })}
                                className="px-2 py-0.5 rounded-full text-xs flex items-center gap-1 hover:scale-110 transition-transform"
                                style={{ 
                                  backgroundColor: (allReactions[user?.email] || []).includes(emoji) ? '#FFE1F0' : '#F5F5F5'
                                }}
                              >
                                <span>{emoji}</span>
                                <span className="font-bold">{count}</span>
                              </button>
                            ))}
                            <button
                              onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                              className="w-6 h-6 rounded-full flex items-center justify-center hover:bg-gray-100"
                            >
                              <Smile className="w-4 h-4" style={{ color: 'var(--warm-pink)' }} />
                            </button>
                          </div>

                          {/* Emoji picker */}
                          {showEmojiPicker === msg.id && (
                            <div className="flex gap-1 mt-1 p-2 rounded-lg bg-white shadow-lg border"
                                 style={{ borderColor: '#FFE1F0' }}>
                              {EMOJI_REACTIONS.map(emoji => (
                                <button
                                  key={emoji}
                                  onClick={() => reactToMessageMutation.mutate({ messageId: msg.id, emoji })}
                                  className="text-lg hover:scale-125 transition-transform"
                                >
                                  {emoji}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Delete button for own messages */}
                          {isMyMessage && (
                            <button
                              onClick={() => deleteMessageMutation.mutate(msg.id)}
                              className="text-xs mt-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                              style={{ color: '#FF0000' }}
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ))}

              {messages.length === 0 && (
                <div className="text-center py-12" style={{ color: 'var(--warm-brown)' }}>
                  💬 Aucun message encore. Lancez la discussion !
                </div>
              )}
            </div>

            {/* Fixed message input at bottom */}
            <div className="border-t p-4" style={{ 
              backgroundColor: 'white',
              borderColor: '#FFE1F0',
              boxShadow: '0 -4px 12px rgba(255, 20, 147, 0.1)'
            }}>
              <div className="space-y-2">
                {newMessage.photo_url && (
                  <div className="relative inline-block">
                    <img 
                      src={newMessage.photo_url} 
                      alt="Preview" 
                      className="w-20 h-20 rounded-lg object-cover" 
                    />
                    <Button
                      size="icon"
                      variant="destructive"
                      className="absolute -top-2 -right-2 w-6 h-6"
                      onClick={() => setNewMessage({...newMessage, photo_url: ""})}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                )}

                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Textarea
                      value={newMessage.message}
                      onChange={(e) => setNewMessage({...newMessage, message: e.target.value})}
                      placeholder={`Message pour le Jour ${selectedDay || 1}...`}
                      rows={2}
                      className="resize-none rounded-xl border-2"
                      style={{ borderColor: '#FFE1F0' }}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && newMessage.message.trim()) {
                          e.preventDefault();
                          sendMessageMutation.mutate(newMessage);
                        }
                      }}
                    />
                  </div>
                  
                  <div className="flex flex-col gap-2">
                    <label className="cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                        disabled={uploadingPhoto}
                      />
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="icon"
                        disabled={uploadingPhoto}
                        className="rounded-full"
                        asChild
                      >
                        <span>
                          {uploadingPhoto ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Upload className="w-4 h-4" />
                          )}
                        </span>
                      </Button>
                    </label>

                    <Button
                      onClick={() => sendMessageMutation.mutate(newMessage)}
                      disabled={!newMessage.message.trim() || sendMessageMutation.isPending}
                      size="icon"
                      className="rounded-full text-white shadow-lg"
                      style={{ backgroundColor: '#FF1493' }}
                    >
                      <Send className="w-4 h-4" />
                    </Button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Input
                      value={newMessage.chapter}
                      onChange={(e) => setNewMessage({...newMessage, chapter: e.target.value})}
                      placeholder="Chapitre..."
                      className="w-32 h-8 text-xs"
                    />
                    <div className="flex items-center gap-2">
                      <Switch
                        id="spoiler"
                        checked={newMessage.is_spoiler}
                        onCheckedChange={(checked) => setNewMessage({...newMessage, is_spoiler: checked})}
                      />
                      <Label htmlFor="spoiler" className="text-xs cursor-pointer">
                        ⚠️ Spoiler
                      </Label>
                    </div>
                  </div>
                  <span className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                    Entrée pour envoyer
                  </span>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="program" className="py-4 overflow-y-auto">
            <div className="space-y-4">
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold" style={{ color: 'var(--deep-brown)' }}>
                    📅 Programme de lecture
                  </h3>
                  {user?.email === reading.created_by && !isEditing && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit2 className="w-4 h-4 mr-2" />
                      Modifier
                    </Button>
                  )}
                </div>
                {reading.start_date && reading.end_date ? (
                  <div className="space-y-3 text-sm">
                    {isEditing ? (
                      <div className="space-y-3 p-3 rounded-lg" style={{ backgroundColor: 'white' }}>
                        <div>
                          <Label className="mb-2 flex items-center gap-2">
                            <Calendar className="w-4 h-4" />
                            Nouvelle date de début
                          </Label>
                          <Input
                            type="date"
                            value={editedStartDate}
                            onChange={(e) => setEditedStartDate(e.target.value)}
                          />
                          <p className="text-xs mt-1" style={{ color: 'var(--warm-pink)' }}>
                            💡 La durée sera conservée
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateStartDateMutation.mutate(editedStartDate)}
                            disabled={!editedStartDate || updateStartDateMutation.isPending}
                            className="flex-1"
                            style={{ backgroundColor: 'var(--deep-pink)', color: 'white' }}
                          >
                            {updateStartDateMutation.isPending ? (
                              <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Modification...
                              </>
                            ) : (
                              'Enregistrer'
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setIsEditing(false);
                              setEditedStartDate(reading.start_date);
                            }}
                          >
                            Annuler
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p style={{ color: 'var(--warm-brown)' }}>
                          <strong>Début :</strong> {format(new Date(reading.start_date), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                        <p style={{ color: 'var(--warm-brown)' }}>
                          <strong>Fin :</strong> {format(new Date(reading.end_date), 'dd MMMM yyyy', { locale: fr })}
                        </p>
                        <p style={{ color: 'var(--warm-brown)' }}>
                          <strong>Durée :</strong> {numberOfDays} jour{numberOfDays > 1 ? 's' : ''}
                        </p>
                        {reading.chapters_per_day && (
                          <p style={{ color: 'var(--warm-brown)' }}>
                            <strong>Rythme :</strong> {reading.chapters_per_day} chapitre{reading.chapters_per_day > 1 ? 's' : ''} par jour
                          </p>
                        )}
                      </>
                    )}
                  </div>
                ) : (
                  <p className="text-sm" style={{ color: 'var(--warm-brown)' }}>
                    Aucun programme défini
                  </p>
                )}
              </div>

              {book && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                  <h3 className="font-semibold mb-3" style={{ color: 'var(--deep-brown)' }}>
                    📖 À propos du livre
                  </h3>
                  <div className="flex gap-4">
                    {book.cover_url && (
                      <div className="w-24 h-36 rounded-lg overflow-hidden shadow-md flex-shrink-0"
                           style={{ backgroundColor: 'var(--beige)' }}>
                        <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="font-bold mb-1" style={{ color: 'var(--deep-brown)' }}>
                        {book.title}
                      </p>
                      <p className="text-sm mb-2" style={{ color: 'var(--warm-brown)' }}>
                        par {book.author}
                      </p>
                      {book.synopsis && (
                        <p className="text-xs line-clamp-4" style={{ color: 'var(--warm-brown)' }}>
                          {book.synopsis}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="participants" className="py-4 overflow-y-auto">
            <div className="space-y-4">
              {/* Invite friends with selection UI */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                <h3 className="font-semibold mb-3 flex items-center gap-2" style={{ color: 'var(--deep-brown)' }}>
                  <UserPlus className="w-5 h-5" />
                  Inviter des amies
                </h3>

                {availableFriends.length > 0 ? (
                  <>
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                              style={{ color: 'var(--warm-pink)' }} />
                      <Input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Rechercher une amie..."
                        className="pl-10 bg-white"
                      />
                    </div>

                    <div className="space-y-2 max-h-48 overflow-y-auto mb-3">
                      {filteredFriends.map((friend) => (
                        <div
                          key={friend.id}
                          onClick={() => toggleFriend(friend.friend_email)}
                          className="flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-all hover:shadow-md"
                          style={{
                            backgroundColor: selectedFriends.includes(friend.friend_email) ? 'var(--soft-pink)' : 'white',
                            border: '2px solid',
                            borderColor: selectedFriends.includes(friend.friend_email) ? 'var(--deep-pink)' : 'var(--beige)',
                          }}
                        >
                          <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-sm"
                               style={{ background: 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
                            {friend.friend_name?.[0]?.toUpperCase() || friend.friend_email?.[0]?.toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm"
                               style={{ color: selectedFriends.includes(friend.friend_email) ? 'white' : 'var(--dark-text)' }}>
                              {friend.friend_name || friend.friend_email}
                            </p>
                          </div>
                          {selectedFriends.includes(friend.friend_email) && (
                            <Check className="w-5 h-5 text-white" />
                          )}
                        </div>
                      ))}
                    </div>

                    {selectedFriends.length > 0 && (
                      <Button
                        onClick={() => inviteFriendsMutation.mutate(selectedFriends)}
                        disabled={inviteFriendsMutation.isPending}
                        className="w-full text-white"
                        style={{ backgroundColor: 'var(--deep-pink)' }}
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        Inviter {selectedFriends.length} amie{selectedFriends.length > 1 ? 's' : ''}
                      </Button>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-center py-4" style={{ color: 'var(--warm-pink)' }}>
                    Toutes vos amies sont déjà invitées ou participent
                  </p>
                )}
              </div>

              {/* Current participants */}
              <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                <h3 className="font-semibold mb-3" style={{ color: 'var(--deep-brown)' }}>
                  👥 Participantes ({(reading.participants || []).length})
                </h3>
                <div className="space-y-2">
                  {(reading.participants || []).map((email, idx) => {
                    const userInfo = getUserInfo(email);
                    return (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded-lg"
                           style={{ backgroundColor: 'white' }}>
                        <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white font-bold"
                             style={{ backgroundColor: 'var(--deep-pink)' }}>
                          {userInfo.picture ? (
                            <img src={userInfo.picture} alt={userInfo.name} className="w-full h-full object-cover" />
                          ) : (
                            userInfo.name[0]?.toUpperCase()
                          )}
                        </div>
                        <span className="text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
                          {userInfo.name}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Pending invitations */}
              {reading.pending_invitations && reading.pending_invitations.length > 0 && (
                <div className="p-4 rounded-xl" style={{ backgroundColor: 'var(--cream)' }}>
                  <h3 className="font-semibold mb-3" style={{ color: 'var(--deep-brown)' }}>
                    ⏳ Invitations en attente ({reading.pending_invitations.length})
                  </h3>
                  <div className="space-y-2">
                    {reading.pending_invitations.map((email, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 rounded-lg"
                           style={{ backgroundColor: 'white' }}>
                        <div className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
                             style={{ backgroundColor: 'var(--warm-pink)' }}>
                          {email[0].toUpperCase()}
                        </div>
                        <span className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                          {email}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="music" className="py-4 overflow-y-auto">
            <div className="space-y-4">
              {musicBooks.length > 0 ? (
                musicBooks.map(userBook => (
                  <div key={userBook.id} className="space-y-3">
                    <h3 className="font-semibold flex items-center gap-2" style={{ color: 'var(--deep-brown)' }}>
                      <Music className="w-5 h-5" />
                      Playlist pour cette lecture ({userBook.music_playlist.length})
                    </h3>
                    <div className="grid gap-3">
                      {userBook.music_playlist.map((music, idx) => (
                        <div key={idx} className="p-4 rounded-xl flex items-center gap-4"
                             style={{ backgroundColor: '#FFF0F6' }}>
                          <Music className="w-8 h-8 flex-shrink-0" style={{ color: '#FF1493' }} />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold truncate" style={{ color: 'var(--dark-text)' }}>
                              {music.title}
                            </p>
                            {music.artist && (
                              <p className="text-sm truncate" style={{ color: 'var(--warm-pink)' }}>
                                {music.artist}
                              </p>
                            )}
                          </div>
                          {music.link && (
                            <a href={music.link} target="_blank" rel="noopener noreferrer">
                              <Button size="sm" style={{ backgroundColor: '#FF1493', color: 'white' }}>
                                🎵 Écouter
                              </Button>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12" style={{ color: 'var(--warm-brown)' }}>
                  <Music className="w-16 h-16 mx-auto mb-4 opacity-20" />
                  <p>Aucune musique associée à ce livre</p>
                  <p className="text-sm mt-2">Ajoutez une playlist depuis votre bibliothèque !</p>
                </div>
              )}
            </div>
          </TabsContent>

        </Tabs>
      </DialogContent>
    </Dialog>
  );
}