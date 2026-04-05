"use client";

import { useState, useEffect } from "react";
import { useApp } from "@/lib/store/AppContext";
import AppShell from "@/components/ui/AppShell";
import { fmtRupee, fmtTime, todayStr, PAY_LABEL } from "@/lib/utils";
import type { Order } from "@/lib/types";
import {
  TrendingUp,
  Banknote,
  ShoppingBag,
  Cloud,
  CloudOff,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { isSupabaseEnabled } from "@/lib/supabase/client";

export default function OrdersPage() {
  const { state } = useApp();
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<"today" | "all">("today");
  const [syncing, setSyncing] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (state.isLoading) return; // wait until IndexedDB is ready
    import("@/lib/db").then(({ dbGetAllOrders }) =>
      dbGetAllOrders().then(setAllOrders)
    );
  }, [state.orders, state.isLoading]);

  const today = todayStr();
  const todayOrders = allOrders.filter((o) => o.createdAt.startsWith(today));
  const displayed = filter === "today" ? todayOrders : allOrders;

  const todaySales = todayOrders.reduce((s, o) => s + o.totalPaise, 0);
  const totalSales = allOrders.reduce((s, o) => s + o.totalPaise, 0);

  const handleSync = async () => {
    setSyncing(true);
    const { backgroundSync } = await import("@/lib/supabase/sync");
    await backgroundSync();
    const { dbGetAllOrders } = await import("@/lib/db");
    setAllOrders(await dbGetAllOrders());
    setSyncing(false);
  };

  return (
    <AppShell>
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-gray-900">Orders</h1>
          {isSupabaseEnabled() && (
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-1.5 text-sm font-bold text-primary-500 press"
            >
              <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
              Sync
            </button>
          )}
        </div>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-primary-500 rounded-2xl p-4 text-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-primary-100">Today&apos;s Sales</span>
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center">
                <TrendingUp size={16} className="text-white" />
              </div>
            </div>
            <p className="text-xl font-black">{fmtRupee(todaySales)}</p>
            <p className="text-xs text-primary-100 mt-0.5">{todayOrders.length} orders</p>
          </div>

          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-400">Total Sales</span>
              <div className="w-8 h-8 rounded-xl bg-green-50 flex items-center justify-center">
                <Banknote size={16} className="text-green-500" />
              </div>
            </div>
            <p className="text-xl font-black text-gray-900">{fmtRupee(totalSales)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{allOrders.length} orders</p>
          </div>
        </div>

        {/* Filter tabs */}
        <div className="flex bg-white rounded-xl p-1 gap-1 shadow-sm">
          {(["today", "all"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all press ${
                filter === f ? "bg-primary-500 text-white shadow-sm" : "text-gray-500"
              }`}
            >
              {f === "today" ? `Today (${todayOrders.length})` : `All (${allOrders.length})`}
            </button>
          ))}
        </div>

        {/* Order list */}
        {displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-300">
            <ShoppingBag size={48} className="mb-3" />
            <p className="font-semibold">No orders yet</p>
            {filter === "today" && (
              <p className="text-sm mt-1">Start billing from the POS tab</p>
            )}
          </div>
        ) : (
          <div className="space-y-2">
            {displayed.map((order) => {
              const isExpanded = expanded === order.id;
              return (
                <div key={order.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                  <button
                    onClick={() => setExpanded(isExpanded ? null : order.id)}
                    className="w-full flex items-center px-4 py-3 press"
                  >
                    <div className="flex-1 text-left">
                      <p className="font-bold text-gray-900 text-sm">#{order.billNumber}</p>
                      <p className="text-xs text-gray-400 mt-0.5">
                        {fmtTime(order.createdAt)} · {PAY_LABEL[order.paymentMethod]}
                        {isSupabaseEnabled() && (
                          <span className="ml-2 inline-flex items-center">
                            {order.syncStatus === "synced" ? (
                              <Cloud size={10} className="text-green-400" />
                            ) : (
                              <CloudOff size={10} className="text-orange-400" />
                            )}
                          </span>
                        )}
                      </p>
                    </div>
                    <span className="font-black text-primary-500 mr-2">
                      {fmtRupee(order.totalPaise)}
                    </span>
                    {isExpanded ? (
                      <ChevronUp size={15} className="text-gray-400" />
                    ) : (
                      <ChevronDown size={15} className="text-gray-400" />
                    )}
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 border-t border-gray-50 pt-3 fade-in">
                      <div className="space-y-1.5 mb-3">
                        {order.items.map((item) => {
                          const ao = item.selectedAddOns.reduce(
                            (s, a) => s + a.pricePaise,
                            0
                          );
                          const line = (item.unitPricePaise + ao) * item.qty;
                          return (
                            <div key={item.cartId} className="flex justify-between text-sm">
                              <div>
                                <span className="text-gray-700">{item.name}</span>
                                {item.selectedSize && (
                                  <span className="text-xs text-gray-400 ml-1">
                                    ({item.selectedSize})
                                  </span>
                                )}
                                {item.selectedPortion && (
                                  <span className="text-xs text-gray-400 ml-1">
                                    ({item.selectedPortion})
                                  </span>
                                )}
                                <span className="text-gray-400"> × {item.qty}</span>
                              </div>
                              <span className="font-semibold text-gray-900">
                                {fmtRupee(line)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                      <div className="border-t border-gray-100 pt-2 space-y-1 text-xs text-gray-500">
                        <div className="flex justify-between">
                          <span>Subtotal</span>
                          <span>{fmtRupee(order.subtotalPaise)}</span>
                        </div>
                        {order.discountPaise > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Discount</span>
                            <span>−{fmtRupee(order.discountPaise)}</span>
                          </div>
                        )}
                        {order.gstPaise > 0 && (
                          <div className="flex justify-between">
                            <span>GST ({order.gstPercent}%)</span>
                            <span>{fmtRupee(order.gstPaise)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-gray-900 text-sm pt-1 border-t border-gray-100">
                          <span>Total</span>
                          <span>{fmtRupee(order.totalPaise)}</span>
                        </div>
                        {order.changePaise != null && order.changePaise > 0 && (
                          <div className="flex justify-between text-blue-600">
                            <span>Change returned</span>
                            <span>{fmtRupee(order.changePaise)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
    </AppShell>
  );
}
