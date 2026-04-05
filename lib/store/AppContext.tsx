"use client";

import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from "react";
import type {
  BusinessProfile,
  MenuItem,
  MenuCategory,
  CartItem,
  Order,
} from "@/lib/types";
import { calcDiscount, calcGST, generateBillNumber, toP } from "@/lib/utils";
import { MENU_TEMPLATES } from "@/lib/utils/menuTemplates";

// ─── Toast ────────────────────────────────────────────────────────────────────

export interface Toast {
  id: string;
  message: string;
  type: "success" | "error" | "info";
}

// ─── State ────────────────────────────────────────────────────────────────────

interface AppState {
  business: BusinessProfile | null;
  menuItems: MenuItem[];
  categories: MenuCategory[];
  cart: CartItem[];
  orders: Order[];
  isLoading: boolean;
  toasts: Toast[];
}

const initialState: AppState = {
  business: null,
  menuItems: [],
  categories: [],
  cart: [],
  orders: [],
  isLoading: true,
  toasts: [],
};

// ─── Actions ──────────────────────────────────────────────────────────────────

type Action =
  | { type: "INIT_DONE"; business: BusinessProfile | null; items: MenuItem[]; categories: MenuCategory[]; orders: Order[] }
  | { type: "SET_BUSINESS"; payload: BusinessProfile }
  | { type: "SET_MENU"; items: MenuItem[]; categories: MenuCategory[] }
  | { type: "CART_ADD"; payload: CartItem }
  | { type: "CART_QTY"; cartId: string; qty: number }
  | { type: "CART_REMOVE"; cartId: string }
  | { type: "CART_CLEAR" }
  | { type: "ORDER_ADD"; payload: Order }
  | { type: "MENU_ITEM_UPSERT"; payload: MenuItem }
  | { type: "MENU_ITEM_DELETE"; id: string }
  | { type: "CATEGORY_UPSERT"; payload: MenuCategory }
  | { type: "CATEGORY_DELETE"; id: string }
  | { type: "TOAST_ADD"; payload: Toast }
  | { type: "TOAST_REMOVE"; id: string };

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "INIT_DONE":
      return {
        ...state,
        business: action.business,
        menuItems: action.items,
        categories: action.categories,
        orders: action.orders,
        isLoading: false,
      };
    case "SET_BUSINESS":
      return { ...state, business: action.payload };
    case "SET_MENU":
      return { ...state, menuItems: action.items, categories: action.categories };
    case "CART_ADD":
      return { ...state, cart: [...state.cart, action.payload] };
    case "CART_QTY": {
      const cart =
        action.qty <= 0
          ? state.cart.filter((i) => i.cartId !== action.cartId)
          : state.cart.map((i) =>
              i.cartId === action.cartId ? { ...i, qty: action.qty } : i
            );
      return { ...state, cart };
    }
    case "CART_REMOVE":
      return { ...state, cart: state.cart.filter((i) => i.cartId !== action.cartId) };
    case "CART_CLEAR":
      return { ...state, cart: [] };
    case "ORDER_ADD":
      return { ...state, orders: [action.payload, ...state.orders] };
    case "MENU_ITEM_UPSERT":
      return {
        ...state,
        menuItems: state.menuItems.some((i) => i.id === action.payload.id)
          ? state.menuItems.map((i) =>
              i.id === action.payload.id ? action.payload : i
            )
          : [...state.menuItems, action.payload],
      };
    case "MENU_ITEM_DELETE":
      return { ...state, menuItems: state.menuItems.filter((i) => i.id !== action.id) };
    case "CATEGORY_UPSERT":
      return {
        ...state,
        categories: state.categories.some((c) => c.id === action.payload.id)
          ? state.categories.map((c) =>
              c.id === action.payload.id ? action.payload : c
            )
          : [...state.categories, action.payload],
      };
    case "CATEGORY_DELETE":
      return { ...state, categories: state.categories.filter((c) => c.id !== action.id) };
    case "TOAST_ADD":
      return { ...state, toasts: [...state.toasts, action.payload] };
    case "TOAST_REMOVE":
      return { ...state, toasts: state.toasts.filter((t) => t.id !== action.id) };
    default:
      return state;
  }
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface AppContextValue {
  state: AppState;
  saveBusiness: (b: BusinessProfile) => Promise<void>;
  addToCart: (item: CartItem) => void;
  updateCartQty: (cartId: string, qty: number) => void;
  removeFromCart: (cartId: string) => void;
  clearCart: () => void;
  placeOrder: (params: {
    paymentMethod: Order["paymentMethod"];
    discountType: "flat" | "percent";
    discountValue: number;
    cashReceivedPaise?: number;
  }) => Promise<Order>;
  upsertMenuItem: (item: MenuItem) => Promise<void>;
  deleteMenuItem: (id: string) => Promise<void>;
  upsertCategory: (cat: MenuCategory) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  showToast: (message: string, type?: Toast["type"]) => void;
}

const AppContext = createContext<AppContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Bootstrap — runs only client-side inside useEffect
  useEffect(() => {
    async function init() {
      try {
        let business: BusinessProfile | null = null;
        const raw = localStorage.getItem("bm_business");
        if (raw) business = JSON.parse(raw) as BusinessProfile;

        const db = await import("@/lib/db");
        const [items, categories, orders] = await Promise.all([
          db.dbGetAllMenuItems(),
          db.dbGetAllCategories(),
          db.dbGetAllOrders(), // ← load all orders so stats/orders pages work on fresh load
        ]);

        dispatch({ type: "INIT_DONE", business, items, categories, orders });

        if (business) {
          import("@/lib/supabase/sync")
            .then(({ backgroundSync }) => backgroundSync())
            .catch(() => {});
        }
      } catch {
        dispatch({
          type: "INIT_DONE",
          business: null,
          items: [],
          categories: [],
          orders: [],
        });
      }
    }
    init();
  }, []);

  const saveBusiness = useCallback(async (b: BusinessProfile) => {
    localStorage.setItem("bm_business", JSON.stringify(b));
    dispatch({ type: "SET_BUSINESS", payload: b });

    const db = await import("@/lib/db");
    const existing = await db.dbGetAllMenuItems();
    if (existing.length === 0) {
      const template = MENU_TEMPLATES[b.businessType];
      await db.dbBulkSaveCategories(template.categories);
      await db.dbBulkSaveMenuItems(template.items);
      dispatch({
        type: "SET_MENU",
        items: template.items,
        categories: template.categories,
      });
    }
  }, []);

  const addToCart = useCallback(
    (item: CartItem) => dispatch({ type: "CART_ADD", payload: item }),
    []
  );

  const updateCartQty = useCallback(
    (cartId: string, qty: number) => dispatch({ type: "CART_QTY", cartId, qty }),
    []
  );

  const removeFromCart = useCallback(
    (cartId: string) => dispatch({ type: "CART_REMOVE", cartId }),
    []
  );

  const clearCart = useCallback(() => dispatch({ type: "CART_CLEAR" }), []);

  const placeOrder = useCallback(
    async (params: {
      paymentMethod: Order["paymentMethod"];
      discountType: "flat" | "percent";
      discountValue: number;
      cashReceivedPaise?: number;
    }): Promise<Order> => {
      const { paymentMethod, discountType, discountValue, cashReceivedPaise } = params;

      const subtotalPaise = state.cart.reduce((sum, item) => {
        const ao = item.selectedAddOns.reduce((s, a) => s + a.pricePaise, 0);
        return sum + (item.unitPricePaise + ao) * item.qty;
      }, 0);

      const discountPaise = calcDiscount(subtotalPaise, discountType, discountValue);
      const afterDiscount = Math.max(0, subtotalPaise - discountPaise);
      const gstPercent = state.business?.gstPercent ?? 0;
      const gstPaise = calcGST(afterDiscount, gstPercent);
      const totalPaise = afterDiscount + gstPaise;
      const changePaise = cashReceivedPaise
        ? Math.max(0, cashReceivedPaise - totalPaise)
        : 0;

      const order: Order = {
        id: crypto.randomUUID(),
        billNumber: generateBillNumber(),
        items: structuredClone(state.cart),
        subtotalPaise,
        discountPaise,
        discountType,
        discountValue,
        gstPercent,
        gstPaise,
        totalPaise,
        paymentMethod,
        cashReceivedPaise,
        changePaise,
        createdAt: new Date().toISOString(),
        syncStatus: "pending",
      };

      const db = await import("@/lib/db");
      await db.dbSaveOrder(order);
      dispatch({ type: "ORDER_ADD", payload: order });
      dispatch({ type: "CART_CLEAR" });

      import("@/lib/supabase/sync")
        .then(({ syncOrder }) => syncOrder(order))
        .catch(() => {});

      return order;
    },
    [state.cart, state.business]
  );

  const upsertMenuItem = useCallback(async (item: MenuItem) => {
    const db = await import("@/lib/db");
    await db.dbSaveMenuItem(item);
    dispatch({ type: "MENU_ITEM_UPSERT", payload: item });
  }, []);

  const deleteMenuItem = useCallback(async (id: string) => {
    const db = await import("@/lib/db");
    await db.dbDeleteMenuItem(id);
    dispatch({ type: "MENU_ITEM_DELETE", id });
  }, []);

  const upsertCategory = useCallback(async (cat: MenuCategory) => {
    const db = await import("@/lib/db");
    await db.dbSaveCategory(cat);
    dispatch({ type: "CATEGORY_UPSERT", payload: cat });
  }, []);

  const deleteCategory = useCallback(async (id: string) => {
    const db = await import("@/lib/db");
    await db.dbDeleteCategory(id);
    dispatch({ type: "CATEGORY_DELETE", id });
  }, []);

  const showToast = useCallback(
    (message: string, type: Toast["type"] = "success") => {
      const id = crypto.randomUUID();
      dispatch({ type: "TOAST_ADD", payload: { id, message, type } });
      setTimeout(() => dispatch({ type: "TOAST_REMOVE", id }), 3500);
    },
    []
  );

  return (
    <AppContext.Provider
      value={{
        state,
        saveBusiness,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        placeOrder,
        upsertMenuItem,
        deleteMenuItem,
        upsertCategory,
        deleteCategory,
        showToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside AppProvider");
  return ctx;
}
