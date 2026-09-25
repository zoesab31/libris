import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

// Chaque entité est associée aux fragments de clés de requêtes qu'elle affecte.
// Quand un événement temps réel arrive (création/modification/suppression),
// les requêtes concernées sont invalidées et se rafraîchissent instantanément.
const ENTITY_FRAGMENTS = {
  Book: ["book", "library"],
  UserBook: ["userbook", "library", "book"],
  ReadingComment: ["comment"],
  Quote: ["quote"],
  CustomShelf: ["shelf", "library"],
  CustomGenre: ["genre", "book"],
  BookSeries: ["series"],
  SharedReading: ["sharedreading", "reading"],
  SharedReadingMessage: ["sharedreading", "message", "chat"],
  SharedReadingWishlist: ["wishlist", "sharedreading"],
  ChatRoom: ["chat"],
  ChatMessage: ["chat", "message"],
  Friendship: ["friend"],
  Notification: ["notification"],
  ReadingGoal: ["goal"],
  ReadingStreak: ["streak", "statistic"],
  ReadingProgress: ["progress", "tracker"],
  ReadingJournalEntry: ["journal"],
  BookBoyfriend: ["boyfriend", "character", "profile"],
  FavoriteCouple: ["couple", "profile"],
  FavoriteCharacter: ["character", "profile"],
  BingoChallenge: ["bingo", "challenge"],
  Tournament: ["tournament"],
  TournamentMatch: ["tournament"],
  Suggestion: ["suggestion"],
  ActivityFeed: ["activity", "feed"],
  ActivityComment: ["activity", "comment"],
  FanArt: ["fanart", "fan"],
  NailInspo: ["nail"],
  ReadingLocation: ["location", "map"],
  UserPoints: ["point", "badge"],
  LibraryDecoration: ["decoration", "point"],
  Badge: ["badge"],
  UserBadge: ["badge"],
  DailyRecommendation: ["recommendation", "discover"],
  BookOfTheYear: ["bookoftheyear", "book"],
  MonthlyBookVote: ["vote", "monthlyvote"],
  ReadingList: ["readinglist"],
  BookCollection: ["collection"],
  ReadingNote: ["note", "progress"],
  ReadingObjective: ["objective", "goal"],
  ReadingDay: ["readingday", "calendar", "statistic"],
};

export default function RealtimeSync() {
  const queryClient = useQueryClient();
  const pendingRef = useRef(new Set());
  const timerRef = useRef(null);

  useEffect(() => {
    // Regroupe les invalidations en rafales (300ms) pour éviter le spam de requêtes
    const flush = () => {
      const frags = Array.from(pendingRef.current);
      pendingRef.current.clear();
      if (frags.length === 0) return;
      const queries = queryClient.getQueryCache().getAll();
      const keys = new Set();
      for (const q of queries) {
        const keyStr = q.queryKey
          .map((k) => (typeof k === "string" ? k : JSON.stringify(k)))
          .join(" ")
          .toLowerCase();
        if (frags.some((f) => keyStr.includes(f))) keys.add(q.queryKey);
      }
      keys.forEach((key) => queryClient.invalidateQueries({ queryKey: key }));
    };

    const schedule = (frags) => {
      frags.forEach((f) => pendingRef.current.add(f));
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(flush, 300);
    };

    const unsubs = [];
    for (const [name, frags] of Object.entries(ENTITY_FRAGMENTS)) {
      try {
        const entity = base44.entities[name];
        if (!entity?.subscribe) continue;
        unsubs.push(entity.subscribe(() => schedule(frags)));
      } catch (e) {
        console.log(`Realtime sync unavailable for ${name}:`, e);
      }
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      unsubs.forEach((u) => {
        try {
          u();
        } catch (e) {}
      });
    };
  }, [queryClient]);

  return null;
}