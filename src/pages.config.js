/**
 * pages.config.js - Page routing configuration
 * 
 * This file is AUTO-GENERATED. Do not add imports or modify PAGES manually.
 * Pages are auto-registered when you create files in the ./pages/ folder.
 * 
 * THE ONLY EDITABLE VALUE: mainPage
 * This controls which page is the landing page (shown when users visit the app).
 * 
 * Example file structure:
 * 
 *   import HomePage from './pages/HomePage';
 *   import Dashboard from './pages/Dashboard';
 *   import Settings from './pages/Settings';
 *   
 *   export const PAGES = {
 *       "HomePage": HomePage,
 *       "Dashboard": Dashboard,
 *       "Settings": Settings,
 *   }
 *   
 *   export const pagesConfig = {
 *       mainPage: "HomePage",
 *       Pages: PAGES,
 *   };
 * 
 * Example with Layout (wraps all pages):
 *
 *   import Home from './pages/Home';
 *   import Settings from './pages/Settings';
 *   import __Layout from './Layout.jsx';
 *
 *   export const PAGES = {
 *       "Home": Home,
 *       "Settings": Settings,
 *   }
 *
 *   export const pagesConfig = {
 *       mainPage: "Home",
 *       Pages: PAGES,
 *       Layout: __Layout,
 *   };
 *
 * To change the main page from HomePage to Dashboard, use find_replace:
 *   Old: mainPage: "HomePage",
 *   New: mainPage: "Dashboard",
 *
 * The mainPage value must match a key in the PAGES object exactly.
 */
import AccountSettings from './pages/AccountSettings';
import Authors from './pages/Authors';
import Bingo from './pages/Bingo';
import BookTournament from './pages/BookTournament';
import Chat from './pages/Chat';
import Dashboard from './pages/Dashboard';
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
import SuggestionsWall from './pages/SuggestionsWall';
import UserProfile from './pages/UserProfile';
import VirtualLibrary from './pages/VirtualLibrary';
import Library from './pages/Library';
import Challenges from './pages/Challenges';
import Social from './pages/Social';
import Lifestyle from './pages/Lifestyle';
import __Layout from './Layout.jsx';


export const PAGES = {
    "AccountSettings": AccountSettings,
    "Authors": Authors,
    "Bingo": Bingo,
    "BookTournament": BookTournament,
    "Chat": Chat,
    "Dashboard": Dashboard,
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
    "SuggestionsWall": SuggestionsWall,
    "UserProfile": UserProfile,
    "VirtualLibrary": VirtualLibrary,
    "Library": Library,
    "Challenges": Challenges,
    "Social": Social,
    "Lifestyle": Lifestyle,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: __Layout,
};