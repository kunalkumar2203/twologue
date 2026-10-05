import { createBrowserRouter } from "react-router";
import AppLayout from "./app/AppLayout";
import { TABS } from "./app/tabs";
import Placeholder from "./components/Placeholder";
import Settings from "./pages/Settings";

export default createBrowserRouter([
  {
    element: <AppLayout />,
    children: [
      ...TABS.map((tab) => ({
        path: tab.path,
        element: <Placeholder title={tab.label} blurb={tab.blurb} />,
      })),
      { path: "/settings", element: <Settings /> },
    ],
  },
]);