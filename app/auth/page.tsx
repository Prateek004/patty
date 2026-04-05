"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { signIn, signUp } from "@/lib/supabase/auth";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    setError("");
    if (!username.trim() || password.length < 6) {
      setError("Username required and password must be ≥ 6 characters.");
      return;
    }
    setLoading(true);
    const result = mode === "signin"
      ? await signIn(username, password)
      : await signUp(username, password);

    if (!result.ok) {
      setError(result.error ?? "Something went wrong.");
      setLoading(false);
      return;
    }

    router.replace("/");
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-5">
      {/* Logo */}
      <div className="flex flex-col items-center mb-8">
        <div className="w-16 h-16 rounded-3xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-200 mb-3">
          <span className="text-white text-3xl font-black">B</span>
        </div>
        <h1 className="text-2xl font-black text-gray-900">BillMate</h1>
        <p className="text-sm text-gray-400 font-medium mt-0.5">Smart POS for Indian F&amp;B</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-sm border border-gray-100 p-6">
        {/* Tabs */}
        <div className="flex rounded-2xl bg-gray-100 p-1 mb-6">
          {(["signin", "signup"] as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => { setMode(m); setError(""); }}
              className={`flex-1 py-2 rounded-xl text-sm font-bold transition-all ${
                mode === m ? "bg-white text-gray-900 shadow-sm" : "text-gray-400"
              }`}
            >
              {m === "signin" ? "Sign In" : "Create Account"}
            </button>
          ))}
        </div>

        {/* Fields */}
        <div className="space-y-3 mb-4">
          <div className="relative">
            <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="bm-input pl-10 border-2"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
            />
          </div>
          <div className="relative">
            <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              className="bm-input pl-10 pr-11 border-2"
              placeholder="Password"
              type={showPwd ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              onClick={() => setShowPwd((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 press"
            >
              {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="text-sm text-red-500 font-semibold bg-red-50 rounded-xl px-3 py-2 mb-4">
            {error}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full h-12 bg-primary-500 text-white rounded-2xl font-bold press shadow-md shadow-primary-100 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {mode === "signin" ? "Sign In" : "Create Account"}
        </button>

        <p className="text-xs text-gray-400 text-center mt-4">
          {mode === "signin" ? "New here? " : "Already have an account? "}
          <button
            onClick={() => { setMode(mode === "signin" ? "signup" : "signin"); setError(""); }}
            className="text-primary-500 font-bold"
          >
            {mode === "signin" ? "Create account" : "Sign in"}
          </button>
        </p>
      </div>
    </div>
  );
}
