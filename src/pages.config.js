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
import BookTournament from './pages/BookTournament';
import VirtualLibrary from './pages/VirtualLibrary';
import AccountSettings from './pages/AccountSettings';
import Friends from './pages/Friends';
import ShelfView from './pages/ShelfView';
import Chat from './pages/Chat';
import UserProfile from './pages/UserProfile';
import Series from './pages/Series';
import Statistics from './pages/Statistics';
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
    "BookTournament": BookTournament,
    "VirtualLibrary": VirtualLibrary,
    "AccountSettings": AccountSettings,
    "Friends": Friends,
    "ShelfView": ShelfView,
    "Chat": Chat,
    "UserProfile": UserProfile,
    "Series": Series,
    "Statistics": Statistics,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};