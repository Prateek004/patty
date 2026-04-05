"use client";

import { useState, type ReactNode } from "react";
import { useApp } from "@/lib/store/AppContext";
import AppShell from "@/components/ui/AppShell";
import type { BusinessProfile, BusinessType } from "@/lib/types";
import { Cloud, CloudOff, Trash2 } from "lucide-react";
import { isSupabaseEnabled } from "@/lib/supabase/client";

const BIZ_TYPES: { value: BusinessType; label: string }[] = [
  { value: "cafe",       label: "Cafe"       },
  { value: "restaurant", label: "Restaurant" },
  { value: "food_truck", label: "Food Truck" },
  { value: "kiosk",      label: "Kiosk"      },
  { value: "bakery",     label: "Bakery"     },
  { value: "franchise",  label: "Franchise"  },
];

const GST_OPTIONS = [0, 5, 12, 18];

export default function SettingsPage() {
  const { state, saveBusiness, showToast } = useApp();
  const biz = state.business;

  const [form, setForm] = useState<BusinessProfile>(
    biz ?? {
      name: "",
      ownerName: "",
      phone: "",
      city: "",
      businessType: "restaurant",
      gstPercent: 5,
      currencySymbol: "₹",
      createdAt: new Date().toISOString(),
    }
  );
  const [saving, setSaving] = useState(false);

  const set = (k: keyof BusinessProfile, v: unknown) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.name.trim()) {
      showToast("Business name is required", "error");
      return;
    }
    setSaving(true);
    await saveBusiness(form);
    showToast("Settings saved ✓");
    setSaving(false);
  };

  const handleReset = () => {
    if (!confirm("Reset ALL app data? This cannot be undone.")) return;
    localStorage.clear();
    indexedDB.deleteDatabase("billmate_db");
    window.location.href = "/onboarding";
  };

  return (
    <AppShell>
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <h1 className="text-xl font-black text-gray-900">Settings</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        <Section title="Business Profile">
          <Field label="Business Name *">
            <input
              className="bm-input"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
            />
          </Field>
          <Field label="Owner Name">
            <input
              className="bm-input"
              value={form.ownerName}
              onChange={(e) => set("ownerName", e.target.value)}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              className="bm-input"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
          </Field>
          <Field label="City">
            <input
              className="bm-input"
              value={form.city}
              onChange={(e) => set("city", e.target.value)}
            />
          </Field>
          <Field label="Business Type">
            <select
              className="bm-input"
              value={form.businessType}
              onChange={(e) => set("businessType", e.target.value as BusinessType)}
            >
              {BIZ_TYPES.map((b) => (
                <option key={b.value} value={b.value}>{b.label}</option>
              ))}
            </select>
          </Field>
        </Section>

        <Section title="Billing">
          <div className="px-4 py-3">
            <p className="text-sm font-bold text-gray-700 mb-2">GST Rate</p>
            <div className="grid grid-cols-4 gap-2">
              {GST_OPTIONS.map((rate) => (
                <button
                  key={rate}
                  onClick={() => set("gstPercent", rate)}
                  className={`h-11 rounded-xl border-2 font-bold text-sm press transition-all ${
                    form.gstPercent === rate
                      ? "border-primary-500 bg-primary-50 text-primary-600"
                      : "border-gray-200 text-gray-600"
                  }`}
                >
                  {rate}%
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">Applied on subtotal after any discount</p>
          </div>
        </Section>

        <Section title="Cloud Sync">
          <div className="px-4 py-4 flex items-center gap-3">
            {isSupabaseEnabled() ? (
              <>
                <div className="w-9 h-9 rounded-xl bg-green-50 flex items-center justify-center shrink-0">
                  <Cloud size={18} className="text-green-500" />
                </div>
                <div className="flex-1">
                  <p className="font-bold text-gray-900 text-sm">Supabase Connected</p>
                  <p className="text-xs text-gray-400">Orders sync automatically</p>
                </div>
                <span className="w-2 h-2 bg-green-400 rounded-full" />
              </>
            ) : (
              <>
                <div className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center shrink-0">
                  <CloudOff size={18} className="text-gray-400" />
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-sm">Offline Only</p>
                  <p className="text-xs text-gray-400">Add Supabase keys in Vercel env vars</p>
                </div>
              </>
            )}
          </div>
        </Section>

        <Section title="About">
          {[
            ["Version", "v16.0.0"],
            ["Storage", "IndexedDB (offline-first)"],
            ["Framework", "Next.js 14"],
          ].map(([k, v]) => (
            <div
              key={k}
              className="flex justify-between px-4 py-3 border-b border-gray-50 last:border-0 text-sm"
            >
              <span className="text-gray-500">{k}</span>
              <span className="font-semibold text-gray-800">{v}</span>
            </div>
          ))}
        </Section>

        <button
          onClick={handleSave}
          disabled={saving}
          className="w-full h-12 bg-primary-500 text-white rounded-2xl font-bold disabled:opacity-40 press shadow-md"
        >
          {saving ? "Saving…" : "Save Settings"}
        </button>

        <Section title="Danger Zone">
          <button
            onClick={handleReset}
            className="w-full flex items-center gap-3 px-4 py-4 text-red-500 press text-left"
          >
            <Trash2 size={18} className="shrink-0" />
            <div>
              <p className="font-bold text-sm">Reset All Data</p>
              <p className="text-xs text-gray-400">Clears orders, menu, and business profile</p>
            </div>
          </button>
        </Section>
      </div>

    </div>
    </AppShell>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <p className="px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-50">
        {title}
      </p>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="px-4 py-3 border-b border-gray-50 last:border-0">
      <label className="block text-xs font-bold text-gray-400 mb-1.5">{label}</label>
      {children}
    </div>
  );
}
