import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
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
import Invites from "./pages/Invites";
import { Terms, Privacy } from "./pages/Legal";
import ProtectedRoute from "./routes/ProtectedRoute";
import GlobalPlayer from "./components/GlobalPlayer";
import { useAuth } from "./context/AuthContext";

const protectedPages = [
  ["/inicio", Home],
  ["/projects", Projects],
  ["/projects/:id", ProjectDetail],
  ["/playlists", Playlists],
  ["/playlists/:id", PlaylistDetail],
  ["/calendar", Calendar],
  ["/explore", Explore],
  ["/convites", Invites],
  ["/chat", Chat],
  ["/comunidade", Feed],
  ["/desempenho", Dashboard],
  ["/profile/:id", Profile],
  ["/account", Account],
];

function App() {
  const { user, loading } = useAuth();

  return (
    <div className="min-h-screen bg-th-bg text-th-text">
      <Routes>
        <Route path="/" element={!loading && user ? <Navigate to="/inicio" replace /> : <Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/esqueci-senha" element={<ForgotPassword />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route path="/termos" element={<Terms />} />
        <Route path="/privacidade" element={<Privacy />} />
        {protectedPages.map(([path, Page]) => (
          <Route key={path} path={path} element={<ProtectedRoute><Page /></ProtectedRoute>} />
        ))}
        {/* Endereços antigos continuam funcionando */}
        <Route path="/dashboard" element={<Navigate to="/inicio" replace />} />
        <Route path="/feed" element={<Navigate to="/comunidade" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <GlobalPlayer />
    </div>
  );
}

export default App;
