import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MessageSquare, AlertTriangle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";

export default function RecentActivity({ comments, allBooks }) {
  return (
    <Card className="shadow-lg border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
      <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--rose-gold), var(--gold))' }} />
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl" style={{ color: 'var(--deep-brown)' }}>
          <MessageSquare className="w-6 h-6" />
          Activité récente
        </CardTitle>
      </CardHeader>
      <CardContent>
        {comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => {
              const book = allBooks.find(b => b.id === comment.book_id);
              return (
                <div key={comment.id} 
                     className="p-4 rounded-xl border transition-all hover:shadow-md"
                     style={{ 
                       backgroundColor: 'var(--cream)',
                       borderColor: 'var(--beige)'
                     }}>
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{comment.mood || '📖'}</span>
                      <div>
                        <p className="font-semibold text-sm" style={{ color: 'var(--deep-brown)' }}>
                          {book?.title || 'Livre inconnu'}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--warm-brown)' }}>
                          Page {comment.page_number || '?'}
                        </p>
                      </div>
                    </div>
                    {comment.is_spoiler && (
                      <span className="text-xs px-2 py-1 rounded-full flex items-center gap-1"
                            style={{ backgroundColor: 'var(--rose-gold)', color: 'var(--deep-brown)' }}>
                        <AlertTriangle className="w-3 h-3" />
                        Spoiler
                      </span>
                    )}
                  </div>
                  <p className="text-sm mb-2" style={{ color: 'var(--deep-brown)' }}>
                    {comment.comment}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--soft-brown)' }}>
                    {formatDistanceToNow(new Date(comment.created_date), { addSuffix: true, locale: fr })}
                  </p>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-8">
            <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: 'var(--warm-brown)' }} />
            <p style={{ color: 'var(--warm-brown)' }}>
              Aucune activité récente
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}