"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/AppContext";

export default function RootPage() {
  const router = useRouter();
  const { state } = useApp();

  useEffect(() => {
    if (state.isLoading) return;
    // Always redirect to /onboarding if no business_data — never to /settings
    router.replace(state.business ? "/pos" : "/onboarding");
  }, [state.isLoading, state.business, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-3">
        <div className="w-16 h-16 rounded-2xl bg-primary-500 flex items-center justify-center shadow-lg shadow-primary-200">
          <span className="text-white text-3xl font-black">B</span>
        </div>
        <div className="flex gap-1">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="w-2 h-2 rounded-full bg-primary-300 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s` }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
