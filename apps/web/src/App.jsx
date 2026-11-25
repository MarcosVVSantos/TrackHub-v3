import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

// Cada página vira um arquivo separado, baixado só quando a pessoa abre aquela tela.
// Assim a primeira visita não precisa baixar o app inteiro (gráficos, chat, arrastar e soltar...).
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Home = lazy(() => import("./pages/Home"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Projects = lazy(() => import("./pages/Projects"));
const ProjectDetail = lazy(() => import("./pages/ProjectDetail"));
const Feed = lazy(() => import("./pages/Feed"));
const Account = lazy(() => import("./pages/Account"));
const Profile = lazy(() => import("./pages/Profile"));
const Explore = lazy(() => import("./pages/Explore"));
const Calendar = lazy(() => import("./pages/Calendar"));
const Landing = lazy(() => import("./pages/Landing"));
const Chat = lazy(() => import("./pages/Chat"));
const Playlists = lazy(() => import("./pages/Playlists"));
const PlaylistDetail = lazy(() => import("./pages/PlaylistDetail"));
const Invites = lazy(() => import("./pages/Invites"));
const Terms = lazy(() => import("./pages/Legal").then((module) => ({ default: module.Terms })));
const Privacy = lazy(() => import("./pages/Legal").then((module) => ({ default: module.Privacy })));

// Enquanto o arquivo da página chega (normalmente uma fração de segundo).
function PageLoading() {
  return (
    <div role="status" aria-live="polite" className="flex min-h-[40vh] items-center justify-center text-sm text-th-muted">
      Carregando…
    </div>
  );
}
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
      <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={!loading && user ? <Navigate to="/inicio" replace /> : <Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/esqueci-senha" element={<ForgotPassword />} />
        <Route path="/redefinir-senha" element={<ResetPassword />} />
        <Route path="/termos" element={<Terms />} />
        <Route path="/privacidade" element={<Privacy />} />
        {protectedPages.map(([path, Page]) => (
          <Route
            key={path}
            path={path}
            element={
              <ProtectedRoute>
                {/* Suspense aqui dentro: a barra lateral continua na tela enquanto a página carrega */}
                <Suspense fallback={<PageLoading />}>
                  <Page />
                </Suspense>
              </ProtectedRoute>
            }
          />
        ))}
        {/* Endereços antigos continuam funcionando */}
        <Route path="/dashboard" element={<Navigate to="/inicio" replace />} />
        <Route path="/feed" element={<Navigate to="/comunidade" replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      <GlobalPlayer />
    </div>
  );
}

export default App;
