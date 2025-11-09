
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, ArrowLeft, Users, Search, Trash2, Plus, Bell, Paperclip, Image as ImageIcon } from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const { data: chatRooms = [] } = useQuery({
    queryKey: ['chatRooms'],
    queryFn: async () => {
      const rooms = await base44.entities.ChatRoom.filter({}, '-last_message_at');
      return rooms.filter(room => 
        room.participants?.includes(user?.email)
      );
    },
    enabled: !!user,
    refetchInterval: 30000,
    staleTime: 15 * 1000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedChat?.id],
    queryFn: () => base44.entities.ChatMessage.filter({ 
      chat_room_id: selectedChat?.id 
    }, 'created_date'),
    enabled: !!selectedChat,
    refetchInterval: 5000,
    staleTime: 2 * 1000,
  });

  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ 
      created_by: user?.email, 
      status: "Acceptée" 
    }),
    enabled: !!user,
  });

  // Fetch all users to get their last_active_at status
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 60000, // Refetch every minute to update online status
    staleTime: 30 * 1000, // 30 seconds
  });

  // Function to check if a user is online (active in last 5 minutes)
  const isUserOnline = (email) => {
    const userProfile = allUsers.find(u => u.email === email);
    if (!userProfile?.last_active_at) return false;
    
    const lastActive = new Date(userProfile.last_active_at);
    const now = new Date();
    const diffMinutes = (now - lastActive) / (1000 * 60);
    
    return diffMinutes < 5; // Online if active in last 5 minutes
  };

  const { data: sharedReadings = [] } = useQuery({
    queryKey: ['sharedReadings'],
    queryFn: () => base44.entities.SharedReading.filter({ 
      participants: user?.email,
      status: "En cours"
    }),
    enabled: !!user,
  });

  // Mark messages as seen when viewing a chat
  useEffect(() => {
    if (!selectedChat || !user?.email || messages.length === 0) return;

    const markMessagesAsSeen = async () => {
      // Find messages that haven't been seen by current user
      const unseenMessages = messages.filter(msg => 
        msg.sender_email !== user.email &&
        (!msg.seen_by || !msg.seen_by.includes(user.email))
      );

      if (unseenMessages.length === 0) return;

      // Mark each unseen message as seen
      await Promise.all(
        unseenMessages.map(async (msg) => {
          const seenBy = msg.seen_by || [];
          if (!seenBy.includes(user.email)) {
            await base44.entities.ChatMessage.update(msg.id, {
              seen_by: [...seenBy, user.email]
            });
          }
        })
      );

      // Invalidate queries to update UI
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessagesCount'] });
    };

    // Small delay to ensure smooth UI
    const timer = setTimeout(markMessagesAsSeen, 500);
    return () => clearTimeout(timer);
  }, [selectedChat, messages, user, queryClient]);

  const sendMessageMutation = useMutation({
    mutationFn: async (content) => {
      await base44.entities.ChatMessage.create({
        chat_room_id: selectedChat.id,
        sender_email: user?.email,
        content,
        seen_by: [user?.email]
      });

      await base44.entities.ChatRoom.update(selectedChat.id, {
        last_message_at: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      setMessageInput("");
      scrollToBottom();
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chatRoomId) => {
      const messagesToDelete = await base44.entities.ChatMessage.filter({ chat_room_id: chatRoomId });
      await Promise.all(messagesToDelete.map(msg => base44.entities.ChatMessage.delete(msg.id)));
      await base44.entities.ChatRoom.delete(chatRoomId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessagesCount'] });
      setSelectedChat(null);
      toast.success("Conversation supprimée");
    },
    onError: (error) => {
      console.error("Error deleting chat:", error);
      toast.error("Erreur lors de la suppression");
    }
  });

  const createChatMutation = useMutation({
    mutationFn: async (friendEmail) => {
      const existingChat = chatRooms.find(room => 
        room.type === "PRIVATE" && 
        room.participants.includes(friendEmail)
      );

      if (existingChat) {
        setSelectedChat(existingChat);
        return;
      }

      const newChat = await base44.entities.ChatRoom.create({
        type: "PRIVATE",
        participants: [user?.email, friendEmail],
        last_message_at: new Date().toISOString()
      });

      setSelectedChat(newChat);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
    },
  });

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim()) return;
    sendMessageMutation.mutate(messageInput);
  };

  const handleDeleteChat = (chatId) => {
    if (window.confirm("Êtes-vous sûre de vouloir supprimer cette conversation ?")) {
      deleteChatMutation.mutate(chatId);
    }
  };

  const getChatName = (room) => {
    if (room.name) return room.name;
    if (room.type === "PRIVATE") {
      const otherEmail = room.participants.find(p => p !== user?.email);
      const friend = myFriends.find(f => f.friend_email === otherEmail);
      return friend?.friend_name || otherEmail?.split('@')[0] || 'Chat privé';
    }
    return "Groupe";
  };

  const getChatAvatar = (room) => {
    if (room.type === "PRIVATE") {
      const otherEmail = room.participants.find(p => p !== user?.email);
      return otherEmail?.[0]?.toUpperCase() || 'C';
    }
    return '👥';
  };

  // Get linked shared reading for a chat
  const getLinkedReading = (room) => {
    if (room.type !== "PRIVATE") return null;
    const otherEmail = room.participants.find(p => p !== user?.email);
    return sharedReadings.find(sr => 
      sr.participants?.includes(otherEmail)
    );
  };

  // Categorize friends
  const recentChats = chatRooms.filter(r => r.last_message_at).slice(0, 5);
  const friendsWithSharedReadings = myFriends.filter(f => 
    sharedReadings.some(sr => sr.participants?.includes(f.friend_email))
  );
  const closeFriends = myFriends.filter(f => 
    !friendsWithSharedReadings.includes(f)
  );

  const filteredFriends = myFriends.filter(f =>
    f.friend_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.friend_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex" style={{ backgroundColor: '#FDFBFE' }}>
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .message-bubble {
          animation: fadeIn 0.3s ease-out;
        }

        .friend-card:hover {
          transform: translateX(4px);
          transition: transform 0.2s ease;
        }

        .chat-gradient {
          background: linear-gradient(180deg, #FFF3F7 0%, #FCE7FF 100%);
        }

        .message-input:focus {
          outline: none;
          box-shadow: 0 0 0 2px rgba(255, 77, 166, 0.2);
        }
      `}</style>

      {/* Sidebar - Friends list */}
      <div className="w-full md:w-80 border-r flex flex-col chat-gradient" 
           style={{ borderColor: '#FFE9F3' }}>
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: '#FFE9F3', backgroundColor: 'rgba(255, 255, 255, 0.5)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl("Dashboard")} className="md:hidden">
                <Button variant="ghost" size="icon" className="rounded-full">
                  <ArrowLeft className="w-5 h-5" style={{ color: '#FF4DA6' }} />
                </Button>
              </Link>
              <h2 className="text-xl font-bold" style={{ color: '#333' }}>
                💌 Messages
              </h2>
            </div>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                    style={{ color: '#FF4DA6' }} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher une amie..."
              className="pl-10 rounded-2xl border-0 shadow-sm"
              style={{ backgroundColor: 'white' }}
            />
          </div>
        </div>

        {/* Friends sections */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Close Friends */}
          {closeFriends.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-3" style={{ color: '#FF4DA6' }}>
                ❤️ AMIES PROCHES
              </p>
              <div className="space-y-2">
                {closeFriends
                  .filter(f => !searchQuery || 
                    f.friend_name?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((friend) => {
                    const online = isUserOnline(friend.friend_email);
                    return (
                      <button
                        key={friend.id}
                        onClick={() => createChatMutation.mutate(friend.friend_email)}
                        className="w-full p-3 rounded-2xl text-left friend-card"
                        style={{ 
                          backgroundColor: 'white',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                                 style={{ background: 'linear-gradient(135deg, #FFB7D5, #E9D9FF)' }}>
                              {friend.friend_name?.[0]?.toUpperCase() || 'A'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
                                 style={{ backgroundColor: online ? '#10B981' : '#9CA3AF' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate" style={{ color: '#333' }}>
                              {friend.friend_name}
                            </p>
                            <p className="text-xs" style={{ color: online ? '#10B981' : '#9CA3AF' }}>
                              {online ? 'En ligne' : 'Hors ligne'}
                            </p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Shared Readings Friends */}
          {friendsWithSharedReadings.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-3" style={{ color: '#FF4DA6' }}>
                📚 LECTURES COMMUNES
              </p>
              <div className="space-y-2">
                {friendsWithSharedReadings
                  .filter(f => !searchQuery || 
                    f.friend_name?.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map((friend) => {
                    const linkedReading = sharedReadings.find(sr => 
                      sr.participants?.includes(friend.friend_email)
                    );
                    const online = isUserOnline(friend.friend_email);
                    return (
                      <button
                        key={friend.id}
                        onClick={() => createChatMutation.mutate(friend.friend_email)}
                        className="w-full p-3 rounded-2xl text-left friend-card"
                        style={{ 
                          backgroundColor: 'white',
                          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                        }}
                      >
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                                 style={{ background: 'linear-gradient(135deg, #FFB7D5, #E9D9FF)' }}>
                              {friend.friend_name?.[0]?.toUpperCase() || 'A'}
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white"
                                 style={{ backgroundColor: online ? '#10B981' : '#9CA3AF' }} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm truncate" style={{ color: '#333' }}>
                              {friend.friend_name}
                            </p>
                            {linkedReading && (
                              <p className="text-xs truncate" style={{ color: '#9B59B6' }}>
                                📖 {linkedReading.title}
                              </p>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Recent Chats */}
          {recentChats.length > 0 && (
            <div>
              <p className="text-xs font-bold mb-3" style={{ color: '#FF4DA6' }}>
                💬 DISCUSSIONS RÉCENTES
              </p>
              <div className="space-y-2">
                {recentChats.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setSelectedChat(room)}
                    className={`w-full p-3 rounded-2xl text-left friend-card ${
                      selectedChat?.id === room.id ? 'ring-2' : ''
                    }`}
                    style={{ 
                      backgroundColor: selectedChat?.id === room.id ? '#FFF3F7' : 'white',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)',
                      ringColor: '#FF4DA6'
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                           style={{ background: 'linear-gradient(135deg, #FFB7D5, #E9D9FF)' }}>
                        {getChatAvatar(room)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-sm truncate" style={{ color: '#333' }}>
                          {getChatName(room)}
                        </p>
                        <p className="text-xs" style={{ color: '#999' }}>
                          {formatDistanceToNow(new Date(room.last_message_at), { 
                            addSuffix: true, 
                            locale: fr 
                          })}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          )}

          {myFriends.length === 0 && (
            <div className="text-center py-12 px-4">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" 
                            style={{ color: '#FF4DA6' }} />
              <p className="text-sm" style={{ color: '#999' }}>
                Aucune amie pour le moment
              </p>
              <Link to={createPageUrl("Friends")}>
                <Button className="mt-4 rounded-full text-white"
                        style={{ background: 'linear-gradient(135deg, #FF4DA6, #E9D9FF)' }}>
                  Ajouter des amies
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col" style={{ backgroundColor: '#FDFBFE' }}>
        {selectedChat ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b flex items-center justify-between"
                 style={{ 
                   borderColor: '#FFE9F3',
                   backgroundColor: '#FFF7FB',
                   boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                 }}>
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden"
                >
                  <ArrowLeft className="w-5 h-5" style={{ color: '#FF4DA6' }} />
                </button>
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                     style={{ background: 'linear-gradient(135deg, #FFB7D5, #E9D9FF)' }}>
                  {getChatAvatar(selectedChat)}
                </div>
                <div>
                  <p className="font-bold text-lg" style={{ color: '#333' }}>
                    {getChatName(selectedChat)}
                  </p>
                  <p className="text-xs flex items-center gap-2" style={{ color: '#999' }}>
                    <span>{selectedChat.participants.length} participant{selectedChat.participants.length > 1 ? 's' : ''}</span>
                    {getLinkedReading(selectedChat) && (
                      <>
                        <span>•</span>
                        <span style={{ color: '#9B59B6' }}>
                          📚 Lecture commune active
                        </span>
                      </>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full"
                >
                  <Bell className="w-5 h-5" style={{ color: '#FF4DA6' }} />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteChat(selectedChat.id)}
                  className="rounded-full"
                >
                  <Trash2 className="w-5 h-5" style={{ color: '#FF4DA6' }} />
                </Button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((message) => {
                const isMe = message.sender_email === user?.email;
                const messageDate = new Date(message.created_date);
                
                return (
                  <div key={message.id} 
                       className={`flex ${isMe ? 'justify-end' : 'justify-start'} message-bubble`}>
                    <div className={`max-w-[70%] ${
                      isMe 
                        ? 'rounded-[22px] rounded-br-md' 
                        : 'rounded-[22px] rounded-bl-md'
                    } px-5 py-3 shadow-sm`}
                    style={{
                      backgroundColor: isMe ? '#FFB7D5' : '#E9D9FF'
                    }}>
                      {!isMe && (
                        <p className="text-xs font-bold mb-1" style={{ color: '#333' }}>
                          {message.sender_email?.split('@')[0]}
                        </p>
                      )}
                      <p className="text-sm leading-relaxed whitespace-pre-wrap break-words"
                         style={{ color: '#333' }}>
                        {message.content}
                      </p>
                      <p className="text-xs mt-2 opacity-70" style={{ color: '#666' }}>
                        {format(messageDate, 'HH:mm', { locale: fr })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <form onSubmit={handleSendMessage} 
                  className="p-4 border-t"
                  style={{ 
                    borderColor: '#FFD8E8',
                    backgroundColor: 'white'
                  }}>
              <div className="flex gap-3 items-end">
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="rounded-full flex-shrink-0"
                  style={{ color: '#FF4DA6' }}
                >
                  <Plus className="w-5 h-5" />
                </Button>
                
                <Textarea
                  value={messageInput}
                  onChange={(e) => setMessageInput(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessage(e);
                    }
                  }}
                  placeholder="Écrivez votre message..."
                  className="flex-1 min-h-[48px] max-h-[120px] resize-none rounded-2xl border-0 message-input"
                  style={{ 
                    backgroundColor: '#F9F9FB',
                    color: '#333'
                  }}
                  rows={1}
                />

                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="rounded-full flex-shrink-0"
                  style={{ color: '#FF4DA6' }}
                >
                  <Paperclip className="w-5 h-5" />
                </Button>
                
                <Button
                  type="submit"
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  size="icon"
                  className="rounded-full w-12 h-12 flex-shrink-0 shadow-lg"
                  style={{ 
                    background: 'linear-gradient(135deg, #FF4DA6, #E9D9FF)',
                    color: 'white'
                  }}
                >
                  💌
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-24 h-24 mx-auto mb-6 rounded-full flex items-center justify-center"
                   style={{ background: 'linear-gradient(135deg, #FFB7D5, #E9D9FF)' }}>
                <MessageCircle className="w-12 h-12 text-white" />
              </div>
              <p className="text-xl font-bold mb-2" style={{ color: '#333' }}>
                Sélectionnez une conversation
              </p>
              <p className="text-sm" style={{ color: '#999' }}>
                Choisissez une amie pour commencer à discuter
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
