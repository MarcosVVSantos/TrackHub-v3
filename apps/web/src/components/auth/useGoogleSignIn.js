import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { apiRequest, setAccessToken, setRefreshToken } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { track } from "../../lib/analytics";

// Manda o "credential" do Google para a API e abre a sessão.
// Conta nova vai para a página de Conta, para conferir o @usuário e o perfil musical.
export default function useGoogleSignIn() {
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function signIn(credential) {
    setError("");
    setLoading(true);
    try {
      const data = await apiRequest("/auth/google", { method: "POST", body: { credential } });
      setAccessToken(data.accessToken);
      setRefreshToken(data.refreshToken);
      setUser(data.user);
      track(data.isNew ? "cadastro_google" : "login_google");
      navigate(data.isNew ? "/account?bemvindo=1" : location.state?.from || "/inicio", { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return { signIn, error, loading };
}
