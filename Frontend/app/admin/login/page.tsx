"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { AiOutlineEye, AiOutlineEyeInvisible } from "react-icons/ai";
// Switched from Firebase demo auth to backend JWT auth
import { toast } from "react-hot-toast";

type Role = "admin" | "sales" | "designer" | "production";;
const ROLES: Role[] = ["admin", "sales", "designer", "production"];
const DEFAULT_ROLE: Role = "sales";

type UserDoc = {
  username: string;
  password: string; // demo only; don't use plaintext in prod
  role: Role;
  createdAt?: any;
  lastLogin?: any;
};

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [selectedRole, setSelectedRole] = useState<Role>(DEFAULT_ROLE);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingMsg, setLoadingMsg] = useState("Preparing your dashboard…");
  const router = useRouter();
  const formRef = useRef<HTMLFormElement | null>(null);
  const busyRef = useRef(false);

  // Prefetch & warm-up
  useEffect(() => {
    router.prefetch("/admin/dashboard");
    // getDoc(doc(db, "__warmup__", "ping")).catch(() => {}); // This line was removed as per the edit hint
  }, [router]);

  // Show logout toast if present
  useEffect(() => {
    const logoutMsg = sessionStorage.getItem("logout_message");
    if (logoutMsg) {
      toast.success(logoutMsg);
      sessionStorage.removeItem("logout_message");
    }
  }, []);

  // Enter submits (when not loading)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey && !loading) {
        const target = e.target as HTMLElement | null;
        const tag = (target?.tagName || "").toLowerCase();
        const isButtonLike =
          tag === "button" ||
          (tag === "a" && (target as HTMLAnchorElement).href) ||
          target?.getAttribute("role") === "button";
        if (isButtonLike) return;
        e.preventDefault();
        formRef.current?.requestSubmit();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [loading]);

  // Loading messages
  useEffect(() => {
    if (!loading) return;
    const messages = [
      `Hi${username ? `, ${username}` : ""} — signing you in…`,
      "Securing your session…",
      "Fetching your settings…",
      "Heading to dashboard…",
    ];
    let i = 0;
    setLoadingMsg(messages[i]);
    const id = setInterval(() => {
      i = (i + 1) % messages.length;
      setLoadingMsg(messages[i]);
    }, 1200);
    return () => clearInterval(id);
  }, [loading, username]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (busyRef.current) return;
    setError("");

    const trimmedUsername = username.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedUsername || !trimmedPassword) {
      setError("Username, password, and role are required");
      return;
    }

    try {
      busyRef.current = true;
      setLoading(true);

      const role: Role = selectedRole || DEFAULT_ROLE;
      const apiBase = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:8000";
      const resp = await fetch(`${apiBase}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmedUsername, password: trimmedPassword, role }),
      });
      if (!resp.ok) {
        const msg = await resp.json().catch(() => ({} as any));
        setError((msg as any)?.detail || "Login failed");
        toast.error((msg as any)?.detail || "Login failed");
        return;
      }
      const data = await resp.json();
      localStorage.setItem("admin_logged_in", "true");
      localStorage.setItem("admin_username", data.username || trimmedUsername);
      localStorage.setItem("admin_role", data.role || role);
      localStorage.setItem("admin_token", data.token);

      await new Promise((r) => setTimeout(r, 150));
      router.push("/admin/dashboard");
    } catch (err) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
      toast.error("Login failed. Please try again.");
    } finally {
      busyRef.current = false;
      setTimeout(() => setLoading(false), 400);
    }
  };

  const submitOnEnter = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !loading) {
      e.preventDefault();
      formRef.current?.requestSubmit();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-indigo-100 via-white to-pink-100 px-4 py-12 relative overflow-hidden">
      {/* Loading Overlay */}
      <AnimatePresence>
        {loading && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center backdrop-blur-md bg-black/30"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.98, opacity: 0 }}
              transition={{ type: "spring", stiffness: 200, damping: 20 }}
              className="text-center px-8 py-10 rounded-3xl shadow-2xl bg-white/80 border border-white/60"
            >
              <div className="mx-auto mb-5 h-12 w-12 rounded-full border-4 border-black/10 border-t-black animate-spin" />
              <h2 className="text-xl font-semibold text-gray-800">{loadingMsg}</h2>
              {username ? (
                <p className="mt-2 text-sm text-gray-600">
                  Logged in as <span className="font-medium">{username}</span>
                </p>
              ) : null}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md relative"
      >
        <div className="relative bg-[#891F1A] rounded-3xl shadow-2xl p-8 sm:p-12 border border-white/30">
          <h1 className="text-3xl font-extrabold text-white text-center mb-8 tracking-wide">
            CreativePrints
          </h1>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-semibold text-white mb-2">
                Username
              </label>
              <input
                id="username"
                type="text"
                className="w-full rounded-xl bg-transparent border border-white text-white placeholder-white/80 py-3 px-4 focus:outline-none focus:ring-2 focus:ring-white shadow-sm disabled:opacity-60"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyDown={submitOnEnter}
                disabled={loading}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-white mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  className="w-full rounded-xl bg-transparent border border-white text-white placeholder-white/80 py-3 px-4 pr-12 focus:outline-none focus:ring-2 focus:ring-white shadow-sm disabled:opacity-60"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={submitOnEnter}
                  disabled={loading}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white"
                  aria-label="Toggle password visibility"
                  disabled={loading}
                >
                  {showPassword ? <AiOutlineEyeInvisible size={20} /> : <AiOutlineEye size={20} />}
                </button>
              </div>
            </div>

            {/* Role Dropdown */}
            <div>
              <label htmlFor="role" className="block text-sm font-semibold text-white mb-2">
                Role
              </label>
              <select
                id="role"
                className="w-full rounded-xl bg-transparent border border-white text-white py-3 px-4 focus:outline-none focus:ring-2 focus:ring-white shadow-sm disabled:opacity-60"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
                disabled={loading}
                required
              >
                {ROLES.map((r) => (
                  <option key={r} value={r} className="text-black">
                    {r.charAt(0).toUpperCase() + r.slice(1)}
                  </option>
                ))}
              </select>
              <p className="text-white/70 text-xs mt-1">
                This controls which Order Lifecycle tabs you’ll see after login.
              </p>
            </div>

            {/* Error */}
            {error && <p className="text-red-300 text-sm text-center">{error}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl py-3 font-semibold text-white bg-white/20 hover:bg-white/30 transition duration-300 shadow-md disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? "Signing in…" : "Log In"}
            </button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default LoginPage;
