import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Send, Upload, X, Loader2, Smile, Trash2 } from "lucide-react";
import { format, differenceInDays } from "date-fns";
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
    ? differenceInDays(new Date(reading.end_date), new Date(reading.start_date)) + 1
    : 0;

  const getCurrentDay = () => {
    if (!reading.start_date) return 1;
    const now = new Date();
    const start = new Date(reading.start_date);
    const daysPassed = differenceInDays(now, start) + 1;
    return Math.max(1, Math.min(daysPassed, numberOfDays));
  };

  useEffect(() => {
    if (numberOfDays > 0 && !selectedDay) {
      setSelectedDay(getCurrentDay());
    }
  }, [numberOfDays]);

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
      is_spoiler: false,
    });
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
        <div className="px-4 py-3 border-b" style={{ borderColor: 'rgba(156, 39, 176, 0.1)' }}>
          <h2 className="text-lg font-bold truncate" style={{ color: '#2D3748' }}>
            {book?.title}
          </h2>
          {reading.start_date && reading.end_date && (
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              {format(new Date(reading.start_date), 'dd MMM', { locale: fr })} - {format(new Date(reading.end_date), 'dd MMM', { locale: fr })}
            </p>
          )}
        </div>

        {/* Day selector */}
        {numberOfDays > 0 && (
          <div className="px-3 py-2 flex items-center gap-2 border-b overflow-x-auto"
               style={{ borderColor: 'rgba(156, 39, 176, 0.08)' }}>
            <span className="text-xs font-bold shrink-0" style={{ color: '#FF69B4' }}>
              Jour
            </span>
            {Array.from({ length: numberOfDays }, (_, i) => i + 1).map(day => (
              <Button
                key={day}
                size="sm"
                onClick={() => setSelectedDay(day)}
                className="h-8 min-w-[32px] px-2 text-sm rounded shrink-0"
                style={{
                  backgroundColor: selectedDay === day ? '#FF69B4' : 'rgba(243, 229, 245, 0.3)',
                  color: selectedDay === day ? 'white' : '#CBD5E0',
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
          {Object.keys(groupedMessages).sort((a, b) => a - b).map(day => (
            <div key={day}>
              {/* Day separator */}
              <div className="flex items-center gap-3 my-4">
                <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(156, 39, 176, 0.15)' }} />
                <span className="text-sm font-bold px-3 py-1 rounded-full"
                      style={{ backgroundColor: 'rgba(156, 39, 176, 0.1)', color: '#9C27B0' }}>
                  Jour {day}
                </span>
                <div className="flex-1 h-px" style={{ backgroundColor: 'rgba(156, 39, 176, 0.15)' }} />
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
                        <span className="text-xs font-bold mb-1 px-2" style={{ color: '#9C27B0' }}>
                          {userInfo.name}
                        </span>
                      )}

                      <div
                        className="rounded-3xl px-5 py-4"
                        style={{
                          backgroundColor: isMyMessage ? '#FF69B4' : 'rgba(255, 255, 255, 0.95)',
                          color: isMyMessage ? 'white' : '#2D3748',
                          borderRadius: isMyMessage ? '24px 24px 6px 24px' : '24px 24px 24px 6px',
                          boxShadow: isMyMessage 
                            ? '0 8px 24px rgba(255, 20, 147, 0.25)' 
                            : '0 8px 24px rgba(156, 39, 176, 0.15)',
                          border: isMyMessage ? 'none' : '1px solid rgba(156, 39, 176, 0.1)'
                        }}
                      >
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
                                 backgroundColor: isMyMessage ? 'rgba(255, 255, 255, 0.2)' : 'rgba(156, 39, 176, 0.1)',
                                 color: isMyMessage ? 'white' : '#9C27B0'
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
                      </div>

                      {/* Reactions */}
                      <div className="flex items-center gap-1.5 mt-2 px-1">
                        {Object.entries(reactionCounts).map(([emoji, count]) => (
                          <button
                            key={emoji}
                            onClick={() => reactToMessageMutation.mutate({ messageId: msg.id, emoji })}
                            className="px-2.5 py-1 rounded-full text-sm flex items-center gap-1 transition-all"
                            style={{ 
                              backgroundColor: (allReactions[user?.email] || []).includes(emoji) 
                                ? 'rgba(156, 39, 176, 0.15)' 
                                : 'rgba(243, 229, 245, 0.5)',
                            }}
                          >
                            <span>{emoji}</span>
                            <span className="font-bold text-xs" style={{ color: '#9C27B0' }}>{count}</span>
                          </button>
                        ))}
                        <button
                          onClick={() => setShowEmojiPicker(showEmojiPicker === msg.id ? null : msg.id)}
                          className="w-7 h-7 rounded-full flex items-center justify-center"
                          style={{
                            backgroundColor: showEmojiPicker === msg.id ? 'rgba(156, 39, 176, 0.15)' : 'transparent'
                          }}
                        >
                          <Smile className="w-4 h-4" style={{ color: '#FF69B4' }} />
                        </button>
                      </div>

                      {/* Emoji picker */}
                      {showEmojiPicker === msg.id && (
                        <div className="flex gap-2 mt-2 p-3 rounded-2xl shadow-xl border"
                             style={{ 
                               backgroundColor: 'rgba(255, 255, 255, 0.95)',
                               borderColor: 'rgba(156, 39, 176, 0.2)',
                             }}>
                          {EMOJI_REACTIONS.map(emoji => (
                            <button
                              key={emoji}
                              onClick={() => reactToMessageMutation.mutate({ messageId: msg.id, emoji })}
                              className="text-xl hover:scale-125 transition-transform"
                            >
                              {emoji}
                            </button>
                          ))}
                        </div>
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
        </div>

        {/* Input bar */}
        <div className="border-t px-3 py-3" style={{ 
          backgroundColor: 'rgba(255, 255, 255, 0.98)',
          borderColor: 'rgba(156, 39, 176, 0.08)'
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
      </DialogContent>
    </Dialog>
  );
}