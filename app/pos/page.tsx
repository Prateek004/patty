"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/AppContext";
import type { MenuItem } from "@/lib/types";
import MenuItemCard from "@/components/pos/MenuItemCard";
import ItemConfigModal from "@/components/pos/ItemConfigModal";
import CartPanel from "@/components/pos/CartPanel";
import BottomNav from "@/components/ui/BottomNav";
import DesktopSidebar from "@/components/ui/DesktopSidebar";
import Modal from "@/components/ui/Modal";
import { fmtRupee, calcGST } from "@/lib/utils";
import { Search, X } from "lucide-react";

export default function POSPage() {
  const { state } = useApp();
  const router = useRouter();
  const { menuItems, categories, business, cart, isLoading } = state;

  const [activeCat, setActiveCat] = useState<string>("all");
  const [configItem, setConfigItem] = useState<MenuItem | null>(null);
  const [search, setSearch] = useState("");
  const [cartOpen, setCartOpen] = useState(false);

  // ── Signup guard: redirect to onboarding if no business profile ─────────
  useEffect(() => {
    if (!isLoading && !business) {
      router.replace("/onboarding");
    }
  }, [isLoading, business, router]);

  const filteredItems = menuItems.filter((item) => {
    if (!item.isAvailable) return false;
    const catOk = activeCat === "all" || item.categoryId === activeCat;
    const searchOk = !search || item.name.toLowerCase().includes(search.toLowerCase());
    return catOk && searchOk;
  });

  const subtotal = cart.reduce((s, i) => {
    const ao = i.selectedAddOns.reduce((x, a) => x + a.pricePaise, 0);
    return s + (i.unitPricePaise + ao) * i.qty;
  }, 0);
  const gstPercent = business?.gstPercent ?? 0;
  const gstPaise = calcGST(subtotal, gstPercent);
  const cartTotal = subtotal + gstPaise;
  const cartCount = cart.reduce((s, i) => s + i.qty, 0);

  const scrollCatIntoView = (id: string) => {
    setActiveCat(id);
    document.getElementById(`pill-${id}`)?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  };

  if (isLoading) {
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
    <>
      {/* ── DESKTOP: Sidebar + 2-panel workspace ──────────────────── */}
      <div className="hidden lg:flex h-screen overflow-hidden">
        <DesktopSidebar />

        {/* Left panel: Inventory / Product Grid */}
        <div className="flex flex-col overflow-hidden" style={{ flex: "0 0 62%" }}>
          <MenuPanel
            bizName={business?.name}
            categories={categories}
            items={filteredItems}
            activeCat={activeCat}
            onCatChange={scrollCatIntoView}
            search={search}
            onSearch={setSearch}
            onItemPress={setConfigItem}
          />
        </div>

        {/* Right panel: Active Transaction / Cart */}
        <div
          className="flex flex-col overflow-hidden border-l border-gray-100 bg-white"
          style={{ flex: "0 0 38%" }}
        >
          <CartPanel />
        </div>
      </div>

      {/* ── MOBILE: High-Density Register ─────────────────────────── */}
      <div className="lg:hidden flex flex-col h-screen overflow-hidden">
        <MenuPanel
          bizName={business?.name}
          categories={categories}
          items={filteredItems}
          activeCat={activeCat}
          onCatChange={scrollCatIntoView}
          search={search}
          onSearch={setSearch}
          onItemPress={setConfigItem}
          mobileCompact
        />

        {/* Sticky cart bar */}
        {cartCount > 0 && (
          <button
            onClick={() => setCartOpen(true)}
            className="fixed bottom-16 left-3 right-3 z-30 bg-primary-500 rounded-2xl px-5 py-3 flex items-center shadow-xl press"
          >
            <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center mr-3 shrink-0">
              <span className="text-white text-sm font-black">{cartCount}</span>
            </div>
            <span className="text-white font-bold flex-1 text-left">View Cart</span>
            <span className="text-white font-black text-lg">{fmtRupee(cartTotal)}</span>
          </button>
        )}

        <div className="h-16 shrink-0" />
        <BottomNav />
      </div>

      {/* Mobile cart drawer */}
      <Modal open={cartOpen} onClose={() => setCartOpen(false)} title="Your Cart">
        <div style={{ height: "70dvh" }}>
          <CartPanel onClose={() => setCartOpen(false)} />
        </div>
      </Modal>

      {/* Item config modal */}
      <ItemConfigModal item={configItem} onClose={() => setConfigItem(null)} />
    </>
  );
}

// ── MenuPanel ──────────────────────────────────────────────────────────────────

interface MenuPanelProps {
  bizName?: string;
  categories: ReturnType<typeof useApp>["state"]["categories"];
  items: MenuItem[];
  activeCat: string;
  onCatChange: (id: string) => void;
  search: string;
  onSearch: (s: string) => void;
  onItemPress: (item: MenuItem) => void;
  mobileCompact?: boolean;
}

function MenuPanel({
  bizName,
  categories,
  items,
  activeCat,
  onCatChange,
  search,
  onSearch,
  onItemPress,
  mobileCompact = false,
}: MenuPanelProps) {
  return (
    <div className="flex flex-col h-full bg-gray-50">
      <div className="bg-white px-4 pt-12 lg:pt-4 pb-0 shadow-sm sticky top-0 z-20">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h1 className="text-lg font-black text-gray-900 leading-tight">
              {bizName ?? "BillMate"}
            </h1>
            <p className="text-xs text-gray-400 font-medium">
              {mobileCompact ? "Tap item to add" : "Inventory · Point of Sale"}
            </p>
          </div>
          <div className="w-10 h-10 rounded-2xl bg-primary-500 flex items-center justify-center shadow-md lg:hidden">
            <span className="text-white font-black text-lg">B</span>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <Search
            size={16}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
          />
          <input
            className="w-full h-10 pl-9 pr-9 rounded-xl bg-gray-100 text-sm font-medium outline-none focus:bg-white focus:ring-2 focus:ring-primary-200 transition-all"
            placeholder="Search items…"
            value={search}
            onChange={(e) => onSearch(e.target.value)}
          />
          {search && (
            <button
              onClick={() => onSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 press"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Category pills */}
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-3">
          <Pill
            id="pill-all"
            label="All"
            active={activeCat === "all"}
            onClick={() => onCatChange("all")}
          />
          {categories.map((c) => (
            <Pill
              key={c.id}
              id={`pill-${c.id}`}
              label={c.name}
              active={activeCat === c.id}
              onClick={() => onCatChange(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto px-3 py-3">
        {items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 text-gray-300">
            <span className="text-5xl mb-3">🍽️</span>
            <p className="font-semibold text-sm">No items found</p>
            {search && (
              <button
                onClick={() => onSearch("")}
                className="mt-2 text-primary-500 text-sm font-semibold press"
              >
                Clear search
              </button>
            )}
          </div>
        ) : (
          <div className={`grid gap-2 ${mobileCompact ? "grid-cols-2 xs:grid-cols-3" : "grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4"}`}>
            {items.map((item) => (
              <MenuItemCard
                key={item.id}
                item={item}
                onConfigPress={onItemPress}
                compact={mobileCompact}
              />
            ))}
          </div>
        )}
        <div className="h-32 lg:h-4" />
      </div>
    </div>
  );
}

function Pill({
  id,
  label,
  active,
  onClick,
}: {
  id: string;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      id={id}
      onClick={onClick}
      className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all press ${
        active
          ? "bg-primary-500 text-white shadow-sm"
          : "bg-white text-gray-600 border border-gray-200"
      }`}
    >
      {label}
    </button>
  );
}
