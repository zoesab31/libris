import { BookOpen, Library, Trophy, Users, Sparkles, TrendingUp, Grid3x3, BookUser, MessageSquare, Quote, Image, Palette, Map, Heart, Target, BookMarked, Award } from "lucide-react";
import { createPageUrl } from "@/utils";

export const navigationConfig = {
  home: {
    id: 'home',
    label: 'Accueil',
    icon: BookOpen,
    path: createPageUrl('Dashboard'),
    color: '#FF1493',
    gradient: 'linear-gradient(135deg, #FF1493, #FF69B4)',
  },
  library: {
    id: 'library',
    label: 'Bibliothèque',
    icon: Library,
    path: createPageUrl('MyLibrary'),
    color: '#FF69B4',
    gradient: 'linear-gradient(135deg, #FF69B4, #FFB6C1)',
    subItems: [
      { label: 'Ma bibliothèque', path: createPageUrl('MyLibrary'), icon: BookOpen },
      { label: 'Mes séries', path: createPageUrl('Series'), icon: BookMarked },
      { label: 'Abécédaire', path: createPageUrl('Authors'), icon: BookUser },
      { label: 'Statistiques', path: createPageUrl('Statistics'), icon: TrendingUp },
      { label: 'Citations', path: createPageUrl('Quotes'), icon: Quote },
    ]
  },
  challenges: {
    id: 'challenges',
    label: 'Défis',
    icon: Trophy,
    path: createPageUrl('Bingo'),
    color: '#E91E63',
    gradient: 'linear-gradient(135deg, #E91E63, #FF1493)',
    subItems: [
      { label: 'Bingo', path: createPageUrl('Bingo'), icon: Grid3x3 },
      { label: 'Tournoi', path: createPageUrl('BookTournament'), icon: Trophy },
      { label: 'Reading tracker', path: createPageUrl('ReadingTracker'), icon: Target },
      { label: 'Badges', path: createPageUrl('Badges'), icon: Award },
    ]
  },
  social: {
    id: 'social',
    label: 'Social',
    icon: Users,
    path: createPageUrl('Friends'),
    color: '#9C27B0',
    gradient: 'linear-gradient(135deg, #9C27B0, #BA68C8)',
    subItems: [
      { label: 'Mes amies', path: createPageUrl('Friends'), icon: Users },
      { label: 'Lecture commune', path: createPageUrl('SharedReadings'), icon: BookOpen },
      { label: 'Maps', path: createPageUrl('Maps'), icon: Map },
      { label: 'Mur des idées', path: createPageUrl('SuggestionsWall'), icon: Sparkles },
    ]
  },
  lifestyle: {
    id: 'lifestyle',
    label: 'Lifestyle',
    icon: Sparkles,
    path: createPageUrl('FanArt'),
    color: '#FFB6C1',
    gradient: 'linear-gradient(135deg, #FFB6C1, #FFD700)',
    subItems: [
      { label: 'Fan art', path: createPageUrl('FanArt'), icon: Image },
      { label: 'Playlist', path: createPageUrl('MusicPlaylist'), icon: Sparkles },
      { label: 'Persos préf', path: createPageUrl('Profile'), icon: Heart },
      { label: 'Inspi ongles', path: createPageUrl('NailInspo'), icon: Palette },
    ]
  }
};

export const getActiveTab = (pathname) => {
  for (const [key, config] of Object.entries(navigationConfig)) {
    if (pathname === config.path) return key;
    if (config.subItems?.some(item => pathname === item.path)) return key;
  }
  return 'home';
};