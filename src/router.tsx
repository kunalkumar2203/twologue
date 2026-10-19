import type { ComponentType, ReactNode } from "react";
import { createBrowserRouter, useParams } from "react-router";
import AppLayout from "./app/AppLayout";
import { TABS } from "./app/tabs";
import Placeholder from "./components/Placeholder";
import { RequireAuth } from "./auth/RequireAuth";
import PairingPage, { JoinCouplePage } from "./features/couples/PairingPage";
import AuthPage from "./pages/AuthPage";
import Settings from "./pages/Settings";
import Profile from "./pages/Profile";
import TodayPage from "./features/today/TodayPage";
import { USE_MOCK_API } from "./features/today/api";
import { MoodProvider } from "./features/today/MoodContext";
import LandingPage from "./pages/LandingPage";

const SkipGate = ({ children }: { children: ReactNode }) => <>{children}</>;
const Gate: ComponentType<{ children: ReactNode }> = USE_MOCK_API ? SkipGate : RequireAuth;

function JoinRoute() {
  const { token = "" } = useParams();
  return <JoinCouplePage token={token} />;
}

export default createBrowserRouter([
  { path: "/", element: <LandingPage /> },
  { path: "/auth", element: <AuthPage /> },
  {
    path: "/join/:token",
    element: (
      <Gate>
        <div className="flex min-h-dvh items-center justify-center bg-page px-4 py-10 text-ink">
          <JoinRoute />
        </div>
      </Gate>
    ),
  },
  {
    path: "/app",
    // MoodProvider wraps the whole app shell so AppLayout header can read mood state
    element: (
      <Gate>
        <MoodProvider>
          <AppLayout />
        </MoodProvider>
      </Gate>
    ),
    children: [
      { index: true, element: <TodayPage /> },
      ...TABS.slice(1).map((tab) => ({
        path: tab.path.replace(/^\//, ""),
        element: tab.path === "us" ? <PairingPage /> : <Placeholder title={tab.label} blurb={tab.blurb} />,
      })),
      { path: "settings", element: <Settings /> },
      { path: "profile", element: <Profile /> },
    ],
  },
]);
