import Dashboard from './pages/Dashboard';
import MyLibrary from './pages/MyLibrary';
import Bingo from './pages/Bingo';
import Authors from './pages/Authors';
import Quotes from './pages/Quotes';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "MyLibrary": MyLibrary,
    "Bingo": Bingo,
    "Authors": Authors,
    "Quotes": Quotes,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};