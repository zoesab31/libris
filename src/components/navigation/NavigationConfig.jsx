import { BookOpen, Library, Trophy, Users, Sparkles, TrendingUp, Grid3x3, BookUser, MessageSquare, Quote, Image, Palette, Map, Heart, Target, BookMarked } from "lucide-react";
import { createPageUrl } from "@/utils";

export const navigationConfig = {
  home: {
    id: 'home',
    label: 'Accueil',
    icon: BookOpen,
    path: createPageUrl('Home'),
    color: '#FF1493',
    gradient: 'linear-gradient(135deg, #FF1493, #FF69B4)',
  },
  library: {
    id: 'library',
    label: 'Bibliothèque',
    icon: Library,
    path: createPageUrl('Library'),
    color: '#FF69B4',
    gradient: 'linear-gradient(135deg, #FF69B4, #FFB6C1)',
    subItems: [
      { label: 'Mes Livres', path: createPageUrl('MyLibrary'), icon: BookOpen },
      { label: 'Étagères', path: createPageUrl('ShelfView'), icon: Grid3x3 },
      { label: 'Statistiques', path: createPageUrl('Statistics'), icon: TrendingUp },
      { label: 'Vue 3D', path: createPageUrl('VirtualLibrary'), icon: BookMarked },
    ]
  },
  challenges: {
    id: 'challenges',
    label: 'Défis',
    icon: Trophy,
    path: createPageUrl('Challenges'),
    color: '#E91E63',
    gradient: 'linear-gradient(135deg, #E91E63, #FF1493)',
    subItems: [
      { label: 'Bingo Lecture', path: createPageUrl('Bingo'), icon: Grid3x3 },
      { label: 'Tournoi', path: createPageUrl('BookTournament'), icon: Trophy },
      { label: 'Séries', path: createPageUrl('Series'), icon: BookOpen },
      { label: 'Abécédaire', path: createPageUrl('Authors'), icon: BookUser },
      { label: 'Objectifs', path: createPageUrl('Dashboard'), icon: Target },
    ]
  },
  social: {
    id: 'social',
    label: 'Social',
    icon: Users,
    path: createPageUrl('Social'),
    color: '#9C27B0',
    gradient: 'linear-gradient(135deg, #9C27B0, #BA68C8)',
    subItems: [
      { label: 'Mes Amies', path: createPageUrl('Friends'), icon: Users },
      { label: 'Lectures Communes', path: createPageUrl('SharedReadings'), icon: BookOpen },
      { label: 'Messages', path: createPageUrl('Chat'), icon: MessageSquare },
      { label: 'Découvrir', path: createPageUrl('Discover'), icon: Sparkles },
      { label: 'Mur des idées', path: createPageUrl('SuggestionsWall'), icon: Sparkles },
    ]
  },
  lifestyle: {
    id: 'lifestyle',
    label: 'Lifestyle',
    icon: Sparkles,
    path: createPageUrl('Lifestyle'),
    color: '#FFB6C1',
    gradient: 'linear-gradient(135deg, #FFB6C1, #FFD700)',
    subItems: [
      { label: 'Citations', path: createPageUrl('Quotes'), icon: Quote },
      { label: 'Fan Art', path: createPageUrl('FanArt'), icon: Image },
      { label: 'Playlists', path: createPageUrl('MusicPlaylist'), icon: Sparkles },
      { label: 'Inspi Ongles', path: createPageUrl('NailInspo'), icon: Palette },
      { label: 'Lieux de Lecture', path: createPageUrl('Maps'), icon: Map },
      { label: 'Mon Profil', path: createPageUrl('Profile'), icon: Heart },
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