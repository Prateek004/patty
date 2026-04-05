"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/AppContext";
import DesktopSidebar from "./DesktopSidebar";
import BottomNav from "./BottomNav";

interface Props {
  children: ReactNode;
}

/**
 * AppShell: wraps every authenticated page.
 * - Renders the fixed left sidebar on desktop.
 * - Renders the bottom nav on mobile.
 * - Guards: if no business profile, redirects to /onboarding.
 */
export default function AppShell({ children }: Props) {
  const { state } = useApp();
  const router = useRouter();

  useEffect(() => {
    if (!state.isLoading && !state.business) {
      router.replace("/onboarding");
    }
  }, [state.isLoading, state.business, router]);

  if (state.isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
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
    );
  }

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Fixed sidebar — desktop only */}
      <DesktopSidebar />

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto pb-16 lg:pb-0">
          {children}
        </div>
        {/* Bottom nav — mobile only */}
        <div className="lg:hidden">
          <BottomNav />
        </div>
      </div>
    </div>
  );
}
