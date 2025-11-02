import Dashboard from './pages/Dashboard';
import MyLibrary from './pages/MyLibrary';
import Bingo from './pages/Bingo';
import Authors from './pages/Authors';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "MyLibrary": MyLibrary,
    "Bingo": Bingo,
    "Authors": Authors,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};