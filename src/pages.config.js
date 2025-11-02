import Dashboard from './pages/Dashboard';
import MyLibrary from './pages/MyLibrary';
import Layout from './Layout.jsx';


export const PAGES = {
    "Dashboard": Dashboard,
    "MyLibrary": MyLibrary,
}

export const pagesConfig = {
    mainPage: "Dashboard",
    Pages: PAGES,
    Layout: Layout,
};