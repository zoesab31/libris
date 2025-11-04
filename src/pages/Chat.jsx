
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { MessageCircle, Send, ArrowLeft, Users, Search, Image, Smile } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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
    refetchInterval: 5000,
  });

  const { data: messages = [] } = useQuery({
    queryKey: ['chatMessages', selectedChat?.id],
    queryFn: () => base44.entities.ChatMessage.filter({ 
      chat_room_id: selectedChat?.id 
    }, 'created_date'),
    enabled: !!selectedChat,
    refetchInterval: 2000,
  });

  const { data: myFriends = [] } = useQuery({
    queryKey: ['myFriends'],
    queryFn: () => base44.entities.Friendship.filter({ 
      created_by: user?.email, 
      status: "Acceptée" 
    }),
    enabled: !!user,
  });

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

  const createChatMutation = useMutation({
    mutationFn: async (friendEmail) => {
      // Check if chat already exists
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

  return (
    <div className="h-[calc(100vh-4rem)] flex" style={{ backgroundColor: 'var(--cream)' }}>
      {/* Sidebar - Chat list */}
      <div className="w-full md:w-96 border-r flex flex-col bg-white" style={{ borderColor: 'var(--beige)' }}>
        {/* Header */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--beige)' }}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <Link to={createPageUrl("Dashboard")}>
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="w-5 h-5" />
                </Button>
              </Link>
              <h2 className="text-xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Messages
              </h2>
            </div>
            <Button
              size="icon"
              className="rounded-full"
              style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))', color: 'white' }}
            >
              <Users className="w-5 h-5" />
            </Button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher..."
              className="pl-10 bg-neutral-50"
            />
          </div>
        </div>

        {/* Friends quick access */}
        <div className="p-4 border-b" style={{ borderColor: 'var(--beige)' }}>
          <p className="text-xs font-medium mb-3" style={{ color: 'var(--warm-pink)' }}>
            MES AMIES
          </p>
          <div className="flex gap-2 overflow-x-auto">
            {myFriends.map((friend) => (
              <button
                key={friend.id}
                onClick={() => createChatMutation.mutate(friend.friend_email)}
                className="flex flex-col items-center gap-2 min-w-[60px]"
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold"
                     style={{ background: 'linear-gradient(135deg, var(--soft-pink), var(--warm-pink))' }}>
                  {friend.friend_name?.[0]?.toUpperCase() || 'A'}
                </div>
                <span className="text-xs text-center line-clamp-1" style={{ color: 'var(--dark-text)' }}>
                  {friend.friend_name?.split(' ')[0] || 'Amie'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* Chat list */}
        <div className="flex-1 overflow-y-auto">
          {chatRooms.length === 0 ? (
            <div className="text-center py-12 px-4">
              <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
              <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                Aucune conversation
              </p>
            </div>
          ) : (
            chatRooms.map((room) => (
              <button
                key={room.id}
                onClick={() => setSelectedChat(room)}
                className={`w-full p-4 flex items-start gap-3 hover:bg-neutral-50 transition-colors ${
                  selectedChat?.id === room.id ? 'bg-neutral-100' : ''
                }`}
              >
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0"
                     style={{ background: 'linear-gradient(135deg, var(--soft-pink), var(--warm-pink))' }}>
                  {getChatAvatar(room)}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium truncate" style={{ color: 'var(--dark-text)' }}>
                      {getChatName(room)}
                    </p>
                    {room.last_message_at && (
                      <span className="text-xs text-neutral-400 flex-shrink-0 ml-2">
                        {formatDistanceToNow(new Date(room.last_message_at), { addSuffix: true, locale: fr })}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-neutral-500 truncate">
                    {room.type === "PRIVATE" ? "Chat privé" : "Groupe"}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat area */}
      <div className="flex-1 flex flex-col bg-white">
        {selectedChat ? (
          <>
            {/* Chat header */}
            <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--beige)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
                     style={{ background: 'linear-gradient(135deg, var(--soft-pink), var(--warm-pink))' }}>
                  {getChatAvatar(selectedChat)}
                </div>
                <div>
                  <p className="font-bold" style={{ color: 'var(--dark-text)' }}>
                    {getChatName(selectedChat)}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                    {selectedChat.participants.length} participant{selectedChat.participants.length > 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((message) => {
                const isMe = message.sender_email === user?.email;
                return (
                  <div key={message.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[70%] ${
                      isMe 
                        ? 'bg-gradient-to-br from-pink-400 to-pink-500 text-white rounded-2xl rounded-br-md' 
                        : 'bg-neutral-100 text-neutral-900 rounded-2xl rounded-bl-md'
                    } px-4 py-2 shadow-sm`}>
                      {!isMe && (
                        <p className="text-xs font-medium mb-1 opacity-70">
                          {message.sender_email?.split('@')[0]}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                      <p className={`text-xs mt-1 ${isMe ? 'text-white/70' : 'text-neutral-400'}`}>
                        {formatDistanceToNow(new Date(message.created_date), { addSuffix: true, locale: fr })}
                      </p>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input area */}
            <form onSubmit={handleSendMessage} className="p-4 border-t" style={{ borderColor: 'var(--beige)' }}>
              <div className="flex gap-2">
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
                  className="flex-1 min-h-[44px] max-h-[120px] resize-none"
                  rows={1}
                />
                <Button
                  type="submit"
                  disabled={!messageInput.trim() || sendMessageMutation.isPending}
                  className="rounded-xl px-6"
                  style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))', color: 'white' }}
                >
                  <Send className="w-5 h-5" />
                </Button>
              </div>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageCircle className="w-20 h-20 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
              <p className="text-lg font-medium" style={{ color: 'var(--dark-text)' }}>
                Sélectionnez une conversation
              </p>
              <p className="text-sm" style={{ color: 'var(--warm-pink)' }}>
                Choisissez un ami ou une lecture commune
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
