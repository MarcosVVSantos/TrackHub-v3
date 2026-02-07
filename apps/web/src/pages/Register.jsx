import { useState } from "react";
import { UserPlus } from "lucide-react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", username: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    try {
      await register(form);
      navigate("/dashboard");
    } catch (err) {
      setError(err.message);
    }
  }

  return (
  <div className="mx-auto mt-16 max-w-md rounded-2xl bg-white p-8 shadow-md dark:bg-brand-darkSecondary">
      <h1 className="text-2xl font-semibold text-brand-primary">Criar conta</h1>
      <p className="mt-1 text-sm text-gray-500">Comece a colaborar hoje</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          className="input"
          placeholder="Nome"
          value={form.name}
          onChange={(event) => setForm({ ...form, name: event.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Username"
          value={form.username}
          onChange={(event) => setForm({ ...form, username: event.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Email"
          type="email"
          value={form.email}
          onChange={(event) => setForm({ ...form, email: event.target.value })}
          required
        />
        <input
          className="input"
          placeholder="Senha"
          type="password"
          value={form.password}
          onChange={(event) => setForm({ ...form, password: event.target.value })}
          required
        />
        {error && <p className="text-sm text-red-500">{error}</p>}
        <button className="btn-primary w-full" type="submit">
          <UserPlus size={16} />
          Criar conta
        </button>
      </form>
      <p className="mt-4 text-sm text-gray-500">
        Já tem conta?{" "}
        <Link className="text-brand-primary" to="/login">
          Entrar
        </Link>
      </p>
    </div>
  );
}

export default Register;
