
import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BookOpen, Library, Sparkles, Heart, Users, LogOut, Trophy, BookUser, Quote, Image, Palette, Map, Store } from "lucide-react";
import { base44 } from "@/api/base44Client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";

const navigationItems = [
  {
    title: "Tableau de bord",
    url: createPageUrl("Dashboard"),
    icon: BookOpen,
  },
  {
    title: "Ma Bibliothèque",
    url: createPageUrl("MyLibrary"),
    icon: Library,
  },
  {
    title: "Ma Bibli Virtuelle",
    url: createPageUrl("VirtualLibrary"),
    icon: Store,
  },
  {
    title: "Abécédaire",
    url: createPageUrl("Authors"),
    icon: BookUser,
  },
  {
    title: "Citations",
    url: createPageUrl("Quotes"),
    icon: Quote,
  },
  {
    title: "Bingo Lecture",
    url: createPageUrl("Bingo"),
    icon: Sparkles, // Updated from Trophy to Sparkles
  },
  {
    title: "Tournoi du Livre",
    url: createPageUrl("BookTournament"),
    icon: Trophy,
  },
  {
    title: "Fan Art",
    url: createPageUrl("FanArt"),
    icon: Image,
  },
  {
    title: "Inspi Ongles",
    url: createPageUrl("NailInspo"),
    icon: Palette,
  },
  {
    title: "Maps",
    url: createPageUrl("Maps"),
    icon: Map,
  },
  {
    title: "Découvrir",
    url: createPageUrl("Discover"),
    icon: Sparkles,
  },
  {
    title: "Lectures Communes",
    url: createPageUrl("SharedReadings"),
    icon: Users,
  },
  {
    title: "Mes Persos Préférés",
    url: createPageUrl("Profile"),
    icon: Heart,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [user, setUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setUser).catch(() => {});
  }, []);

  const handleLogout = () => {
    base44.auth.logout();
  };

  return (
    <SidebarProvider>
      <style>{`
        :root {
          --cream: #FFF0F5;
          --beige: #FFD6E8;
          --soft-pink: #FF69B4; /* Updated value */
          --warm-pink: #FF1493; /* Updated value */
          --deep-pink: #C71585; /* Updated value */
          --gold: #FFD700;
          --rose-gold: #F4C2C2;
          --dark-text: #8B0052;
        }
      `}</style>
      <div className="min-h-screen flex w-full" style={{ backgroundColor: 'var(--cream)' }}>
        <Sidebar className="border-r" style={{ borderColor: 'var(--beige)' }}>
          <SidebarHeader className="border-b p-6" style={{ borderColor: 'var(--beige)' }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" 
                   style={{ background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))' }}>
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="font-bold text-lg" style={{ color: 'var(--dark-text)' }}>
                  Nos Livres
                </h2>
                <p className="text-xs font-medium" style={{ color: 'var(--deep-pink)' }}>
                  Notre bibliothèque partagée 🌸
                </p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`mb-1 rounded-xl transition-all duration-200 ${
                          location.pathname === item.url 
                            ? 'text-white shadow-md' 
                            : 'hover:bg-opacity-50'
                        }`}
                        style={location.pathname === item.url ? {
                          background: 'linear-gradient(135deg, var(--deep-pink), var(--warm-pink))'
                        } : {}}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-3 py-2.5">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t p-4" style={{ borderColor: 'var(--beige)' }}>
            {user && (
              <div className="space-y-3">
                <Link to={createPageUrl("AccountSettings")}>
                  <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-opacity-10 hover:bg-pink-500 transition-colors cursor-pointer">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white font-semibold overflow-hidden"
                         style={{ background: user.profile_picture ? 'transparent' : 'linear-gradient(135deg, var(--warm-pink), var(--rose-gold))' }}>
                      {user.profile_picture ? (
                        <img src={user.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                      ) : (
                        user.full_name?.[0]?.toUpperCase() || 'U'
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate" style={{ color: 'var(--dark-text)' }}>
                        {user.full_name || 'Lectrice'}
                      </p>
                      <p className="text-xs truncate font-medium" style={{ color: 'var(--deep-pink)' }}>
                        {user.email}
                      </p>
                    </div>
                  </div>
                </Link>
                <button
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors"
                  style={{ 
                    backgroundColor: 'var(--beige)',
                    color: 'var(--deep-pink)'
                  }}
                >
                  <LogOut className="w-4 h-4" />
                  Déconnexion
                </button>
              </div>
            )}
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white border-b px-6 py-4 md:hidden" style={{ borderColor: 'var(--beige)' }}>
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-opacity-50 p-2 rounded-lg transition-colors" />
              <h1 className="text-xl font-bold" style={{ color: 'var(--dark-text)' }}>
                Nos Livres
              </h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
