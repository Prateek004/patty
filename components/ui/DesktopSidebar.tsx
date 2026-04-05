"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  ClipboardList,
  UtensilsCrossed,
  BarChart2,
  Settings,
} from "lucide-react";
import { useApp } from "@/lib/store/AppContext";

const NAV = [
  { href: "/pos",      label: "Register",  Icon: ShoppingCart    },
  { href: "/orders",   label: "Orders",    Icon: ClipboardList   },
  { href: "/menu",     label: "Inventory", Icon: UtensilsCrossed },
  { href: "/stats",    label: "Stats",     Icon: BarChart2       },
  { href: "/settings", label: "Settings",  Icon: Settings        },
];

export default function DesktopSidebar() {
  const pathname = usePathname();
  const { state } = useApp();
  const cartCount = state.cart.reduce((s, i) => s + i.qty, 0);

  return (
    <aside className="hidden lg:flex flex-col w-[68px] h-screen bg-gray-900 shrink-0 items-center py-5 z-50">
      {/* Logo mark */}
      <div className="w-10 h-10 rounded-2xl bg-primary-500 flex items-center justify-center mb-7 shadow-lg shadow-primary-900/40">
        <span className="text-white text-xl font-black">B</span>
      </div>

      {/* Nav items */}
      <nav className="flex flex-col gap-1 w-full px-2 flex-1">
        {NAV.map(({ href, label, Icon }) => {
          const active = pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              title={label}
              className={`relative flex flex-col items-center justify-center gap-0.5 py-2.5 rounded-xl transition-all group press ${
                active
                  ? "bg-primary-500 text-white shadow-md shadow-primary-900/30"
                  : "text-gray-400 hover:bg-gray-800 hover:text-gray-200"
              }`}
            >
              <div className="relative">
                <Icon size={20} strokeWidth={active ? 2.5 : 1.8} />
                {href === "/pos" && cartCount > 0 && (
                  <span className="badge-pop absolute -top-1.5 -right-2 min-w-[15px] h-[15px] px-0.5 bg-white text-primary-600 text-[8px] font-black rounded-full flex items-center justify-center">
                    {cartCount > 9 ? "9+" : cartCount}
                  </span>
                )}
              </div>
              <span className="text-[9px] font-bold leading-none">{label}</span>

              {/* Tooltip */}
              <span className="absolute left-full ml-2 px-2 py-1 bg-gray-800 text-white text-xs font-bold rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-50">
                {label}
              </span>
            </Link>
          );
        })}
      </nav>

      {/* Business initials at bottom */}
      <div className="w-8 h-8 rounded-xl bg-gray-700 flex items-center justify-center mt-auto">
        <span className="text-gray-300 text-xs font-black">
          {state.business?.name?.[0]?.toUpperCase() ?? "?"}
        </span>
      </div>
    </aside>
  );
}
