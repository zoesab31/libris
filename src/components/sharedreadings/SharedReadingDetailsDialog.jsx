import React, { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Upload, X, Loader2, Smile, Trash2, Eye, EyeOff } from "lucide-react";
import { format, differenceInCalendarDays, startOfDay, parseISO } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";

const EMOJI_REACTIONS = ["❤️", "😂", "😍", "😱", "😭", "🔥", "👏", "🤯"];

export default function SharedReadingDetailsDialog({ reading, book, open, onOpenChange }) {
  const queryClient = useQueryClient();
  const [selectedDay, setSelectedDay] = useState(null);
  const [newMessage, setNewMessage] = useState("");
  const [newChapter, setNewChapter] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(null);
  const [uploadingPlanningImage, setUploadingPlanningImage] = useState(false);
  const [customEmoji, setCustomEmoji] = useState("");
  const [isSpoiler, setIsSpoiler] = useState(false);
  const [revealedSpoilers, setRevealedSpoilers] = useState(new Set());
  const [lastOpenDate, setLastOpenDate] = useState(null);
  const messagesEndRef = useRef(null);

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

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: open,
  });

  const numberOfDays = reading.start_date && reading.end_date 
    ? differenceInCalendarDays(parseISO(reading.end_date), parseISO(reading.start_date)) + 1
    : 0;

  const getCurrentDay = () => {
    if (!reading.start_date) return 1;
    
    const today = startOfDay(new Date());
    const startDate = startOfDay(parseISO(reading.start_date));
    
    const daysPassed = differenceInCalendarDays(today, startDate);
    
    return Math.max(1, Math.min(daysPassed + 1, numberOfDays));
  };

  useEffect(() => {
    if (numberOfDays > 0 && selectedDay === null) {
      const currentDay = getCurrentDay();
      setSelectedDay(currentDay);
    }
  }, [numberOfDays]);

  // Auto-select day based on chapter number
  useEffect(() => {
    if (newChapter && reading.chapters_per_day) {
      const chapterNum = parseInt(newChapter);
      if (!isNaN(chapterNum) && chapterNum > 0) {
        const calculatedDay = Math.ceil(chapterNum / reading.chapters_per_day);
        if (calculatedDay > 0 && calculatedDay <= numberOfDays) {
          setSelectedDay(calculatedDay);
        }
      }
    }
  }, [newChapter, reading.chapters_per_day, numberOfDays]);

  // Reset revealed spoilers when dialog opens or day changes
  useEffect(() => {
    if (open) {
      const today = new Date().toDateString();
      if (lastOpenDate !== today) {
        // Reset revealed spoilers for current day's messages
        const currentDay = getCurrentDay();
        setRevealedSpoilers(prev => {
          const newRevealed = new Set(prev);
          messages.forEach(msg => {
            // Remove from revealed if it's from today or future days
            if (msg.day_number >= currentDay && msg.is_spoiler) {
              newRevealed.delete(msg.id);
            }
          });
          return newRevealed;
        });
        setLastOpenDate(today);
      }
    }
  }, [open, messages]);

  // Scroll to bottom when messages change or dialog opens
  useEffect(() => {
    if (open && messagesEndRef.current && selectedDay !== 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages, open, selectedDay]);

  const sendMessageMutation = useMutation({
    mutationFn: (data) => base44.entities.SharedReadingMessage.create({
      ...data,
      shared_reading_id: reading.id,
      day_number: selectedDay,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadingMessages', reading.id] });
      setNewMessage("");
      setNewChapter("");
      setPhotoUrl("");
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
      setPhotoUrl(result.file_url);
      toast.success("Photo uploadée !");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const handleSendMessage = () => {
    if (!newMessage.trim()) return;
    
    sendMessageMutation.mutate({
      message: newMessage,
      chapter: newChapter,
      photo_url: photoUrl,
      is_spoiler: isSpoiler,
    });
    setIsSpoiler(false);
  };

  const updatePlanningImageMutation = useMutation({
    mutationFn: (imageUrl) => base44.entities.SharedReading.update(reading.id, {
      planning_image: imageUrl
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sharedReadings'] });
      toast.success("Image du planning ajoutée !");
    },
  });

  const handlePlanningImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPlanningImage(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      await updatePlanningImageMutation.mutateAsync(result.file_url);
    } catch (error) {
      console.error("Error uploading planning image:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingPlanningImage(false);
    }
  };

  const getUserInfo = (email) => {
    const userProfile = allUsers.find(u => u.email === email);
    return {
      name: userProfile?.display_name || userProfile?.full_name || email.split('@')[0],
      picture: userProfile?.profile_picture,
      email
    };
  };

  const groupedMessages = messages.reduce((acc, msg) => {
    const day = msg.day_number;
    if (!acc[day]) acc[day] = [];
    acc[day].push(msg);
    return acc;
  }, {});

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-hidden flex flex-col p-0">
        {/* Header */}
        <div className="px-4 py-3 border-b" style={{ 
          borderColor: '#E91E63',
          backgroundColor: '#FFF0F6'
        }}>
          <h2 className="text-lg font-bold truncate" style={{ color: '#C2185B' }}>
            {book?.title}
          </h2>
          {reading.start_date && reading.end_date && (
            <p className="text-sm font-medium" style={{ color: '#E91E63' }}>
              {format(new Date(reading.start_date), 'dd MMM', { locale: fr })} - {format(new Date(reading.end_date), 'dd MMM', { locale: fr })}
            </p>
          )}
        </div>

        {/* Day selector */}
        {numberOfDays > 0 && (
          <div className="px-2 py-3 flex items-center gap-2 border-b overflow-x-auto"
               style={{ 
                 borderColor: '#FFD6E8',
                 backgroundColor: '#FFFAFC'
               }}>
            <Button
              size="sm"
              onClick={() => setSelectedDay(0)}
              className="h-10 md:h-9 min-w-[56px] md:min-w-[44px] px-3 md:px-2 text-sm md:text-xs rounded-lg shrink-0 font-bold"
              style={{
                backgroundColor: selectedDay === 0 ? '#FF1493' : '#FFE4EC',
                color: selectedDay === 0 ? 'white' : '#9CA3AF',
                border: 'none',
              }}
            >
              📋
            </Button>
            {Array.from({ length: numberOfDays }, (_, i) => i + 1).map(day => (
              <Button
                key={day}
                size="sm"
                onClick={() => setSelectedDay(day)}
                className="h-10 md:h-9 min-w-[44px] md:min-w-[36px] px-3 md:px-2 text-base md:text-sm rounded-lg shrink-0"
                style={{
                  backgroundColor: selectedDay === day ? '#FF1493' : '#FFE4EC',
                  color: selectedDay === day ? 'white' : '#9CA3AF',
                  border: 'none',
                  fontWeight: selectedDay === day ? '700' : '500'
                }}
              >
                {day}
              </Button>
            ))}
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          {selectedDay === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-6">
              <div className="text-center">
                <h3 className="text-2xl font-bold mb-2" style={{ color: '#9C27B0' }}>
                  📋 Planning de lecture
                </h3>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  Ajoutez une image du planning pour cette lecture commune
                </p>
              </div>

              {reading.planning_image ? (
                <div className="relative w-full max-w-2xl">
                  <img 
                    src={reading.planning_image} 
                    alt="Planning" 
                    className="w-full rounded-2xl shadow-lg cursor-pointer hover:scale-105 transition-transform"
                    onClick={() => window.open(reading.planning_image, '_blank')}
                  />
                  {user?.email === reading.created_by && (
                    <label className="absolute bottom-4 right-4 cursor-pointer">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handlePlanningImageUpload}
                        className="hidden"
                        disabled={uploadingPlanningImage}
                      />
                      <Button 
                        type="button"
                        disabled={uploadingPlanningImage}
                        className="text-white shadow-lg"
                        style={{ backgroundColor: '#FF69B4' }}
                        asChild
                      >
                        <span>
                          {uploadingPlanningImage ? (
                            <>
                              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                              Upload...
                            </>
                          ) : (
                            <>
                              <Upload className="w-4 h-4 mr-2" />
                              Changer
                            </>
                          )}
                        </span>
                      </Button>
                    </label>
                  )}
                </div>
              ) : (
                <label className="cursor-pointer">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePlanningImageUpload}
                    className="hidden"
                    disabled={uploadingPlanningImage}
                  />
                  <Button 
                    type="button"
                    disabled={uploadingPlanningImage}
                    size="lg"
                    className="text-white shadow-lg"
                    style={{ backgroundColor: '#FF69B4' }}
                    asChild
                  >
                    <span>
                      {uploadingPlanningImage ? (
                        <>
                          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                          Upload en cours...
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5 mr-2" />
                          Ajouter une image du planning
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              )}

              {reading.start_date && reading.end_date && (
                <div className="w-full max-w-md p-6 rounded-2xl" style={{ backgroundColor: 'rgba(156, 39, 176, 0.05)' }}>
                  <h4 className="font-bold mb-3 text-center" style={{ color: '#9C27B0' }}>
                    Informations
                  </h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span style={{ color: '#9CA3AF' }}>Début</span>
                      <span className="font-bold" style={{ color: '#2D3748' }}>
                        {format(new Date(reading.start_date), 'dd MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#9CA3AF' }}>Fin</span>
                      <span className="font-bold" style={{ color: '#2D3748' }}>
                        {format(new Date(reading.end_date), 'dd MMMM yyyy', { locale: fr })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span style={{ color: '#9CA3AF' }}>Durée</span>
                      <span className="font-bold" style={{ color: '#2D3748' }}>
                        {numberOfDays} jours
                      </span>
                    </div>
                    {reading.chapters_per_day && (
                      <div className="flex justify-between">
                        <span style={{ color: '#9CA3AF' }}>Rythme</span>
                        <span className="font-bold" style={{ color: '#2D3748' }}>
                          {reading.chapters_per_day} chapitre{reading.chapters_per_day > 1 ? 's' : ''}/jour
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {Object.keys(groupedMessages).sort((a, b) => a - b).map(day => (
            <div key={day}>
              {/* Day separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ backgroundColor: '#FFB6C8' }} />
                <span className="text-sm font-bold px-3 py-1 rounded-full"
                      style={{ backgroundColor: '#FFE4EC', color: '#C2185B' }}>
                  Jour {day}
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: '#FFB6C8' }} />
              </div>

              {/* Messages for this day */}
              {groupedMessages[day].map((msg) => {
                const isMyMessage = msg.created_by === user?.email;
                const userInfo = getUserInfo(msg.created_by);
                const allReactions = msg.reactions || {};
                const reactionCounts = {};
                Object.values(allReactions).flat().forEach(emoji => {
                  reactionCounts[emoji] = (reactionCounts[emoji] || 0) + 1;
                });
                
                const currentDay = getCurrentDay();
                const msgDay = parseInt(day);
                const canRevealSpoiler = currentDay > msgDay;
                const isSpoilerRevealed = revealedSpoilers.has(msg.id);
                const shouldHideSpoiler = msg.is_spoiler && !canRevealSpoiler && !isSpoilerRevealed;
                
                return (
                  <div
                    key={msg.id}
                    className={`flex gap-3 ${isMyMessage ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    {/* Avatar */}
                    {!isMyMessage && (
                      <div className="w-10 h-10 rounded-full flex-shrink-0 overflow-hidden"
                           style={{ backgroundColor: '#9C27B0' }}>
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
                        <span className="text-xs font-bold mb-1 px-2" style={{ color: '#C2185B' }}>
                          {userInfo.name}
                        </span>
                      )}

                      <div
                        className="rounded-3xl px-5 py-4 relative"
                        style={{
                          backgroundColor: isMyMessage ? '#FF1493' : 'white',
                          color: isMyMessage ? 'white' : '#1a1a1a',
                          borderRadius: isMyMessage ? '24px 24px 6px 24px' : '24px 24px 24px 6px',
                          boxShadow: isMyMessage 
                            ? '0 8px 24px rgba(255, 20, 147, 0.35)' 
                            : '0 8px 24px rgba(0, 0, 0, 0.1)',
                          border: isMyMessage ? 'none' : '2px solid #FFE4EC'
                        }}
                      >
                        {shouldHideSpoiler ? (
                          <div 
                            className="flex flex-col items-center justify-center py-8 gap-3 cursor-pointer hover:opacity-80 transition-opacity"
                            onClick={() => setRevealedSpoilers(prev => new Set([...prev, msg.id]))}
                          >
                            <EyeOff className="w-8 h-8" style={{ color: isMyMessage ? 'rgba(255,255,255,0.6)' : '#FF69B4' }} />
                            <p className="text-sm font-bold" style={{ color: isMyMessage ? 'rgba(255,255,255,0.8)' : '#9C27B0' }}>
                              ⚠️ Spoiler caché
                            </p>
                            <p className="text-xs" style={{ color: isMyMessage ? 'rgba(255,255,255,0.6)' : '#9CA3AF' }}>
                              Disponible demain (jour {parseInt(day) + 1})
                            </p>
                            <p className="text-xs font-medium" style={{ color: isMyMessage ? 'rgba(255,255,255,0.7)' : '#FF69B4' }}>
                              👆 Cliquer pour révéler
                            </p>
                          </div>
                        ) : (
                          <>
                            {msg.is_spoiler && canRevealSpoiler && (
                              <div className="px-2 py-1 rounded-full inline-flex items-center gap-1 mb-2 text-xs font-bold"
                                   style={{
                                     backgroundColor: isMyMessage ? 'rgba(255, 255, 255, 0.25)' : '#FFF3CD',
                                     color: isMyMessage ? 'white' : '#856404'
                                   }}>
                                <Eye className="w-3 h-3" />
                                SPOILER RÉVÉLÉ
                              </div>
                            )}
                            
                            {msg.photo_url && (
                              <div className="mb-3 rounded-lg overflow-hidden cursor-pointer"
                                   onClick={() => window.open(msg.photo_url, '_blank')}>
                                <img 
                                  src={msg.photo_url} 
                                  alt="Photo" 
                                  className="w-full max-h-64 object-cover hover:scale-105 transition-transform" 
                                />
                              </div>
                            )}

                            {msg.chapter && (
                              <div className="px-3 py-1 rounded-full inline-block mb-2 text-xs font-bold"
                                   style={{
                                     backgroundColor: isMyMessage ? 'rgba(255, 255, 255, 0.25)' : '#FFE4EC',
                                     color: isMyMessage ? 'white' : '#C2185B'
                                   }}>
                                📖 {msg.chapter}
                              </div>
                            )}

                            <p className="text-base leading-relaxed whitespace-pre-wrap">
                              {msg.message}
                            </p>

                            <p className="text-xs mt-2 opacity-50">
                              {format(new Date(msg.created_date), 'HH:mm', { locale: fr })}
                            </p>
                          </>
                        )}
                      </div>

                      {/* Reactions - only show for friends' messages */}
                      {!isMyMessage && (
                        <>
                          <div className="flex items-center gap-1.5 mt-2 px-1 flex-wrap">
                            {Object.entries(reactionCounts).map(([emoji, count]) => (
                              <button
                                key={emoji}
                                onClick={() => reactToMessageMutation.mutate({ messageId: msg.id, emoji })}
                                className="px-2 py-1 rounded-full text-base flex items-center gap-1 transition-all"
                                style={{ 
                                  backgroundColor: (allReactions[user?.email] || []).includes(emoji) 
                                    ? '#FFB6C8' 
                                    : '#FFE4EC',
                                }}
                              >
                                <span>{emoji}</span>
                                <span className="font-bold text-xs" style={{ color: '#9C27B0' }}>{count}</span>
                              </button>
                            ))}
                            <button
                              onClick={() => {
                                setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id);
                                setCustomEmoji("");
                              }}
                              className="w-8 h-8 rounded-full flex items-center justify-center transition-all"
                              style={{
                                backgroundColor: showEmojiPicker === msg.id ? '#FFB6C8' : '#FFE4EC'
                              }}
                            >
                              <Smile className="w-4 h-4" style={{ color: '#FF69B4' }} />
                            </button>
                          </div>

                          {/* Emoji picker */}
                          {showEmojiPicker === msg.id && (
                            <div className="mt-2 p-3 rounded-2xl shadow-xl border space-y-3"
                                 style={{ 
                                   backgroundColor: 'white',
                                   borderColor: '#FFB6C8',
                                 }}>
                              <div className="flex gap-2 flex-wrap">
                                {EMOJI_REACTIONS.map(emoji => (
                                  <button
                                    key={emoji}
                                    onClick={() => {
                                      reactToMessageMutation.mutate({ messageId: msg.id, emoji });
                                      setShowEmojiPicker(null);
                                    }}
                                    className="text-2xl hover:scale-125 transition-transform p-1"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                              </div>
                              <div className="flex gap-2">
                                <Input
                                  value={customEmoji}
                                  onChange={(e) => setCustomEmoji(e.target.value)}
                                  placeholder="Ou tape un emoji..."
                                  className="flex-1 text-center text-xl h-10"
                                  maxLength={2}
                                />
                                <Button
                                  onClick={() => {
                                    if (customEmoji.trim()) {
                                      reactToMessageMutation.mutate({ messageId: msg.id, emoji: customEmoji });
                                      setShowEmojiPicker(null);
                                      setCustomEmoji("");
                                    }
                                  }}
                                  disabled={!customEmoji.trim()}
                                  size="sm"
                                  className="text-white"
                                  style={{ backgroundColor: '#FF69B4' }}
                                >
                                  Ajouter
                                </Button>
                              </div>
                            </div>
                          )}
                        </>
                      )}

                      {/* Delete button */}
                      {isMyMessage && (
                        <button
                          onClick={() => deleteMessageMutation.mutate(msg.id)}
                          className="text-xs mt-1 px-2 py-1 rounded hover:bg-red-50 transition-colors"
                          style={{ color: '#EF4444' }}
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
                <div className="text-center py-20">
                  <p className="text-base italic" style={{ color: '#9CA3AF' }}>
                    Aucun message. Commencez la discussion !
                  </p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </>
          )}
        </div>

        {/* Input bar - only show if not on recap page */}
        {selectedDay !== 0 && (
          <div className="border-t px-3 py-3" style={{ 
            backgroundColor: 'white',
            borderColor: '#FFD6E8'
          }}>
          {photoUrl && (
            <div className="relative inline-block mb-2">
              <img src={photoUrl} alt="Preview" className="w-16 h-16 rounded object-cover" />
              <Button
                size="icon"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full p-0"
                style={{ backgroundColor: '#EF4444' }}
                onClick={() => setPhotoUrl("")}
              >
                <X className="w-3 h-3 text-white" />
              </Button>
            </div>
          )}

          <div className="flex gap-2 mb-2">
            <Button
              type="button"
              onClick={() => setIsSpoiler(!isSpoiler)}
              size="sm"
              variant="outline"
              className="gap-2"
              style={{
                backgroundColor: isSpoiler ? '#FFF3CD' : 'white',
                borderColor: isSpoiler ? '#856404' : '#FFD6E8',
                color: isSpoiler ? '#856404' : '#9CA3AF'
              }}
            >
              {isSpoiler ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
              {isSpoiler ? 'Spoiler activé' : 'Marquer comme spoiler'}
            </Button>
          </div>
          
          <div className="flex gap-2">
            <Input
              value={newChapter}
              onChange={(e) => setNewChapter(e.target.value)}
              placeholder="Chapitre"
              className="w-32 h-10"
            />
            <Textarea
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder={`Message pour le jour ${selectedDay || 1}...`}
              className="flex-1 min-h-[40px] max-h-[120px] resize-none"
              onKeyPress={(e) => {
                if (e.key === 'Enter' && !e.shiftKey && newMessage.trim()) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
            />
            
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
                variant="ghost" 
                size="icon"
                disabled={uploadingPhoto}
                className="h-10 w-10"
                asChild
              >
                <span>
                  {uploadingPhoto ? (
                    <Loader2 className="w-5 h-5 animate-spin" style={{ color: '#9C27B0' }} />
                  ) : (
                    <Upload className="w-5 h-5" style={{ color: '#9C27B0' }} />
                  )}
                </span>
              </Button>
            </label>

            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendMessageMutation.isPending}
              size="icon"
              className="h-10 w-10 text-white"
              style={{ backgroundColor: '#FF69B4' }}
            >
              <Send className="w-5 h-5" />
            </Button>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}