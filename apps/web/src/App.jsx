import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import Projects from "./pages/Projects";
import ProjectDetail from "./pages/ProjectDetail";
import Feed from "./pages/Feed";
import Account from "./pages/Account";
import Profile from "./pages/Profile";
import Explore from "./pages/Explore";
import Calendar from "./pages/Calendar";
import Landing from "./pages/Landing";
import Chat from "./pages/Chat";
import Playlists from "./pages/Playlists";
import PlaylistDetail from "./pages/PlaylistDetail";
import { Terms, Privacy } from "./pages/Legal";
import ProtectedRoute from "./routes/ProtectedRoute";
import Header from "./components/Header";
import GlobalPlayer from "./components/GlobalPlayer";
import { usePlayer } from "./context/PlayerContext";
import { useAuth } from "./context/AuthContext";

function App() {
  const player = usePlayer();
  const { user, loading } = useAuth();
  const location = useLocation();
  const hasPlayer = Boolean(player?.current);
  const isLanding = location.pathname === "/";

  return (
    <div className={`min-h-screen bg-gray-50 text-gray-900 dark:bg-brand-dark dark:text-brand-text ${
      hasPlayer ? "pb-28" : ""
    }`}>
      {!isLanding && <Header />}
      <Routes>
        <Route path="/" element={!loading && user ? <Navigate to="/dashboard" replace /> : <Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/termos" element={<Terms />} />
        <Route path="/privacidade" element={<Privacy />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects"
          element={
            <ProtectedRoute>
              <Projects />
            </ProtectedRoute>
          }
        />
        <Route
          path="/calendar"
          element={
            <ProtectedRoute>
              <Calendar />
            </ProtectedRoute>
          }
        />
        <Route
          path="/projects/:id"
          element={
            <ProtectedRoute>
              <ProjectDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile/:id"
          element={
            <ProtectedRoute>
              <Profile />
            </ProtectedRoute>
          }
        />
        <Route path="/feed" element={<Feed />} />
        <Route path="/playlists" element={<ProtectedRoute><Playlists /></ProtectedRoute>} />
        <Route path="/playlists/:id" element={<ProtectedRoute><PlaylistDetail /></ProtectedRoute>} />
        <Route
          path="/chat"
          element={
            <ProtectedRoute>
              <Chat />
            </ProtectedRoute>
          }
        />
        <Route
          path="/explore"
          element={
            <ProtectedRoute>
              <Explore />
            </ProtectedRoute>
          }
        />
      </Routes>
      <GlobalPlayer />
    </div>
  );
}

export default App;
