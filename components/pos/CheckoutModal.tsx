"use client";

import React, { useState, useEffect, useRef } from "react";
import Modal from "@/components/ui/Modal";
import { useApp } from "@/lib/store/AppContext";
import type { PaymentMethod } from "@/lib/types";
import { fmtRupee, fmtDate, toP, QUICK_CASH } from "@/lib/utils";
import {
  CheckCircle2, Banknote, Smartphone, CreditCard,
  Printer, MessageCircle, QrCode, X, Loader2,
} from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  totalPaise: number;
  subtotalPaise: number;
  discountPaise: number;
  gstPaise: number;
  gstPercent: number;
  discountType: "flat" | "percent";
  discountValue: number;
}

interface PayMethod {
  id: PaymentMethod;
  label: string;
  
Icon: React.ElementType;
}

const PAY_METHODS: PayMethod[] = [
  { id: "cash", label: "Cash",  Icon: Banknote   },
  { id: "upi",  label: "UPI",   Icon: Smartphone },
  { id: "card", label: "Card",  Icon: CreditCard },
];

type PostTab = "invoice" | "whatsapp" | "qr";

export default function CheckoutModal({
  open, onClose,
  totalPaise, subtotalPaise, discountPaise,
  gstPaise, gstPercent, discountType, discountValue,
}: Props) {
  const { state, placeOrder, showToast } = useApp();
  const { business, cart } = state;

  const [method, setMethod]     = useState<PaymentMethod>("cash");
  const [cashInput, setCashInput] = useState("");
  const [placing, setPlacing]   = useState(false);
  const [order, setOrder]       = useState<Awaited<ReturnType<typeof placeOrder>> | null>(null);
  const [postTab, setPostTab]   = useState<PostTab>("invoice");
  const [qrSrc, setQrSrc]       = useState<string>("");
  const [qrLoading, setQrLoading] = useState(false);
  const invoiceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setMethod("cash"); setCashInput(""); setPlacing(false);
      setOrder(null); setQrSrc("");
    }
  }, [open]);

  // Generate UPI QR when tab switches to qr
  useEffect(() => {
    if (postTab !== "qr" || !order) return;
    const amount = (order.totalPaise / 100).toFixed(2);
    const upiId  = business?.phone ? `${business.phone}@upi` : "merchant@upi";
    const name   = encodeURIComponent(business?.name ?? "BillMate");
    const upiStr = `upi://pay?pa=${upiId}&pn=${name}&am=${amount}&cu=INR&tn=Bill%20${order.billNumber}`;
    const api    = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(upiStr)}`;
    setQrSrc(""); setQrLoading(true);
    // Use image onload — no fetch needed
    const img = new Image();
    img.onload  = () => { setQrSrc(api); setQrLoading(false); };
    img.onerror = () => { setQrLoading(false); };
    img.src = api;
  }, [postTab, order, business]);

  const cashPaise  = toP(Number(cashInput) || 0);
  const changePaise = Math.max(0, cashPaise - totalPaise);
  const cashShort  = method === "cash" && cashPaise < totalPaise && cashInput !== "";
  const canConfirm = !placing && (method !== "cash" || cashPaise >= totalPaise);

  const handleConfirm = async () => {
    if (!canConfirm) {
      if (method === "cash") showToast("Cash received is less than total", "error");
      return;
    }
    setPlacing(true);
    try {
      const placed = await placeOrder({
        paymentMethod: method,
        discountType, discountValue,
        cashReceivedPaise: method === "cash" ? cashPaise : undefined,
      });
      setOrder(placed);
      setPostTab("invoice");
    } catch {
      showToast("Order failed. Try again.", "error");
      setPlacing(false);
    }
  };

  const handlePrint = () => {
    const el = invoiceRef.current;
    if (!el) return;
    const html = `
      <!DOCTYPE html><html><head>
      <meta charset="utf-8"/>
      <title>BillMate Invoice #${order?.billNumber}</title>
      <style>
        *{margin:0;padding:0;box-sizing:border-box}
        body{font-family:'Courier New',monospace;font-size:12px;width:80mm;padding:4mm}
        .c{text-align:center}.b{font-weight:bold}.lg{font-size:15px}
        .row{display:flex;justify-content:space-between}
        hr{border:none;border-top:1px dashed #000;margin:4px 0}
        .total{font-size:16px;font-weight:bold}
      </style>
      </head><body>${el.innerHTML}</body></html>`;
    const w = window.open("", "_blank", "width=400,height=600");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => { w.print(); w.close(); }, 400);
  };

  const handleWhatsApp = () => {
    if (!order) return;
    const lines = [
      `🧾 *Bill from ${business?.name ?? "BillMate"}*`,
      `Bill #: ${order.billNumber}`,
      `Date: ${fmtDate(order.createdAt)}`,
      ``,
      ...cart.map((i) => `• ${i.name} x${i.qty}  ${fmtRupee(i.unitPricePaise * i.qty)}`),
      ``,
      `Subtotal: ${fmtRupee(order.subtotalPaise)}`,
      order.discountPaise > 0 ? `Discount: -${fmtRupee(order.discountPaise)}` : null,
      gstPercent > 0 ? `GST (${gstPercent}%): ${fmtRupee(order.gstPaise)}` : null,
      `*Total: ${fmtRupee(order.totalPaise)}*`,
      `Payment: ${order.paymentMethod.toUpperCase()}`,
      ``,
      `Thank you! Visit again 🙏`,
    ].filter(Boolean).join("\n");

    window.open(`https://wa.me/?text=${encodeURIComponent(lines)}`, "_blank");
  };

  const handleDone = () => { setOrder(null); onClose(); };

  // ── Pre-checkout view ────────────────────────────────────────────────
  if (!order) {
    return (
      <Modal open={open} onClose={onClose} title="Checkout">
        <div className="px-5 pb-6 space-y-4 pt-1">
          {/* Bill summary */}
          <div className="bg-gray-50 rounded-2xl p-4 space-y-1.5 text-sm">
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
            <div className="flex justify-between text-base font-black text-gray-900 pt-2 border-t border-gray-200 mt-1">
              <span>Total</span>
              <span className="text-primary-500">{fmtRupee(totalPaise)}</span>
            </div>
          </div>

          {/* Payment method */}
          <div>
            <p className="text-sm font-bold text-gray-700 mb-2">Payment Method</p>
            <div className="grid grid-cols-3 gap-2">
              {PAY_METHODS.map(({ id, label, Icon }) => (
                <button
                  key={id}
                  onClick={() => setMethod(id)}
                  className={`py-3 rounded-2xl border-2 flex flex-col items-center gap-1.5 transition-all press ${
                    method === id
                      ? "border-primary-500 bg-primary-50 text-primary-600"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  <Icon size={20} />
                  <span className="text-xs font-bold">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Cash section */}
          {method === "cash" && (
            <div className="space-y-3">
              <div>
                <p className="text-sm font-bold text-gray-700 mb-2">Cash Received</p>
                <input
                  type="number"
                  className={`w-full h-14 px-4 rounded-2xl border-2 outline-none text-2xl font-black transition-colors ${
                    cashShort
                      ? "border-red-400 bg-red-50 text-red-600"
                      : "border-gray-200 focus:border-primary-500"
                  }`}
                  placeholder="0"
                  value={cashInput}
                  onChange={(e) => setCashInput(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {QUICK_CASH.map((amt) => (
                  <button
                    key={amt}
                    onClick={() => setCashInput(String(amt))}
                    className={`px-3 py-1.5 rounded-xl border font-bold text-sm press transition-all ${
                      Number(cashInput) === amt
                        ? "border-primary-500 bg-primary-50 text-primary-600"
                        : "border-gray-200 text-gray-600 bg-white"
                    }`}
                  >
                    ₹{amt}
                  </button>
                ))}
                <button
                  onClick={() => setCashInput(String(totalPaise / 100))}
                  className="px-3 py-1.5 rounded-xl border border-gray-200 font-bold text-sm text-gray-600 bg-white press"
                >
                  Exact
                </button>
              </div>
              {cashInput !== "" && (
                <div
                  className={`rounded-xl py-3 text-center font-bold text-sm ${
                    cashPaise >= totalPaise ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"
                  }`}
                >
                  {cashPaise >= totalPaise
                    ? `Change: ${fmtRupee(changePaise)}`
                    : `Short by ${fmtRupee(totalPaise - cashPaise)}`}
                </div>
              )}
            </div>
          )}

          {method === "upi" && (
            <div className="bg-blue-50 rounded-2xl p-5 text-center">
              <p className="text-3xl mb-2">📱</p>
              <p className="font-bold text-blue-800">Collect via UPI</p>
              <p className="text-sm text-blue-600 mt-1">{fmtRupee(totalPaise)}</p>
            </div>
          )}

          {method === "card" && (
            <div className="bg-purple-50 rounded-2xl p-5 text-center">
              <p className="text-3xl mb-2">💳</p>
              <p className="font-bold text-purple-800">Swipe / Tap card on machine</p>
              <p className="text-sm text-purple-600 mt-1">{fmtRupee(totalPaise)}</p>
            </div>
          )}

          <button
            disabled={!canConfirm}
            onClick={handleConfirm}
            className="w-full h-14 bg-primary-500 text-white rounded-2xl font-black text-lg disabled:opacity-40 press shadow-md transition-opacity flex items-center justify-center gap-2"
          >
            {placing && <Loader2 size={18} className="animate-spin" />}
            {placing ? "Processing…" : `Confirm ${fmtRupee(totalPaise)}`}
          </button>
        </div>
      </Modal>
    );
  }

  // ── Post-checkout view ───────────────────────────────────────────────
  return (
    <Modal open={open} onClose={handleDone} title="">
      <div className="flex flex-col" style={{ maxHeight: "88dvh" }}>
        {/* Success banner */}
        <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-gray-100">
          <div className="w-11 h-11 rounded-full bg-green-100 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} className="text-green-500" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-black text-gray-900">Order Placed!</p>
            <p className="text-xs text-gray-400">
              #{order.billNumber} · {fmtRupee(order.totalPaise)}
              {order.changePaise && order.changePaise > 0
                ? ` · Change: ${fmtRupee(order.changePaise)}`
                : ""}
            </p>
          </div>
          <button onClick={handleDone} className="text-gray-400 press p-1">
            <X size={18} />
          </button>
        </div>

        {/* Action tabs */}
        <div className="flex border-b border-gray-100 px-3 pt-2">
          {([
            { id: "invoice",  label: "Invoice",   Icon: Printer        },
            { id: "whatsapp", label: "WhatsApp",  Icon: MessageCircle  },
            { id: "qr",       label: "UPI QR",    Icon: QrCode         },
          ] as { id: PostTab; label: string; Icon: React.ElementType }[]).map(({ id, label, Icon }) => (
            <button
              key={id}
              onClick={() => setPostTab(id)}
              className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold border-b-2 transition-colors ${
                postTab === id
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">

          {/* ── INVOICE TAB ── */}
          {postTab === "invoice" && (
            <div>
              {/* Thermal-style invoice */}
              <div
                ref={invoiceRef}
                className="font-mono text-xs leading-relaxed bg-white border border-dashed border-gray-300 rounded-xl p-4 mx-auto"
                style={{ maxWidth: "320px" }}
              >
                <div className="c b text-sm mb-1">{business?.name ?? "BillMate"}</div>
                {business?.city && <div className="c text-gray-500">{business.city}</div>}
                {business?.phone && <div className="c text-gray-500">📞 {business.phone}</div>}
                {business?.gstNumber && <div className="c text-gray-500">GSTIN: {business.gstNumber}</div>}
                <div className="border-t border-dashed border-gray-300 my-2" />
                <div className="row">
                  <span>Bill #: {order.billNumber}</span>
                  <span>{fmtDate(order.createdAt)}</span>
                </div>
                <div className="border-t border-dashed border-gray-300 my-2" />

                {order.items.map((item, i) => {
                  const addons = item.selectedAddOns.reduce((s, a) => s + a.pricePaise, 0);
                  const line   = (item.unitPricePaise + addons) * item.qty;
                  return (
                    <div key={i} className="mb-1">
                      <div className="row">
                        <span className="flex-1 truncate pr-2">{item.name}</span>
                        <span>{fmtRupee(line)}</span>
                      </div>
                      <div className="text-gray-400 pl-2">
                        {item.qty} × {fmtRupee(item.unitPricePaise + addons)}
                        {item.selectedSize ? ` · ${item.selectedSize}` : ""}
                        {item.selectedAddOns.length > 0 ? ` + ${item.selectedAddOns.map(a => a.name).join(", ")}` : ""}
                      </div>
                    </div>
                  );
                })}

                <div className="border-t border-dashed border-gray-300 my-2" />
                <div className="row text-gray-500">
                  <span>Subtotal</span><span>{fmtRupee(order.subtotalPaise)}</span>
                </div>
                {order.discountPaise > 0 && (
                  <div className="row text-gray-500">
                    <span>Discount</span><span>-{fmtRupee(order.discountPaise)}</span>
                  </div>
                )}
                {order.gstPercent > 0 && (
                  <div className="row text-gray-500">
                    <span>GST ({order.gstPercent}%)</span><span>{fmtRupee(order.gstPaise)}</span>
                  </div>
                )}
                <div className="border-t border-dashed border-gray-300 my-2" />
                <div className="row b text-sm">
                  <span>TOTAL</span><span>{fmtRupee(order.totalPaise)}</span>
                </div>
                <div className="row text-gray-500 mt-1">
                  <span>Payment</span><span>{order.paymentMethod.toUpperCase()}</span>
                </div>
                {order.changePaise && order.changePaise > 0 ? (
                  <div className="row text-gray-500">
                    <span>Change</span><span>{fmtRupee(order.changePaise)}</span>
                  </div>
                ) : null}
                <div className="border-t border-dashed border-gray-300 my-3" />
                <div className="c text-gray-400">Thank you! Visit again 🙏</div>
                <div className="c text-gray-300 text-[10px] mt-1">Powered by BillMate</div>
              </div>

              <button
                onClick={handlePrint}
                className="mt-4 w-full h-11 flex items-center justify-center gap-2 bg-gray-900 text-white rounded-2xl font-bold text-sm press"
              >
                <Printer size={16} />
                Print Invoice
              </button>
            </div>
          )}

          {/* ── WHATSAPP TAB ── */}
          {postTab === "whatsapp" && (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-green-500 flex items-center justify-center mb-4 shadow-lg shadow-green-200">
                <MessageCircle size={32} className="text-white" />
              </div>
              <h3 className="font-black text-gray-900 text-lg mb-1">Send Receipt</h3>
              <p className="text-sm text-gray-400 mb-6">
                Share a text receipt via WhatsApp with the customer.
              </p>

              {/* Preview */}
              <div className="w-full bg-[#ECE5DD] rounded-2xl p-4 text-left text-xs font-mono text-gray-800 mb-6 max-h-48 overflow-y-auto">
                <p>🧾 <strong>Bill from {business?.name ?? "BillMate"}</strong></p>
                <p>Bill #: {order.billNumber}</p>
                <p>Date: {fmtDate(order.createdAt)}</p>
                <p>&nbsp;</p>
                {order.items.map((i, idx) => (
                  <p key={idx}>• {i.name} ×{i.qty}  {fmtRupee(i.unitPricePaise * i.qty)}</p>
                ))}
                <p>&nbsp;</p>
                <p>Subtotal: {fmtRupee(order.subtotalPaise)}</p>
                {order.discountPaise > 0 && <p>Discount: -{fmtRupee(order.discountPaise)}</p>}
                {order.gstPercent > 0 && <p>GST ({order.gstPercent}%): {fmtRupee(order.gstPaise)}</p>}
                <p><strong>Total: {fmtRupee(order.totalPaise)}</strong></p>
                <p>Payment: {order.paymentMethod.toUpperCase()}</p>
                <p>&nbsp;</p>
                <p>Thank you! Visit again 🙏</p>
              </div>

              <button
                onClick={handleWhatsApp}
                className="w-full h-12 flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white rounded-2xl font-bold press shadow-md shadow-green-200"
              >
                <MessageCircle size={18} />
                Open in WhatsApp
              </button>
            </div>
          )}

          {/* ── UPI QR TAB ── */}
          {postTab === "qr" && (
            <div className="flex flex-col items-center text-center py-4">
              <div className="w-16 h-16 rounded-3xl bg-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-blue-200">
                <QrCode size={32} className="text-white" />
              </div>
              <h3 className="font-black text-gray-900 text-lg mb-0.5">UPI QR Code</h3>
              <p className="text-2xl font-black text-primary-500 mb-1">
                {fmtRupee(order.totalPaise)}
              </p>
              <p className="text-xs text-gray-400 mb-6">
                Show this QR to customer to collect exact amount
              </p>

              <div className="w-52 h-52 rounded-2xl bg-gray-50 border-2 border-gray-200 flex items-center justify-center mb-4 overflow-hidden">
                {qrLoading && (
                  <Loader2 size={32} className="text-gray-300 animate-spin" />
                )}
                {!qrLoading && qrSrc && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={qrSrc}
                    alt="UPI QR"
                    width={192}
                    height={192}
                    className="rounded-xl"
                  />
                )}
                {!qrLoading && !qrSrc && (
                  <div className="flex flex-col items-center gap-2 text-gray-300">
                    <QrCode size={40} />
                    <p className="text-xs">QR unavailable</p>
                  </div>
                )}
              </div>

              <div className="bg-blue-50 rounded-2xl px-4 py-3 text-xs text-blue-700 font-semibold">
                UPI ID: {business?.phone ? `${business.phone}@upi` : "merchant@upi"}
              </div>
            </div>
          )}
        </div>

        {/* Done button */}
        <div className="px-5 pb-5 pt-2 border-t border-gray-100">
          <button
            onClick={handleDone}
            className="w-full h-12 bg-primary-500 text-white rounded-2xl font-bold press shadow-md shadow-primary-100"
          >
            New Order
          </button>
        </div>
      </div>
    </Modal>
  );
}
