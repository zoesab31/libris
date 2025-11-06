
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Music, ExternalLink, Play } from "lucide-react";
import { Button } from "@/components/ui/button";

// Platform detection from URL
const detectPlatform = (url) => {
  if (!url) return null;
  if (url.includes('youtube.com') || url.includes('youtu.be')) return 'youtube';
  if (url.includes('spotify.com')) return 'spotify';
  if (url.includes('deezer.com')) return 'deezer';
  return 'other';
};

// Get embed URL for each platform
const getEmbedUrl = (url, platform) => {
  if (!url) return null;
  
  switch (platform) {
    case 'youtube': {
      const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
      return match ? `https://www.youtube.com/embed/${match[1]}` : null;
    }
    case 'spotify': {
      const match = url.match(/spotify\.com\/(track|album|playlist)\/([^?]+)/);
      return match ? `https://open.spotify.com/embed/${match[1]}/${match[2]}` : null;
    }
    case 'deezer': {
      const match = url.match(/deezer\.com\/(track|album|playlist)\/(\d+)/);
      return match ? `https://widget.deezer.com/widget/dark/${match[1]}/${match[2]}` : null;
    }
    default:
      return null;
  }
};

// Platform icons and colors
const platformInfo = {
  youtube: { icon: '🎥', color: '#FF0000', name: 'YouTube' },
  spotify: { icon: '🎵', color: '#1DB954', name: 'Spotify' },
  deezer: { icon: '🎶', color: '#FF6600', name: 'Deezer' },
  other: { icon: '🔗', color: 'var(--deep-pink)', name: 'Lien' }
};

export default function MusicPlaylistCard({ myBooks, allBooks }) {
  const booksWithMusic = myBooks.filter(b => b.music && b.music_link).slice(0, 3);

  if (booksWithMusic.length === 0) {
    return (
      <Card className="shadow-lg border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
        <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--deep-pink), var(--gold))' }} />
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="flex items-center gap-2 text-base md:text-lg" style={{ color: 'var(--dark-text)' }}>
            <Music className="w-4 h-4 md:w-5 md:h-5" />
            Ma Playlist Littéraire 🎵
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          <div className="text-center py-8">
            <Music className="w-12 h-12 md:w-16 md:h-16 mx-auto mb-4 opacity-20" style={{ color: 'var(--warm-pink)' }} />
            <p className="text-xs md:text-sm font-medium" style={{ color: 'var(--dark-text)' }}>
              Associez des musiques (YouTube, Spotify, Deezer) à vos livres pour créer votre playlist
            </p>
            <p className="text-xs mt-2" style={{ color: 'var(--warm-pink)' }}>
              💡 Ajoutez une musique dans les détails d'un livre "En cours"
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-0 overflow-hidden" style={{ backgroundColor: 'white' }}>
      <div className="h-2" style={{ background: 'linear-gradient(90deg, var(--deep-pink), var(--gold))' }} />
      <CardHeader className="p-4 md:p-6">
        <CardTitle className="flex items-center gap-2 text-base md:text-lg" style={{ color: 'var(--dark-text)' }}>
          <Music className="w-4 h-4 md:w-5 md:h-5" />
          Ma Playlist Littéraire 🎵
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 md:p-6">
        <div className="space-y-4">
          {booksWithMusic.map((userBook) => {
            const book = allBooks.find(b => b.id === userBook.book_id);
            const platform = detectPlatform(userBook.music_link);
            const embedUrl = getEmbedUrl(userBook.music_link, platform);
            const info = platformInfo[platform] || platformInfo.other;
            
            return (
              <div key={userBook.id} 
                   className="rounded-xl overflow-hidden transition-all hover:shadow-lg"
                   style={{ 
                     background: 'linear-gradient(135deg, var(--soft-pink), var(--beige))',
                   }}>
                <div className="p-3 md:p-4">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-md"
                         style={{ backgroundColor: info.color }}>
                      <Music className="w-5 h-5 md:w-6 md:h-6 text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs md:text-sm mb-1 line-clamp-1" style={{ color: 'var(--dark-text)' }}>
                        🎵 {userBook.music}
                      </p>
                      <p className="text-[10px] md:text-xs font-medium mb-1" style={{ color: 'var(--warm-pink)' }}>
                        par {userBook.music_artist}
                      </p>
                      <p className="text-[10px] md:text-xs line-clamp-1" style={{ color: 'var(--dark-text)' }}>
                        📚 {book?.title}
                      </p>
                    </div>
                    <a 
                      href={userBook.music_link} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex-shrink-0"
                    >
                      <Button size="icon" variant="ghost" className="rounded-full">
                        <ExternalLink className="w-4 h-4" style={{ color: info.color }} />
                      </Button>
                    </a>
                  </div>
                  
                  {/* Platform badge */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-xs px-2 py-1 rounded-full font-medium"
                          style={{ backgroundColor: info.color, color: 'white' }}>
                      {info.icon} {info.name}
                    </span>
                  </div>

                  {/* Embedded player */}
                  {embedUrl && (
                    <div className="rounded-lg overflow-hidden shadow-md">
                      {platform === 'youtube' && (
                        <iframe 
                          width="100%" 
                          height="180" 
                          src={embedUrl}
                          frameBorder="0"
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                          allowFullScreen
                          className="rounded-lg"
                        />
                      )}
                      {platform === 'spotify' && (
                        <iframe 
                          style={{ borderRadius: '12px' }}
                          src={embedUrl} 
                          width="100%" 
                          height="152" 
                          frameBorder="0" 
                          allowFullScreen
                          allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" 
                          loading="lazy"
                        />
                      )}
                      {platform === 'deezer' && (
                        <iframe 
                          src={embedUrl} 
                          width="100%" 
                          height="152" 
                          frameBorder="0" 
                          allowFullScreen
                          allow="encrypted-media; clipboard-write"
                          className="rounded-lg"
                        />
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
