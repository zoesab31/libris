import Dashboard from './pages/Dashboard';
import MyLibrary from './pages/MyLibrary';
import Bingo from './pages/Bingo';
import Authors from './pages/Authors';
import Quotes from './pages/Quotes';
import FanArt from './pages/FanArt';
import NailInspo from './pages/NailInspo';
import Discover from './pages/Discover';
import Maps from './pages/Maps';
import Profile from './pages/Profile';
import SharedReadings from './pages/SharedReadings';
import AccountSettings from './pages/AccountSettings';
import Friends from './pages/Friends';
import ShelfView from './pages/ShelfView';
import Chat from './pages/Chat';
import UserProfile from './pages/UserProfile';
import Statistics from './pages/Statistics';
import BookTournament from './pages/BookTournament';
import Series from './pages/Series';
import MusicPlaylist from './pages/MusicPlaylist';
import OneSignalGuide from './pages/OneSignalGuide';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "MyLibrary": MyLibrary,
    "Bingo": Bingo,
    "Authors": Authors,
    "Quotes": Quotes,
    "FanArt": FanArt,
    "NailInspo": NailInspo,
    "Discover": Discover,
    "Maps": Maps,
    "Profile": Profile,
    "SharedReadings": SharedReadings,
    "AccountSettings": AccountSettings,
    "Friends": Friends,
    "ShelfView": ShelfView,
    "Chat": Chat,
    "UserProfile": UserProfile,
    "Statistics": Statistics,
    "BookTournament": BookTournament,
    "Series": Series,
    "MusicPlaylist": MusicPlaylist,
    "OneSignalGuide": OneSignalGuide,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};