"use client";

import { useState, useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/lib/store/AppContext";
import type { BusinessType, BusinessProfile } from "@/lib/types";
import { Coffee, Store, Truck, ShoppingBag, Cookie, Layers, Loader2 } from "lucide-react";

// Navigation bars are intentionally hidden on this page — no BottomNav / DesktopSidebar import.

interface BizTypeOption {
  type: BusinessType;
  label: string;
  icon: ReactNode;
  desc: string;
}

const BIZ_TYPES: BizTypeOption[] = [
  { type: "cafe",       label: "Cafe",       icon: <Coffee      size={26} />, desc: "Coffee shop, tea house" },
  { type: "restaurant", label: "Restaurant", icon: <Store       size={26} />, desc: "Dhaba, dining, QSR" },
  { type: "food_truck", label: "Food Truck", icon: <Truck       size={26} />, desc: "Street food, mobile" },
  { type: "kiosk",      label: "Kiosk",      icon: <ShoppingBag size={26} />, desc: "Quick service, canteen" },
  { type: "bakery",     label: "Bakery",     icon: <Cookie      size={26} />, desc: "Bakery, sweet shop" },
  { type: "franchise",  label: "Franchise",  icon: <Layers      size={26} />, desc: "Chain outlet" },
];

const GST_RATES = [0, 5, 12, 18];

export default function OnboardingPage() {
  const router = useRouter();
  const { state, saveBusiness, showToast } = useApp();

  const [step, setStep]   = useState<1 | 2 | 3>(1);
  const [bizType, setBizType] = useState<BusinessType | null>(null);
  const [form, setForm]   = useState({ name: "", ownerName: "", phone: "", city: "" });
  const [gst, setGst]     = useState(5);
  const [saving, setSaving] = useState(false);

  // If business already set, skip onboarding
  useEffect(() => {
    if (!state.isLoading && state.business) {
      router.replace("/pos");
    }
  }, [state.isLoading, state.business, router]);

  const handleFinish = async () => {
    if (!bizType || !form.name) return;
    setSaving(true);
    const profile: BusinessProfile = {
      businessType: bizType,
      name: form.name.trim(),
      ownerName: form.ownerName.trim(),
      phone: form.phone.trim(),
      city: form.city.trim(),
      gstPercent: gst,
      currencySymbol: "₹",
      createdAt: new Date().toISOString(),
    };
    await saveBusiness(profile);
    showToast(`Welcome! ${profile.name} is ready 🎉`);
    router.replace("/pos");
  };

  return (
    // No BottomNav / DesktopSidebar rendered here — onboarding is a clean flow
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <div className="bg-primary-500 pt-14 pb-8 px-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center mx-auto mb-3">
          <span className="text-white text-2xl font-black">B</span>
        </div>
        <h1 className="text-2xl font-black text-white">BillMate</h1>
        <p className="text-primary-100 text-sm mt-1">Smart billing for Indian F&amp;B</p>
      </div>

      {/* Progress dots */}
      <div className="flex gap-2 justify-center py-5">
        {([1, 2, 3] as const).map((s) => (
          <div
            key={s}
            className={`rounded-full h-1.5 transition-all duration-300 ${
              s === step ? "w-8 bg-primary-500" : s < step ? "w-5 bg-primary-300" : "w-5 bg-gray-200"
            }`}
          />
        ))}
      </div>

      <div className="flex-1 overflow-auto px-5 pb-8">

        {/* Step 1: Business type */}
        {step === 1 && (
          <div className="fade-in">
            <h2 className="text-xl font-black text-gray-900 mb-1">Your Business Type</h2>
            <p className="text-sm text-gray-400 mb-5">Choose what best describes your outlet</p>
            <div className="grid grid-cols-2 gap-3">
              {BIZ_TYPES.map((opt) => (
                <button
                  key={opt.type}
                  onClick={() => setBizType(opt.type)}
                  className={`p-4 rounded-2xl border-2 text-left transition-all press ${
                    bizType === opt.type
                      ? "border-primary-500 bg-primary-50"
                      : "border-gray-200 bg-white"
                  }`}
                >
                  <div className={`mb-2 ${bizType === opt.type ? "text-primary-500" : "text-gray-400"}`}>
                    {opt.icon}
                  </div>
                  <p className="font-black text-gray-900 text-sm">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
            <button
              disabled={!bizType}
              onClick={() => setStep(2)}
              className="mt-6 w-full h-13 bg-primary-500 text-white rounded-2xl font-bold press disabled:opacity-40 shadow-md h-12"
            >
              Continue →
            </button>
          </div>
        )}

        {/* Step 2: Business details */}
        {step === 2 && (
          <div className="fade-in space-y-4">
            <div>
              <h2 className="text-xl font-black text-gray-900 mb-1">Business Details</h2>
              <p className="text-sm text-gray-400 mb-5">This appears on your invoices</p>
            </div>
            {[
              { key: "name",      label: "Business Name *", placeholder: "Arjun's Café" },
              { key: "ownerName", label: "Owner Name",       placeholder: "Arjun Sharma" },
              { key: "phone",     label: "Phone / UPI ID",   placeholder: "9876543210" },
              { key: "city",      label: "City",             placeholder: "Mumbai" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-1 block">
                  {label}
                </label>
                <input
                  className="bm-input border-2"
                  placeholder={placeholder}
                  value={form[key as keyof typeof form]}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setStep(1)} className="h-12 px-5 rounded-2xl border-2 border-gray-200 font-bold text-gray-600 press">
                ← Back
              </button>
              <button
                disabled={!form.name.trim()}
                onClick={() => setStep(3)}
                className="flex-1 h-12 bg-primary-500 text-white rounded-2xl font-bold press disabled:opacity-40 shadow-md"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: GST */}
        {step === 3 && (
          <div className="fade-in">
            <h2 className="text-xl font-black text-gray-900 mb-1">GST Rate</h2>
            <p className="text-sm text-gray-400 mb-5">Select your applicable GST rate</p>
            <div className="grid grid-cols-4 gap-3 mb-6">
              {GST_RATES.map((rate) => (
                <button
                  key={rate}
                  onClick={() => setGst(rate)}
                  className={`py-4 rounded-2xl border-2 font-black text-lg transition-all press ${
                    gst === rate
                      ? "border-primary-500 bg-primary-500 text-white shadow-md"
                      : "border-gray-200 bg-white text-gray-700"
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mb-6 text-center">
              Most F&amp;B businesses apply 5% GST. You can change this in Settings.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setStep(2)} className="h-12 px-5 rounded-2xl border-2 border-gray-200 font-bold text-gray-600 press">
                ← Back
              </button>
              <button
                disabled={saving}
                onClick={handleFinish}
                className="flex-1 h-12 bg-primary-500 text-white rounded-2xl font-bold press shadow-md flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={16} className="animate-spin" />}
                {saving ? "Setting up…" : "Launch BillMate 🚀"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
