"use client";

import { useState } from "react";
import { useApp } from "@/lib/store/AppContext";
import { fmtRupee, calcDiscount, calcGST } from "@/lib/utils";
import { Minus, Plus, Trash2, Tag } from "lucide-react";
import CheckoutModal from "./CheckoutModal";

interface Props {
  onClose?: () => void; // used when CartPanel is inside a modal
}

export default function CartPanel({ onClose }: Props) {
  const { state, updateCartQty, removeFromCart } = useApp();
  const { cart, business } = state;

  const [discountType, setDiscountType] = useState<"flat" | "percent">("flat");
  const [discountInput, setDiscountInput] = useState("");
  const [showCheckout, setShowCheckout] = useState(false);

  // ── Totals (all in paise) ──────────────────────────────────────────────────
  const subtotalPaise = cart.reduce((sum, item) => {
    const addons = item.selectedAddOns.reduce((s, a) => s + a.pricePaise, 0);
    return sum + (item.unitPricePaise + addons) * item.qty;
  }, 0);

  const discountValue = Number(discountInput) || 0;
  const discountPaise = calcDiscount(subtotalPaise, discountType, discountValue);
  const afterDiscount = Math.max(0, subtotalPaise - discountPaise);
  const gstPercent = business?.gstPercent ?? 0;
  const gstPaise = calcGST(afterDiscount, gstPercent);
  const totalPaise = afterDiscount + gstPaise;

  const itemCount = cart.reduce((s, i) => s + i.qty, 0);

  const handleClearAll = () => {
    cart.forEach((i) => removeFromCart(i.cartId));
    setDiscountInput("");
  };

  return (
    <>
      <div className="flex flex-col h-full bg-white">
        {/* ── Header ── */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 shrink-0">
          <h2 className="font-bold text-gray-900">
            Cart{itemCount > 0 ? ` · ${itemCount} item${itemCount > 1 ? "s" : ""}` : ""}
          </h2>
          {cart.length > 0 && (
            <button onClick={handleClearAll} className="text-xs font-semibold text-red-500 press">
              Clear all
            </button>
          )}
        </div>

        {/* ── Items ── */}
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-2">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-gray-300 select-none">
              <span className="text-5xl mb-3">🛒</span>
              <p className="text-sm font-semibold">Cart is empty</p>
              <p className="text-xs mt-1">Tap items to add</p>
            </div>
          ) : (
            cart.map((item) => {
              const addons = item.selectedAddOns.reduce((s, a) => s + a.pricePaise, 0);
              const lineTotal = (item.unitPricePaise + addons) * item.qty;
              return (
                <div key={item.cartId} className="bg-gray-50 rounded-2xl p-3">
                  <div className="flex items-start gap-2 mb-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                      {item.selectedSize && (
                        <p className="text-xs text-gray-500">{item.selectedSize}</p>
                      )}
                      {item.selectedPortion && (
                        <p className="text-xs text-gray-500">{item.selectedPortion}</p>
                      )}
                      {item.selectedAddOns.length > 0 && (
                        <p className="text-xs text-gray-400">
                          + {item.selectedAddOns.map((a) => a.name).join(", ")}
                        </p>
                      )}
                      {item.notes && (
                        <p className="text-xs text-primary-500 italic mt-0.5">"{item.notes}"</p>
                      )}
                    </div>
                    <button
                      onClick={() => removeFromCart(item.cartId)}
                      className="text-gray-300 hover:text-red-400 transition-colors p-0.5 shrink-0"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center bg-white border border-gray-200 rounded-xl overflow-hidden">
                      <button
                        onClick={() => updateCartQty(item.cartId, item.qty - 1)}
                        className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 transition-colors press"
                      >
                        <Minus size={13} />
                      </button>
                      <span className="w-7 text-center text-sm font-black">{item.qty}</span>
                      <button
                        onClick={() => updateCartQty(item.cartId, item.qty + 1)}
                        className="w-8 h-8 flex items-center justify-center bg-primary-500 hover:bg-primary-600 transition-colors press"
                      >
                        <Plus size={13} className="text-white" />
                      </button>
                    </div>
                    <span className="text-sm font-black text-gray-900">{fmtRupee(lineTotal)}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* ── Summary + Checkout ── */}
        {cart.length > 0 && (
          <div className="border-t border-gray-100 px-4 pt-3 pb-4 space-y-3 shrink-0">
            {/* Discount row */}
            <div className="flex items-center gap-2">
              <Tag size={14} className="text-gray-400 shrink-0" />
              <div className="flex rounded-xl border border-gray-200 overflow-hidden shrink-0">
                <button
                  onClick={() => setDiscountType("flat")}
                  className={`px-2.5 py-1.5 text-xs font-bold transition-colors ${discountType === "flat" ? "bg-primary-500 text-white" : "bg-white text-gray-500"}`}
                >
                  ₹
                </button>
                <button
                  onClick={() => setDiscountType("percent")}
                  className={`px-2.5 py-1.5 text-xs font-bold transition-colors ${discountType === "percent" ? "bg-primary-500 text-white" : "bg-white text-gray-500"}`}
                >
                  %
                </button>
              </div>
              <input
                type="number"
                className="flex-1 h-8 px-3 rounded-xl border border-gray-200 text-sm font-semibold outline-none focus:border-primary-500 transition-colors"
                placeholder={discountType === "flat" ? "Discount ₹" : "Discount %"}
                value={discountInput}
                onChange={(e) => setDiscountInput(e.target.value)}
              />
            </div>

            {/* Bill lines */}
            <div className="space-y-1 text-sm">
              <div className="flex justify-between text-gray-500">
                <span>Subtotal</span>
                <span className="font-semibold">{fmtRupee(subtotalPaise)}</span>
              </div>
              {discountPaise > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span className="font-semibold">−{fmtRupee(discountPaise)}</span>
                </div>
              )}
              {gstPercent > 0 && (
                <div className="flex justify-between text-gray-500">
                  <span>GST ({gstPercent}%)</span>
                  <span className="font-semibold">{fmtRupee(gstPaise)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-gray-900 pt-1.5 border-t border-gray-100">
                <span>Total</span>
                <span className="text-primary-500">{fmtRupee(totalPaise)}</span>
              </div>
            </div>

            <button
              onClick={() => setShowCheckout(true)}
              className="w-full h-12 bg-primary-500 text-white rounded-2xl font-bold press shadow-md shadow-primary-100"
            >
              Proceed to Checkout →
            </button>
          </div>
        )}
      </div>

      <CheckoutModal
        open={showCheckout}
        onClose={() => { setShowCheckout(false); onClose?.(); }}
        totalPaise={totalPaise}
        subtotalPaise={subtotalPaise}
        discountPaise={discountPaise}
        gstPaise={gstPaise}
        gstPercent={gstPercent}
        discountType={discountType}
        discountValue={discountValue}
      />
    </>
  );
}
