
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MessageSquare, AlertTriangle, User, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function RecentActivity({ comments, allBooks, myFriends = [] }) {
  const queryClient = useQueryClient();

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId) => base44.entities.ReadingComment.delete(commentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recentComments'] });
      toast.success("Activité supprimée");
    },
  });

  return (
    <Card className="shadow-lg border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
      <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--rose-gold), var(--gold))' }} />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl" style={{ color: 'var(--dark-text)' }}>
          <MessageSquare className="w-6 h-6" />
          Activité récente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => {
              const book = allBooks.find(b => b.id === comment.book_id);
              const friend = myFriends.find(f => f.friend_email === comment.created_by);
              const displayName = friend 
                ? friend.friend_name?.split(' ')[0] 
                : comment.created_by?.split('@')[0] || 'Une lectrice';
              
              return (
                <div key={comment.id} 
                     className="p-4 rounded-xl border transition-all hover:shadow-md relative group"
                     style={{ 
                       backgroundColor: 'var(--cream)',
                       borderColor: 'var(--beige)'
                     }}>
                  {!friend && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => deleteCommentMutation.mutate(comment.id)}
                      className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </Button>
                  )}

                  {/* Photos */}
                  {comment.photos && comment.photos.length > 0 && (
                    <div className="flex gap-2 mb-3 flex-wrap">
                      {comment.photos.map((photo, idx) => (
                        <img
                          key={idx}
                          src={photo}
                          alt={`Photo ${idx + 1}`}
                          className="w-20 h-20 object-cover rounded-lg shadow-md cursor-pointer hover:scale-105 transition-transform"
                          onClick={() => window.open(photo, '_blank')}
                        />
                      ))}
                    </div>
                  )}
                  
                  <div className="flex items-start gap-3 mb-3">
                    <span className="text-3xl">{comment.mood || '📖'}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <User className="w-4 h-4" style={{ color: 'var(--deep-pink)' }} />
                        <p className="font-semibold text-sm" style={{ color: 'var(--deep-pink)' }}>
                          {displayName}
                        </p>
                        <span className="text-xs" style={{ color: 'var(--warm-pink)' }}>
                          a réagi
                        </span>
                        {friend && (
                          <span className="text-xs px-2 py-0.5 rounded-full" 
                                style={{ backgroundColor: 'var(--soft-pink)', color: 'white' }}>
                            amie
                          </span>
                        )}
                      </div>
                      <p className="font-semibold text-sm" style={{ color: 'var(--dark-text)' }}>
                        {book?.title || 'Livre inconnu'}
                      </p>
                      <p className="text-xs font-medium" style={{ color: 'var(--deep-pink)' }}>
                        {comment.chapter ? `${comment.chapter}` : `Page ${comment.page_number || '?'}`}
                      </p>
                    </div>
                    {comment.is_spoiler && (
                      <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                            style={{ backgroundColor: 'var(--rose-gold)', color: 'var(--dark-text)' }}>
                        <AlertTriangle className="w-3 h-3" />
                        Spoiler
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-2 pl-11" style={{ color: 'var(--dark-text)' }}>
                    {comment.comment}
                  </p>
                  <p className="text-xs pl-11" style={{ color: 'var(--warm-pink)' }}>
                    {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: 'var(--warm-pink)' }} />
            <p style={{ color: 'var(--warm-pink)' }}>
              Aucune activité récente
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
