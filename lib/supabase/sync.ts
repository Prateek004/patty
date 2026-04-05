import { getSupabase, isSupabaseEnabled } from "./client";
import { dbGetPendingOrders, dbUpdateSyncStatus } from "@/lib/db";
import type { Order } from "@/lib/types";

/**
 * Get or create an anonymous Supabase session.
 * Lets the app sync without requiring the owner to create an account.
 * The anonymous user ID is stable per device.
 */
async function ensureSession(): Promise<string | null> {
  const sb = getSupabase();
  if (!sb) return null;
  try {
    const { data: { user } } = await sb.auth.getUser();
    if (user) return user.id;
    // No session — sign in anonymously (no signup needed)
    const { data, error } = await sb.auth.signInAnonymously();
    if (error || !data.user) return null;
    return data.user.id;
  } catch {
    return null;
  }
}

/**
 * Sync a single order to Supabase.
 * Uses anonymous auth — no signup required, data isolated per device.
 * All money stored as INTEGER paise (no float rounding).
 */
export async function syncOrder(order: Order): Promise<boolean> {
  const sb = getSupabase();
  if (!sb) return false;
  try {
    const userId = await ensureSession();
    if (!userId) return false;
    const { error } = await sb.from("orders").upsert({
      id: order.id,
      user_id: userId,
      bill_number: order.billNumber,
      items: order.items,
      subtotal_paise: Math.round(order.subtotalPaise),
      discount_paise: Math.round(order.discountPaise),
      discount_type: order.discountType,
      discount_value: order.discountValue,
      gst_percent: order.gstPercent,
      gst_paise: Math.round(order.gstPaise),
      total_paise: Math.round(order.totalPaise),
      payment_method: order.paymentMethod,
      cash_received_paise: order.cashReceivedPaise != null
        ? Math.round(order.cashReceivedPaise) : null,
      change_paise: order.changePaise != null
        ? Math.round(order.changePaise) : null,
      created_at: order.createdAt,
    });
    if (error) throw error;
    await dbUpdateSyncStatus(order.id, "synced");
    return true;
  } catch {
    await dbUpdateSyncStatus(order.id, "failed");
    return false;
  }
}

export async function backgroundSync(): Promise<void> {
  if (!isSupabaseEnabled()) return;
  try {
    const pending = await dbGetPendingOrders();
    for (const order of pending) {
      await syncOrder(order);
    }
  } catch {
    // silently fail — sync is optional, offline-first
  }
}
