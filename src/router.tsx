import { createBrowserRouter } from "react-router";
import AppLayout from "./app/AppLayout";
import { TABS } from "./app/tabs";
import Placeholder from "./components/Placeholder";
import Settings from "./pages/Settings";
import LandingPage from "./pages/LandingPage";

export default createBrowserRouter([
  {
    path: "/",
    element: <LandingPage />,
  },
  {
    path: "/app",
    element: <AppLayout />,
    children: [
      { index: true, element: <Placeholder title={TABS[0].label} blurb={TABS[0].blurb} /> },
      ...TABS.slice(1).map((tab) => ({
        path: tab.path,
        element: <Placeholder title={tab.label} blurb={tab.blurb} />,
      })),
      { path: "settings", element: <Settings /> },
    ],
  },
]);