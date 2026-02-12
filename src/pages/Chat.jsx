import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, ArrowLeft, Users, Search, Trash2, Plus, Paperclip, Image as ImageIcon, Loader2, X, BookOpen, Star, Heart, Quote as QuoteIcon, Clock } from "lucide-react";
import { formatDistanceToNow, format, isToday, isYesterday } from "date-fns";
import { fr } from "date-fns/locale";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent } from "@/components/ui/card";

export default function Chat() {
  const [user, setUser] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messageInput, setMessageInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState(null);
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
    refetchInterval: 10000,
    staleTime: 5 * 1000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedChat?.id],
    queryFn: () => base44.entities.ChatMessage.filter({ 
      chat_room_id: selectedChat?.id 
    }, 'created_date'),
    enabled: !!selectedChat,
    refetchInterval: 3000,
    staleTime: 1000,
  });

  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ 
      created_by: user?.email, 
      status: "Acceptée" 
    }),
    enabled: !!user,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    refetchInterval: 30000,
    staleTime: 15 * 1000,
  });

  const { data: sharedReadings = [] } = useQuery({
    queryKey: ['sharedReadings'],
    queryFn: () => base44.entities.SharedReading.filter({ 
      participants: user?.email,
      status: "En cours"
    }),
    enabled: !!user,
  });

  const { data: allBooks = [] } = useQuery({
    queryKey: ['books'],
    queryFn: () => base44.entities.Book.list(),
  });

  const { data: myBooks = [] } = useQuery({
    queryKey: ['myBooks'],
    queryFn: () => base44.entities.UserBook.filter({ created_by: user?.email }),
    enabled: !!user,
  });

  const { data: friendsBooks = [] } = useQuery({
    queryKey: ['friendsBooks'],
    queryFn: async () => {
      const friendsEmails = myFriends.map(f => f.friend_email);
      if (friendsEmails.length === 0) return [];
      const allFriendsBooks = await Promise.all(
        friendsEmails.map(email => base44.entities.UserBook.filter({ created_by: email }))
      );
      return allFriendsBooks.flat();
    },
    enabled: myFriends.length > 0,
  });

  const isUserOnline = (email) => {
    const userProfile = allUsers.find(u => u.email === email);
    if (!userProfile?.last_active_at) return false;
    
    const lastActive = new Date(userProfile.last_active_at);
    const now = new Date();
    const diffMinutes = (now - lastActive) / (1000 * 60);
    
    return diffMinutes < 5;
  };

  // Get last message for a room
  const getLastMessage = (room) => {
    const roomMessages = messages.filter(m => m.chat_room_id === room.id);
    if (roomMessages.length === 0) return null;
    return roomMessages[roomMessages.length - 1];
  };

  // Get unread count for a room
  const getUnreadCount = (room) => {
    const roomMessages = messages.filter(m => 
      m.chat_room_id === room.id &&
      m.sender_email !== user?.email &&
      (!m.seen_by || !m.seen_by.includes(user?.email))
    );
    return roomMessages.length;
  };

  useEffect(() => {
    if (!selectedChat || !user?.email || messages.length === 0) return;

    const markAsSeenAndClearNotifications = async () => {
      const unseenMessages = messages.filter(msg => 
        msg.sender_email !== user.email &&
        (!msg.seen_by || !msg.seen_by.includes(user.email))
      );

      if (unseenMessages.length > 0) {
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
      }

      const chatNotifications = await base44.entities.Notification.filter({
        created_by: user.email,
        type: "friend_comment",
        link_type: "chat",
        link_id: selectedChat.id,
        is_read: false
      });

      if (chatNotifications.length > 0) {
        await Promise.all(
          chatNotifications.map(notif => 
            base44.entities.Notification.update(notif.id, { is_read: true })
          )
        );
      }

      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessagesCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    };

    const timer = setTimeout(markAsSeenAndClearNotifications, 500);
    return () => clearTimeout(timer);
  }, [selectedChat, messages, user, queryClient]);

  const sendMessageMutation = useMutation({
    mutationFn: async ({ content, photoUrl }) => {
      await base44.entities.ChatMessage.create({
        chat_room_id: selectedChat.id,
        sender_email: user?.email,
        content,
        attachment_url: photoUrl || null,
        seen_by: [user?.email]
      });

      await base44.entities.ChatRoom.update(selectedChat.id, {
        last_message_at: new Date().toISOString()
      });

      const getChatName = () => {
        if (selectedChat.name) return selectedChat.name;
        if (selectedChat.type === "PRIVATE") {
          const otherEmail = selectedChat.participants.find(p => p !== user?.email);
          const friend = myFriends.find(f => f.friend_email === otherEmail);
          return friend?.friend_name || otherEmail?.split('@')[0] || 'Chat';
        }
        return selectedChat.name || "Groupe";
      };

      const chatName = getChatName();
      const senderName = user?.display_name || user?.full_name || 'Une amie';

      const otherParticipants = selectedChat.participants.filter(p => p !== user?.email);
      
      await Promise.all(
        otherParticipants.map(async (recipientEmail) => {
          const recentNotificationsForRecipient = await base44.entities.Notification.filter({
            created_by: recipientEmail,
            from_user: user?.email,
            link_type: "chat",
            link_id: selectedChat.id,
            is_read: false
          });

          const thirtySecondsAgo = new Date(Date.now() - 30000);
          const hasRecentUnreadNotif = recentNotificationsForRecipient.some(n =>
            new Date(n.created_date) > thirtySecondsAgo
          );

          if (!hasRecentUnreadNotif) {
            await base44.entities.Notification.create({
              type: "friend_comment",
              title: `💌 ${chatName}`,
              message: `${senderName} : ${photoUrl ? '📷 Photo' : (content.length > 50 ? content.substring(0, 50) + '...' : content)}`,
              link_type: "chat",
              link_id: selectedChat.id,
              created_by: recipientEmail,
              from_user: user?.email,
              is_read: false
            });
          }
        })
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatMessages'] });
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessagesCount'] });
      setMessageInput("");
      setPhotoPreview(null);
      scrollToBottom();
    },
  });

  const deleteChatMutation = useMutation({
    mutationFn: async (chatRoomId) => {
      const messagesToDelete = await base44.entities.ChatMessage.filter({ chat_room_id: chatRoomId });
      await Promise.all(messagesToDelete.map(msg => base44.entities.ChatMessage.delete(msg.id)));
      
      const chatNotifications = await base44.entities.Notification.filter({
        created_by: user.email,
        link_type: "chat",
        link_id: chatRoomId
      });
      await Promise.all(chatNotifications.map(n => base44.entities.Notification.delete(n.id)));
      
      await base44.entities.ChatRoom.delete(chatRoomId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['chatRooms'] });
      queryClient.invalidateQueries({ queryKey: ['unreadMessagesCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      setSelectedChat(null);
      toast.success("Conversation supprimée");
    },
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

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPhoto(true);
    try {
      const result = await base44.integrations.Core.UploadFile({ file });
      setPhotoPreview(result.file_url);
      toast.success("Photo uploadée !");
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Erreur lors de l'upload");
    } finally {
      setUploadingPhoto(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!messageInput.trim() && !photoPreview) return;
    sendMessageMutation.mutate({ 
      content: messageInput.trim() || "",
      photoUrl: photoPreview 
    });
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
      const otherUser = allUsers.find(u => u.email === otherEmail);
      return otherUser?.profile_picture || null;
    }
    return null;
  };

  const getLinkedReading = (room) => {
    if (room.type !== "PRIVATE") return null;
    const otherEmail = room.participants.find(p => p !== user?.email);
    return sharedReadings.find(sr => 
      sr.participants?.includes(otherEmail)
    );
  };

  // Get friend's current reading
  const getFriendCurrentReading = (friendEmail) => {
    const friendBook = friendsBooks.find(fb => 
      fb.created_by === friendEmail && fb.status === "En cours"
    );
    if (!friendBook) return null;
    return allBooks.find(b => b.id === friendBook.book_id);
  };

  // Format time smartly
  const formatTime = (date) => {
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return 'Hier';
    } else {
      return format(date, 'dd/MM');
    }
  };

  // Get last message preview
  const getLastMessagePreview = (room) => {
    const allMessages = chatRooms.flatMap(r => 
      messages.filter(m => m.chat_room_id === r.id)
    );
    const roomMessages = allMessages.filter(m => m.chat_room_id === room.id);
    if (roomMessages.length === 0) return "Aucun message";
    
    const lastMsg = roomMessages[roomMessages.length - 1];
    if (lastMsg.attachment_url && !lastMsg.content) return "📷 Photo";
    return lastMsg.content?.substring(0, 40) + (lastMsg.content?.length > 40 ? "..." : "");
  };

  const filteredFriends = myFriends.filter(f =>
    f.friend_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    f.friend_email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Sort chats by last message time
  const sortedChats = [...chatRooms].sort((a, b) => 
    new Date(b.last_message_at || 0) - new Date(a.last_message_at || 0)
  );

  return (
    <div className="h-[calc(100vh-4rem)] flex" style={{ backgroundColor: '#FDFBFE' }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .message-bubble { animation: fadeIn 0.3s ease-out; }
        .chat-item:hover { background-color: #FFF3F7; transform: translateX(2px); }
        .chat-item { transition: all 0.2s ease; }
        @keyframes pulse-online {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.1); }
        }
        .online-dot { animation: pulse-online 2s ease-in-out infinite; }
      `}</style>

      {/* Conversations list */}
      <div className="w-full md:w-96 border-r flex flex-col" 
           style={{ borderColor: '#FFE9F3', background: 'linear-gradient(180deg, #FFF7FB 0%, #FCF5FF 100%)' }}>
        {/* Header */}
        <div className="p-4 md:p-6 border-b" style={{ borderColor: '#FFE9F3', backgroundColor: 'white' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold flex items-center gap-2" style={{ color: '#FF1493' }}>
              <MessageCircle className="w-6 h-6" />
              Messages
            </h2>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" 
                    style={{ color: '#FF69B4' }} />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="pl-10 rounded-full border-0 shadow-sm"
              style={{ backgroundColor: '#FFF3F7' }}
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto p-2">
          {sortedChats.length > 0 ? (
            sortedChats.map((room) => {
              const otherEmail = room.participants.find(p => p !== user?.email);
              const friend = myFriends.find(f => f.friend_email === otherEmail);
              const otherUser = allUsers.find(u => u.email === otherEmail);
              const online = isUserOnline(otherEmail);
              const linkedReading = getLinkedReading(room);
              const friendReading = getFriendCurrentReading(otherEmail);
              const unreadCount = getUnreadCount(room);
              const lastMessage = getLastMessagePreview(room);
              
              return (
                <button
                  key={room.id}
                  onClick={() => setSelectedChat(room)}
                  className={`chat-item w-full p-4 rounded-2xl text-left mb-2 ${
                    selectedChat?.id === room.id ? 'ring-2' : ''
                  }`}
                  style={{ 
                    backgroundColor: selectedChat?.id === room.id ? '#FFF3F7' : 'white',
                    ringColor: '#FF69B4',
                    boxShadow: selectedChat?.id === room.id ? '0 4px 12px rgba(255, 105, 180, 0.15)' : '0 2px 4px rgba(0, 0, 0, 0.05)'
                  }}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar with online status */}
                    <div className="relative flex-shrink-0">
                      <div className="w-14 h-14 rounded-full overflow-hidden"
                           style={{ background: otherUser?.profile_picture ? 'transparent' : 'linear-gradient(135deg, #FFB7D5, #E9D9FF)' }}>
                        {otherUser?.profile_picture ? (
                          <img src={otherUser.profile_picture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                            {friend?.friend_name?.[0]?.toUpperCase() || otherEmail?.[0]?.toUpperCase() || 'A'}
                          </div>
                        )}
                      </div>
                      <div className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${online ? 'online-dot' : ''}`}
                           style={{ backgroundColor: online ? '#10B981' : '#9CA3AF' }} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <p className="font-bold text-base truncate" style={{ color: '#2D3748' }}>
                          {getChatName(room)}
                        </p>
                        {room.last_message_at && (
                          <span className="text-xs flex-shrink-0 ml-2" 
                                style={{ color: unreadCount > 0 ? '#FF1493' : '#9CA3AF' }}>
                            {formatTime(new Date(room.last_message_at))}
                          </span>
                        )}
                      </div>

                      {/* Last message preview */}
                      <p className={`text-sm truncate mb-2 ${unreadCount > 0 ? 'font-semibold' : ''}`}
                         style={{ color: unreadCount > 0 ? '#2D3748' : '#6B7280' }}>
                        {lastMessage}
                      </p>

                      {/* Activity indicators */}
                      <div className="flex items-center gap-2 flex-wrap">
                        {linkedReading && (
                          <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                                style={{ backgroundColor: '#F3E5F5', color: '#9C27B0' }}>
                            <BookOpen className="w-3 h-3" />
                            Lecture commune
                          </span>
                        )}
                        {friendReading && (
                          <span className="text-xs px-2 py-1 rounded-full truncate max-w-[150px]"
                                style={{ backgroundColor: '#FFF9E6', color: '#F59E0B' }}>
                            📖 {friendReading.title}
                          </span>
                        )}
                        {unreadCount > 0 && (
                          <span className="text-xs font-bold px-2 py-1 rounded-full"
                                style={{ backgroundColor: '#FF1493', color: 'white' }}>
                            {unreadCount}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })
          ) : (
            <div className="text-center py-12 px-4">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" 
                            style={{ color: '#FF69B4' }} />
              <p className="text-sm mb-4" style={{ color: '#9CA3AF' }}>
                Aucune conversation
              </p>
            </div>
          )}

          {/* Start new conversation section */}
          {myFriends.length > 0 && (
            <div className="p-4">
              <p className="text-xs font-bold mb-3" style={{ color: '#FF69B4' }}>
                💌 DÉMARRER UNE CONVERSATION
              </p>
              {filteredFriends.slice(0, 3).map((friend) => {
                const online = isUserOnline(friend.friend_email);
                const otherUser = allUsers.find(u => u.email === friend.friend_email);
                const hasExistingChat = chatRooms.some(room => 
                  room.participants.includes(friend.friend_email)
                );
                
                if (hasExistingChat) return null;

                return (
                  <button
                    key={friend.id}
                    onClick={() => createChatMutation.mutate(friend.friend_email)}
                    className="w-full p-3 rounded-xl hover:bg-white transition-colors mb-2 flex items-center gap-3"
                  >
                    <div className="relative">
                      <div className="w-10 h-10 rounded-full overflow-hidden"
                           style={{ background: otherUser?.profile_picture ? 'transparent' : 'linear-gradient(135deg, #FFB7D5, #E9D9FF)' }}>
                        {otherUser?.profile_picture ? (
                          <img src={otherUser.profile_picture} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-white font-bold">
                            {friend.friend_name?.[0]?.toUpperCase() || 'A'}
                          </div>
                        )}
                      </div>
                      {online && (
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white online-dot"
                             style={{ backgroundColor: '#10B981' }} />
                      )}
                    </div>
                    <p className="font-medium text-sm" style={{ color: '#2D3748' }}>
                      {friend.friend_name}
                    </p>
                  </button>
                );
              })}
            </div>
          )}

          {myFriends.length === 0 && (
            <div className="p-6 text-center">
              <p className="text-sm mb-3" style={{ color: '#9CA3AF' }}>
                Aucune amie pour le moment
              </p>
              <Link to={createPageUrl("Friends")}>
                <Button className="rounded-full text-white" size="sm"
                        style={{ background: 'linear-gradient(135deg, #FF69B4, #E9D9FF)' }}>
                  <Plus className="w-4 h-4 mr-1" />
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
            <div className="p-4 md:p-6 border-b flex items-center justify-between"
                 style={{ 
                   borderColor: '#FFE9F3',
                   backgroundColor: 'white',
                   boxShadow: '0 2px 8px rgba(0, 0, 0, 0.04)'
                 }}>
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setSelectedChat(null)}
                  className="md:hidden"
                >
                  <ArrowLeft className="w-5 h-5" style={{ color: '#FF69B4' }} />
                </button>
                
                <div className="relative">
                  <div className="w-12 h-12 rounded-full overflow-hidden"
                       style={{ background: getChatAvatar(selectedChat) ? 'transparent' : 'linear-gradient(135deg, #FFB7D5, #E9D9FF)' }}>
                    {getChatAvatar(selectedChat) ? (
                      <img src={getChatAvatar(selectedChat)} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                        {getChatName(selectedChat)[0]?.toUpperCase()}
                      </div>
                    )}
                  </div>
                  {selectedChat.type === "PRIVATE" && isUserOnline(selectedChat.participants.find(p => p !== user?.email)) && (
                    <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-white online-dot"
                         style={{ backgroundColor: '#10B981' }} />
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-lg" style={{ color: '#2D3748' }}>
                    {getChatName(selectedChat)}
                  </p>
                  <div className="flex items-center gap-2 text-xs flex-wrap">
                    {selectedChat.type === "PRIVATE" && isUserOnline(selectedChat.participants.find(p => p !== user?.email)) && (
                      <span className="flex items-center gap-1" style={{ color: '#10B981' }}>
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10B981' }} />
                        En ligne
                      </span>
                    )}
                    {getLinkedReading(selectedChat) && (
                      <span className="px-2 py-0.5 rounded-full" style={{ backgroundColor: '#F3E5F5', color: '#9C27B0' }}>
                        📚 Lecture commune
                      </span>
                    )}
                  </div>
                </div>
              </div>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteChat(selectedChat.id)}
                className="rounded-full flex-shrink-0"
              >
                <Trash2 className="w-5 h-5" style={{ color: '#EF4444' }} />
              </Button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
              {messages.map((message) => {
                const isMe = message.sender_email === user?.email;
                const messageDate = new Date(message.created_date);
                
                return (
                  <div key={message.id} 
                       className={`flex ${isMe ? 'justify-end' : 'justify-start'} message-bubble`}>
                    <div className={`max-w-[75%] ${
                      isMe 
                        ? 'rounded-[24px] rounded-br-md' 
                        : 'rounded-[24px] rounded-bl-md'
                    } px-5 py-3 shadow-md`}
                    style={{
                      background: isMe 
                        ? 'linear-gradient(135deg, #FF69B4, #FFB7D5)' 
                        : 'white',
                      color: isMe ? 'white' : '#2D3748'
                    }}>
                      {!isMe && (
                        <p className="text-xs font-bold mb-1 opacity-70">
                          {message.sender_email?.split('@')[0]}
                        </p>
                      )}
                      
                      {message.attachment_url && (
                        <div className="mb-2 rounded-xl overflow-hidden cursor-pointer"
                             onClick={() => window.open(message.attachment_url, '_blank')}>
                          <img 
                            src={message.attachment_url} 
                            alt="Photo" 
                            className="max-w-full max-h-64 object-cover hover:scale-105 transition-transform" 
                          />
                        </div>
                      )}
                      
                      {message.content && (
                        <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                          {message.content}
                        </p>
                      )}
                      <p className="text-xs mt-2 opacity-70">
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
                  className="p-4 md:p-6 border-t"
                  style={{ 
                    borderColor: '#FFE9F3',
                    backgroundColor: 'white'
                  }}>
              {photoPreview && (
                <div className="mb-3 relative inline-block">
                  <img 
                    src={photoPreview} 
                    alt="Preview" 
                    className="w-32 h-32 rounded-2xl object-cover shadow-lg" 
                  />
                  <Button
                    type="button"
                    size="icon"
                    className="absolute -top-2 -right-2 w-7 h-7 rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg"
                    onClick={() => setPhotoPreview(null)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              )}

              <div className="flex gap-3 items-end">
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
                    size="icon"
                    variant="ghost"
                    className="rounded-full flex-shrink-0"
                    style={{ color: '#FF69B4' }}
                    disabled={uploadingPhoto}
                    asChild
                  >
                    <span>
                      {uploadingPhoto ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <ImageIcon className="w-5 h-5" />
                      )}
                    </span>
                  </Button>
                </label>
                
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
                  className="flex-1 min-h-[52px] max-h-[120px] resize-none rounded-2xl border-2 focus:ring-2"
                  style={{ 
                    backgroundColor: '#FFF3F7',
                    borderColor: '#FFD6E8',
                    color: '#2D3748'
                  }}
                  rows={1}
                />
                
                <Button
                  type="submit"
                  disabled={(!messageInput.trim() && !photoPreview) || sendMessageMutation.isPending}
                  size="icon"
                  className="rounded-full w-14 h-14 flex-shrink-0 shadow-xl hover:scale-105 transition-transform"
                  style={{ 
                    background: 'linear-gradient(135deg, #FF1493, #FF69B4)',
                    color: 'white'
                  }}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center p-8">
            <Card className="border-0 shadow-xl max-w-md">
              <CardContent className="p-8 md:p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full flex items-center justify-center"
                     style={{ background: 'linear-gradient(135deg, #FFB7D5, #E9D9FF)' }}>
                  <MessageCircle className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-2xl font-bold mb-3" style={{ color: '#2D3748' }}>
                  Partagez vos lectures
                </h3>
                <p className="text-base mb-6" style={{ color: '#6B7280' }}>
                  Discutez avec vos amies de vos dernières lectures, partagez vos coups de cœur et vos critiques
                </p>

                {/* Friend suggestions */}
                {myFriends.length > 0 && (
                  <div className="space-y-3">
                    <p className="text-xs font-bold" style={{ color: '#FF69B4' }}>
                      COMMENCER AVEC
                    </p>
                    {myFriends.slice(0, 3).map(friend => {
                      const online = isUserOnline(friend.friend_email);
                      const otherUser = allUsers.find(u => u.email === friend.friend_email);
                      const friendReading = getFriendCurrentReading(friend.friend_email);
                      
                      return (
                        <button
                          key={friend.id}
                          onClick={() => createChatMutation.mutate(friend.friend_email)}
                          className="w-full p-4 rounded-2xl hover:shadow-lg transition-all text-left"
                          style={{ backgroundColor: '#FFF3F7' }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="relative">
                              <div className="w-12 h-12 rounded-full overflow-hidden"
                                   style={{ background: otherUser?.profile_picture ? 'transparent' : 'linear-gradient(135deg, #FFB7D5, #E9D9FF)' }}>
                                {otherUser?.profile_picture ? (
                                  <img src={otherUser.profile_picture} alt="" className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-white font-bold">
                                    {friend.friend_name?.[0]?.toUpperCase() || 'A'}
                                  </div>
                                )}
                              </div>
                              {online && (
                                <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white online-dot"
                                     style={{ backgroundColor: '#10B981' }} />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-bold text-sm" style={{ color: '#2D3748' }}>
                                {friend.friend_name}
                              </p>
                              {friendReading && (
                                <p className="text-xs truncate" style={{ color: '#F59E0B' }}>
                                  📖 Lit actuellement "{friendReading.title}"
                                </p>
                              )}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                )}

                <Link to={createPageUrl("Friends")} className="block mt-6">
                  <Button className="w-full rounded-2xl text-white"
                          style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
                    <Users className="w-5 h-5 mr-2" />
                    Voir toutes mes amies
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}