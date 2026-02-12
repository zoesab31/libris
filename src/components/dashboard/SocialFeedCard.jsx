import React, { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Clock, Star, BookOpen, Target, Sparkles, Send } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SocialFeedCard({ activity, currentUser, allUsers }) {
  const [showComments, setShowComments] = useState(false);
  const [commentText, setCommentText] = useState("");
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const { data: book } = useQuery({
    queryKey: ['book', activity.book_id],
    queryFn: () => base44.entities.Book.filter({ id: activity.book_id }).then(books => books[0]),
    enabled: !!activity.book_id,
  });

  const { data: userBook } = useQuery({
    queryKey: ['userBook', activity.user_book_id],
    queryFn: () => base44.entities.UserBook.filter({ id: activity.user_book_id }).then(ubs => ubs[0]),
    enabled: !!activity.user_book_id,
  });

  const { data: comments = [] } = useQuery({
    queryKey: ['activityComments', activity.id],
    queryFn: () => base44.entities.ActivityComment.filter({ activity_id: activity.id }, 'created_date'),
    enabled: showComments,
  });

  const activityUser = allUsers?.find(u => u.email === activity.created_by);
  const hasLiked = activity.likes?.includes(currentUser?.email);

  const toggleLikeMutation = useMutation({
    mutationFn: async () => {
      const newLikes = hasLiked
        ? activity.likes.filter(email => email !== currentUser.email)
        : [...(activity.likes || []), currentUser.email];
      await base44.entities.ActivityFeed.update(activity.id, { likes: newLikes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.ActivityComment.create({
        activity_id: activity.id,
        comment: commentText,
      });
      await base44.entities.ActivityFeed.update(activity.id, {
        comments_count: (activity.comments_count || 0) + 1
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['activityFeed'] });
      queryClient.invalidateQueries({ queryKey: ['activityComments'] });
      setCommentText("");
      toast.success("Commentaire ajouté !");
    },
  });

  const getActivityIcon = () => {
    switch (activity.activity_type) {
      case 'book_finished': return { icon: BookOpen, color: '#10B981', bg: '#D1FAE5' };
      case 'book_started': return { icon: Sparkles, color: '#3B82F6', bg: '#DBEAFE' };
      case 'book_rated': return { icon: Star, color: '#F59E0B', bg: '#FEF3C7' };
      case 'book_added_pal': return { icon: Target, color: '#EC4899', bg: '#FCE7F3' };
      case 'milestone_reached': return { icon: Sparkles, color: '#8B5CF6', bg: '#EDE9FE' };
      default: return { icon: BookOpen, color: '#FF69B4', bg: '#FFE9F0' };
    }
  };

  const getActivityText = () => {
    const userName = activityUser?.display_name || activityUser?.full_name || activity.created_by?.split('@')[0];
    
    switch (activity.activity_type) {
      case 'book_finished':
        return {
          title: `${userName} a terminé "${book?.title || 'un livre'}"`,
          subtitle: activity.rating ? `⭐ ${activity.rating}/5` : null
        };
      case 'book_started':
        return {
          title: `${userName} commence "${book?.title || 'un livre'}"`,
          subtitle: book?.author ? `par ${book.author}` : null
        };
      case 'book_rated':
        return {
          title: `${userName} a noté "${book?.title || 'un livre'}"`,
          subtitle: `⭐ ${activity.rating}/5`
        };
      case 'book_added_pal':
        return {
          title: `${userName} a ajouté "${book?.title || 'un livre'}" à sa PAL`,
          subtitle: book?.author ? `par ${book.author}` : null
        };
      case 'milestone_reached':
        return {
          title: `${userName} a atteint un objectif !`,
          subtitle: activity.milestone_type?.replace('_', ' ')
        };
      default:
        return { title: 'Activité', subtitle: null };
    }
  };

  const { icon: Icon, color, bg } = getActivityIcon();
  const { title, subtitle } = getActivityText();
  const timeAgo = formatDistanceToNow(new Date(activity.created_date), { addSuffix: true, locale: fr });

  const handleBookClick = () => {
    if (book?.id && userBook?.id) {
      navigate(`${createPageUrl("MyLibrary")}?bookId=${book.id}&tab=myinfo`);
    }
  };

  return (
    <Card className="border-0 shadow-md hover:shadow-xl transition-all overflow-hidden"
          style={{ backgroundColor: 'white' }}>
      <div className="p-4 md:p-6">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0"
               style={{ background: activityUser?.profile_picture ? 'transparent' : 'linear-gradient(135deg, #FFB7D5, #E9D9FF)' }}>
            {activityUser?.profile_picture ? (
              <img src={activityUser.profile_picture} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-lg">
                {activityUser?.full_name?.[0]?.toUpperCase() || 'U'}
              </div>
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <p className="font-bold text-base leading-tight" style={{ color: '#2D3748' }}>
                  {title}
                </p>
                {subtitle && (
                  <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
                    {subtitle}
                  </p>
                )}
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                   style={{ backgroundColor: bg }}>
                <Icon className="w-5 h-5" style={{ color }} />
              </div>
            </div>
            
            <div className="flex items-center gap-2 mt-2">
              <Clock className="w-3 h-3" style={{ color: '#9CA3AF' }} />
              <span className="text-xs" style={{ color: '#9CA3AF' }}>
                {timeAgo}
              </span>
            </div>
          </div>
        </div>

        {/* Review excerpt */}
        {activity.review_excerpt && (
          <div className="mb-4 p-3 rounded-xl" style={{ backgroundColor: '#FFF9F0' }}>
            <p className="text-sm italic leading-relaxed" style={{ color: '#374151' }}>
              "{activity.review_excerpt}"
            </p>
          </div>
        )}

        {/* Book preview */}
        {book && (
          <div 
            onClick={handleBookClick}
            className="mb-4 p-3 rounded-xl flex items-center gap-3 cursor-pointer hover:bg-opacity-80 transition-all"
            style={{ backgroundColor: '#FFF5F8' }}
          >
            {book.cover_url && (
              <div className="w-12 h-16 rounded-lg overflow-hidden flex-shrink-0 shadow-sm">
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate" style={{ color: '#2D3748' }}>
                {book.title}
              </p>
              <p className="text-xs truncate" style={{ color: '#9CA3AF' }}>
                {book.author}
              </p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-4 pb-3 border-b" style={{ borderColor: '#F3F4F6' }}>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleLikeMutation.mutate()}
            className="flex items-center gap-2 rounded-full"
          >
            <Heart 
              className={`w-5 h-5 ${hasLiked ? 'fill-red-500' : ''}`}
              style={{ color: hasLiked ? '#EF4444' : '#9CA3AF' }}
            />
            <span className="font-semibold text-sm" style={{ color: hasLiked ? '#EF4444' : '#6B7280' }}>
              {activity.likes?.length || 0}
            </span>
          </Button>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowComments(!showComments)}
            className="flex items-center gap-2 rounded-full"
          >
            <MessageCircle className="w-5 h-5" style={{ color: '#9CA3AF' }} />
            <span className="font-semibold text-sm" style={{ color: '#6B7280' }}>
              {activity.comments_count || 0}
            </span>
          </Button>
        </div>

        {/* Comments section */}
        {showComments && (
          <div className="mt-4 space-y-3">
            {comments.map(comment => {
              const commentUser = allUsers?.find(u => u.email === comment.created_by);
              return (
                <div key={comment.id} className="flex gap-2">
                  <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0"
                       style={{ background: commentUser?.profile_picture ? 'transparent' : 'linear-gradient(135deg, #FFB7D5, #E9D9FF)' }}>
                    {commentUser?.profile_picture ? (
                      <img src={commentUser.profile_picture} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white font-bold text-xs">
                        {commentUser?.full_name?.[0]?.toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-3 rounded-xl" style={{ backgroundColor: '#F9FAFB' }}>
                    <p className="font-semibold text-xs mb-1" style={{ color: '#2D3748' }}>
                      {commentUser?.display_name || commentUser?.full_name || comment.created_by?.split('@')[0]}
                    </p>
                    <p className="text-sm" style={{ color: '#374151' }}>
                      {comment.comment}
                    </p>
                  </div>
                </div>
              );
            })}

            {/* Add comment */}
            <div className="flex gap-2 mt-3">
              <Textarea
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Ajouter un commentaire..."
                className="flex-1 min-h-[60px] max-h-[100px] text-sm rounded-xl"
                style={{ backgroundColor: '#F9FAFB' }}
              />
              <Button
                onClick={() => addCommentMutation.mutate()}
                disabled={!commentText.trim() || addCommentMutation.isPending}
                size="icon"
                className="rounded-full flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}
              >
                <Send className="w-4 h-4 text-white" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}