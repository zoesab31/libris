import AccountSettings from './pages/AccountSettings';
import Authors from './pages/Authors';
import Bingo from './pages/Bingo';
import BookTournament from './pages/BookTournament';
import Chat from './pages/Chat';
import Discover from './pages/Discover';
import FanArt from './pages/FanArt';
import Friends from './pages/Friends';
import Home from './pages/Home';
import Maps from './pages/Maps';
import MusicPlaylist from './pages/MusicPlaylist';
import MyLibrary from './pages/MyLibrary';
import NailInspo from './pages/NailInspo';
import OneSignalGuide from './pages/OneSignalGuide';
import Profile from './pages/Profile';
import Quotes from './pages/Quotes';
import Series from './pages/Series';
import SeriesTracking from './pages/SeriesTracking';
import SharedReadings from './pages/SharedReadings';
import ShelfView from './pages/ShelfView';
import Statistics from './pages/Statistics';
import UserProfile from './pages/UserProfile';
import VirtualLibrary from './pages/VirtualLibrary';
import Dashboard from './pages/Dashboard';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccountSettings": AccountSettings,
    "Authors": Authors,
    "Bingo": Bingo,
    "BookTournament": BookTournament,
    "Chat": Chat,
    "Discover": Discover,
    "FanArt": FanArt,
    "Friends": Friends,
    "Home": Home,
    "Maps": Maps,
    "MusicPlaylist": MusicPlaylist,
    "MyLibrary": MyLibrary,
    "NailInspo": NailInspo,
    "OneSignalGuide": OneSignalGuide,
    "Profile": Profile,
    "Quotes": Quotes,
    "Series": Series,
    "SeriesTracking": SeriesTracking,
    "SharedReadings": SharedReadings,
    "ShelfView": ShelfView,
    "Statistics": Statistics,
    "UserProfile": UserProfile,
    "VirtualLibrary": VirtualLibrary,
    "Dashboard": Dashboard,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};