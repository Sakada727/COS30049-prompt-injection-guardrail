import { createBrowserRouter } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import ErrorPage from "./pages/ErrorPage.jsx";
import Home from "./pages/Home.jsx";
import NotFound from "./pages/NotFound.jsx";
import CrashTest from "./pages/CrashTest.jsx";

const router = createBrowserRouter([
  {
    element: <Layout />,
    errorElement: <ErrorPage />,
    children: [
      { path: "/", element: <Home /> },
      ...(import.meta.env.DEV ? [{ path: "/crash-test", element: <CrashTest /> }] : []),
      { path: "*", element: <NotFound /> },
    ],
  },
]);

export default router;
