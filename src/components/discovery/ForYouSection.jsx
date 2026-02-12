import React, { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Heart, Users, TrendingUp, X, Plus, BookOpen } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export default function ForYouSection({ user, myBooks, friendsBooks, allBooks, myFriends, allUsers, compact = false }) {
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  // Fetch today's recommendation
  const { data: todayRecommendation } = useQuery({
    queryKey: ['dailyRecommendation', user?.email, today],
    queryFn: async () => {
      const recs = await base44.entities.DailyRecommendation.filter({
        created_by: user?.email,
        date: today,
        is_dismissed: false
      });
      
      if (recs.length > 0) return recs[0];
      
      // Generate new recommendation
      return generateDailyRecommendation();
    },
    enabled: !!user,
  });

  const generateDailyRecommendation = useMemo(() => async () => {
    if (!myBooks || !allBooks || myBooks.length === 0) return null;

    // Get books I've already read or have in library
    const myBookIds = new Set(myBooks.map(ub => ub.book_id));
    
    // Analyze my reading preferences
    const myGenres = {};
    const myAuthors = {};
    const myHighRatedBooks = myBooks.filter(ub => ub.rating >= 4);
    
    myHighRatedBooks.forEach(ub => {
      const book = allBooks.find(b => b.id === ub.book_id);
      if (!book) return;
      
      // Count genres
      if (book.genre) {
        myGenres[book.genre] = (myGenres[book.genre] || 0) + ub.rating;
      }
      if (book.custom_genres) {
        book.custom_genres.forEach(g => {
          myGenres[g] = (myGenres[g] || 0) + ub.rating;
        });
      }
      
      // Count authors
      if (book.author) {
        myAuthors[book.author] = (myAuthors[book.author] || 0) + ub.rating;
      }
    });

    // Get friends' highly rated books
    const friendsHighRated = friendsBooks?.filter(fb => 
      fb.rating >= 4 && fb.status === "Lu" && !myBookIds.has(fb.book_id)
    ) || [];

    // Score each potential recommendation
    const candidates = [];
    
    friendsHighRated.forEach(fb => {
      const book = allBooks.find(b => b.id === fb.book_id);
      if (!book) return;
      
      let score = 0;
      const reasons = [];
      const friendsWhoLoved = [];
      
      // Friend rating boost
      score += fb.rating * 10;
      const friendUser = allUsers?.find(u => u.email === fb.created_by);
      const friendName = friendUser?.display_name || friendUser?.full_name || fb.created_by?.split('@')[0];
      friendsWhoLoved.push(fb.created_by);
      
      // Genre match
      if (book.genre && myGenres[book.genre]) {
        score += myGenres[book.genre] * 5;
        reasons.push(`Tu adores le genre ${book.genre}`);
      }
      if (book.custom_genres) {
        book.custom_genres.forEach(g => {
          if (myGenres[g]) {
            score += myGenres[g] * 5;
            reasons.push(`Genre: ${g}`);
          }
        });
      }
      
      // Author match
      if (book.author && myAuthors[book.author]) {
        score += myAuthors[book.author] * 8;
        reasons.push(`Tu aimes ${book.author}`);
      }
      
      // Multiple friends loved it
      const otherFriendsWhoLoved = friendsHighRated.filter(
        ofb => ofb.book_id === fb.book_id && ofb.created_by !== fb.created_by
      );
      if (otherFriendsWhoLoved.length > 0) {
        score += otherFriendsWhoLoved.length * 15;
        otherFriendsWhoLoved.forEach(ofb => friendsWhoLoved.push(ofb.created_by));
        reasons.push(`${otherFriendsWhoLoved.length + 1} amies l'adorent`);
      } else {
        reasons.push(`Adoré par ${friendName}`);
      }
      
      candidates.push({
        book,
        score,
        reason: reasons.join(' • '),
        friendsWhoLoved: [...new Set(friendsWhoLoved)],
      });
    });

    // Sort by score and pick top one
    candidates.sort((a, b) => b.score - a.score);
    
    if (candidates.length === 0) return null;
    
    const topPick = candidates[0];
    
    // Save recommendation
    const savedRec = await base44.entities.DailyRecommendation.create({
      date: today,
      book_id: topPick.book.id,
      reason: topPick.reason,
      match_score: Math.min(100, Math.round(topPick.score)),
      recommended_by_friends: topPick.friendsWhoLoved,
    });
    
    return savedRec;
  }, [myBooks, allBooks, friendsBooks, allUsers, user, today]);

  const dismissMutation = useMutation({
    mutationFn: () => base44.entities.DailyRecommendation.update(todayRecommendation.id, { is_dismissed: true }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailyRecommendation'] });
      toast.success("Recommandation ignorée");
    },
  });

  const addToLibraryMutation = useMutation({
    mutationFn: async () => {
      await base44.entities.UserBook.create({
        book_id: todayRecommendation.book_id,
        status: "À lire",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myBooks'] });
      toast.success("Livre ajouté à ta bibliothèque !");
    },
  });

  if (!todayRecommendation) {
    return (
      <Card className="border-0 shadow-lg overflow-hidden">
        <CardContent className="p-8 text-center">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-20" style={{ color: '#FF69B4' }} />
          <p className="text-sm" style={{ color: '#9CA3AF' }}>
            Continue à lire et noter des livres pour recevoir des recommandations personnalisées
          </p>
        </CardContent>
      </Card>
    );
  }

  const book = allBooks?.find(b => b.id === todayRecommendation.book_id);
  if (!book) return null;

  const friendsNames = todayRecommendation.recommended_by_friends?.map(email => {
    const friend = allUsers?.find(u => u.email === email);
    return friend?.display_name || friend?.full_name || email.split('@')[0];
  }).slice(0, 3);

  if (compact) {
    return (
      <Card className="border-0 shadow-xl overflow-hidden hover:shadow-2xl transition-all"
            style={{ background: 'linear-gradient(135deg, #FFF5F8 0%, #FFF0F6 100%)' }}>
        <div className="absolute top-0 right-0 w-32 h-32 opacity-5"
             style={{ background: 'radial-gradient(circle, #FF1493 0%, transparent 70%)' }} />
        
        <CardContent className="p-6 relative">
          <div className="flex items-start gap-2 mb-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold" style={{ color: '#2D3748' }}>
                ✨ Pour toi aujourd'hui
              </h3>
              <p className="text-xs" style={{ color: '#FF1493' }}>
                {todayRecommendation.match_score}% de correspondance
              </p>
            </div>
          </div>

          <div className="flex gap-4">
            {book.cover_url && (
              <div className="w-20 h-28 rounded-xl overflow-hidden shadow-lg flex-shrink-0">
                <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <h4 className="font-bold text-base mb-1 line-clamp-2" style={{ color: '#2D3748' }}>
                {book.title}
              </h4>
              <p className="text-sm mb-2" style={{ color: '#6B7280' }}>
                {book.author}
              </p>
              
              <p className="text-xs mb-3 line-clamp-2" style={{ color: '#FF69B4' }}>
                {todayRecommendation.reason}
              </p>

              {friendsNames && friendsNames.length > 0 && (
                <div className="flex items-center gap-1 mb-3">
                  <Users className="w-3 h-3" style={{ color: '#9CA3AF' }} />
                  <p className="text-xs" style={{ color: '#9CA3AF' }}>
                    {friendsNames.join(', ')}
                  </p>
                </div>
              )}

              <Button
                onClick={() => addToLibraryMutation.mutate()}
                size="sm"
                className="w-full rounded-xl text-white font-medium shadow-lg"
                style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}
                disabled={addToLibraryMutation.isPending}
              >
                <Plus className="w-4 h-4 mr-1" />
                Ajouter
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-0 shadow-2xl overflow-hidden hover:shadow-3xl transition-all relative"
          style={{ background: 'linear-gradient(135deg, #FFF5F8 0%, #FFF0F6 100%)' }}>
      <div className="absolute top-0 right-0 w-64 h-64 opacity-5"
           style={{ background: 'radial-gradient(circle, #FF1493 0%, transparent 70%)' }} />
      
      <CardContent className="p-8 relative">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}>
              <Sparkles className="w-7 h-7 text-white" />
            </div>
            <div>
              <h3 className="text-2xl font-bold" style={{ color: '#2D3748' }}>
                ✨ Pour toi aujourd'hui
              </h3>
              <p className="text-sm font-medium" style={{ color: '#FF1493' }}>
                {todayRecommendation.match_score}% de correspondance avec tes goûts
              </p>
            </div>
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => dismissMutation.mutate()}
            className="rounded-full"
          >
            <X className="w-5 h-5" style={{ color: '#9CA3AF' }} />
          </Button>
        </div>

        <div className="flex gap-6">
          {book.cover_url && (
            <div className="w-40 h-56 rounded-2xl overflow-hidden shadow-2xl flex-shrink-0 hover:scale-105 transition-transform">
              <img src={book.cover_url} alt={book.title} className="w-full h-full object-cover" />
            </div>
          )}
          
          <div className="flex-1 min-w-0">
            <h4 className="text-2xl font-bold mb-2" style={{ color: '#2D3748' }}>
              {book.title}
            </h4>
            <p className="text-lg mb-4" style={{ color: '#6B7280' }}>
              par {book.author}
            </p>
            
            {book.synopsis && (
              <p className="text-sm mb-4 line-clamp-3" style={{ color: '#374151' }}>
                {book.synopsis}
              </p>
            )}

            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {book.genre && (
                <span className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: '#FFE9F0', color: '#FF1493' }}>
                  {book.genre}
                </span>
              )}
              {book.page_count && (
                <span className="px-3 py-1 rounded-full text-xs font-medium"
                      style={{ backgroundColor: '#F3F4F6', color: '#6B7280' }}>
                  {book.page_count} pages
                </span>
              )}
            </div>

            <div className="p-4 rounded-2xl mb-4" style={{ backgroundColor: 'rgba(255, 255, 255, 0.7)' }}>
              <p className="text-sm font-medium mb-2" style={{ color: '#2D3748' }}>
                Pourquoi ce livre ?
              </p>
              <p className="text-sm" style={{ color: '#FF1493' }}>
                {todayRecommendation.reason}
              </p>
            </div>

            {friendsNames && friendsNames.length > 0 && (
              <div className="flex items-center gap-2 mb-6">
                <Users className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                <p className="text-sm" style={{ color: '#6B7280' }}>
                  Adoré par <span className="font-bold">{friendsNames.join(', ')}</span>
                  {todayRecommendation.recommended_by_friends.length > 3 && 
                    ` et ${todayRecommendation.recommended_by_friends.length - 3} autre${todayRecommendation.recommended_by_friends.length - 3 > 1 ? 's' : ''}`
                  }
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={() => addToLibraryMutation.mutate()}
                className="flex-1 rounded-2xl text-white font-bold py-6 text-lg shadow-xl hover:scale-105 transition-transform"
                style={{ background: 'linear-gradient(135deg, #FF1493, #FF69B4)' }}
                disabled={addToLibraryMutation.isPending}
              >
                <Plus className="w-5 h-5 mr-2" />
                Ajouter à ma bibliothèque
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}