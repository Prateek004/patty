# BillMate v17 — Architectural Overhaul

Fast, offline-first POS for Indian F&B businesses. Built with Next.js 14, TypeScript, Tailwind CSS, and Supabase.

---

## What Changed in v17

### 1. UI Architecture

**Desktop (2-Panel Wide Workspace)**
- Fixed Left Sidebar (`components/ui/DesktopSidebar.tsx`) with icons for Register, Orders, Inventory, Stats, Settings.
- Main workspace splits into **Left: Product/Inventory Grid** (62%) and **Right: Active Cart/Transaction** panel (38%).
- Checkout button is a high-contrast primary CTA at the bottom of the cart panel.

**Mobile (High-Density Register)**
- Bottom Navigation Bar retained.
- Product grid uses **Compact Card** style (`compact` prop on `MenuItemCard`): shows SKU indicator, Stock Status badge, Price, and `+ Add` button.
- All nav bars are **hidden on Onboarding** pages.

---

### 2. Authentication & Security

**Simple Auth (no OTP)**
```
app/auth/page.tsx               — Username + Password sign-up & sign-in
lib/supabase/auth.ts            — signUp(), signIn(), signOut(), getCurrentUserId()
```
- Username is stored as `username@billmate.local` synthetic email internally.
- No phone/OTP flows.

**Data Isolation (RLS)**
```sql
-- supabase-schema.sql
CREATE POLICY "orders_owner_select" ON orders
  FOR SELECT USING (auth.uid() = user_id);
```
- Every `orders` row has a `user_id` FK to `auth.users`.
- `sync.ts` always reads `auth.getUser()` and sets `user_id` before upsert.
- Users **never** see other businesses' data.

---

### 3. Logic & Navigation Bug Fixes

**Signup Guard**
- `AppShell` (`components/ui/AppShell.tsx`) wraps every authenticated page.
- If `business` is `null`, redirects to `/onboarding` — never to `/settings`.
- Nav bars are not rendered on `/onboarding` and `/auth` pages.

**Desktop Checkout Modal** (`components/pos/CheckoutModal.tsx`)

After order placement, three action tabs appear:

| Tab | Feature |
|-----|---------|
| **Invoice** | Thermal-style 80mm receipt layout, browser print via `window.open()` |
| **WhatsApp** | Pre-filled text receipt opened via `wa.me/?text=...` |
| **UPI QR** | Dynamic QR generated via `api.qrserver.com` for exact order total |

**Supabase Sync Fix** (`lib/supabase/sync.ts`)
- All money values use `Math.round()` → stored as INTEGER paise (no float drift).
- `user_id` is set from `auth.getUser()` on every sync.
- `.env` keys correctly use `NEXT_PUBLIC_` prefix.

---

## Environment Setup

Copy `.env.example` to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

Run the SQL in `supabase-schema.sql` in your Supabase SQL Editor.

---

## Run Locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## File Structure (New & Changed)

```
app/
  auth/page.tsx               ← NEW: Username+password auth
  stats/page.tsx              ← NEW: Stats page
  pos/page.tsx                ← UPDATED: Sidebar + 2-panel + signup guard
  onboarding/page.tsx         ← FIXED: No nav bars, redirect guard
  orders/page.tsx             ← UPDATED: AppShell wrapper
  menu/page.tsx               ← UPDATED: AppShell wrapper
  settings/page.tsx           ← UPDATED: AppShell wrapper

components/
  ui/
    DesktopSidebar.tsx        ← NEW: Fixed left sidebar
    AppShell.tsx              ← NEW: Auth guard + layout wrapper
  pos/
    MenuItemCard.tsx          ← UPDATED: compact prop for mobile
    CheckoutModal.tsx         ← REBUILT: Invoice + WhatsApp + UPI QR tabs

lib/
  supabase/
    auth.ts                   ← NEW: signUp/signIn username+password
    sync.ts                   ← FIXED: user_id isolation + integer paise
  
supabase-schema.sql           ← REBUILT: RLS policies + user_id FKs
.env.example                  ← FIXED: NEXT_PUBLIC_ prefix confirmed
```
