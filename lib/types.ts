// ─── All money stored as INTEGER PAISE (1 ₹ = 100 paise) ─────────────────────

export type BusinessType =
  | "cafe"
  | "restaurant"
  | "food_truck"
  | "kiosk"
  | "bakery"
  | "franchise";

export interface BusinessProfile {
  name: string;
  ownerName: string;
  phone: string;
  city: string;
  businessType: BusinessType;
  gstNumber?: string;
  gstPercent: number;
  currencySymbol: string;
  createdAt: string;
}

export interface AddOn {
  id: string;
  name: string;
  pricePaise: number;
}

export interface ItemSize {
  label: string;
  pricePaise: number;
}

export interface ItemPortion {
  label: string;
  pricePaise: number;
}

export interface MenuItem {
  id: string;
  name: string;
  categoryId: string;
  pricePaise: number;
  isVeg: boolean;
  isAvailable: boolean;
  addOns: AddOn[];
  instructions?: string;
  sizes?: ItemSize[];
  portions?: ItemPortion[];
  fastAdd?: boolean;
  isCombo?: boolean;
  weightBased?: boolean;
  priceEditable?: boolean;
}

export interface MenuCategory {
  id: string;
  name: string;
  sortOrder: number;
}

export interface CartItem {
  cartId: string;
  menuItemId: string;
  name: string;
  unitPricePaise: number;
  qty: number;
  selectedSize?: string;
  selectedPortion?: string;
  selectedAddOns: AddOn[];
  notes?: string;
}

export type PaymentMethod = "cash" | "upi" | "card";

export interface Order {
  id: string;
  billNumber: string;
  items: CartItem[];
  subtotalPaise: number;
  discountPaise: number;
  discountType: "flat" | "percent";
  discountValue: number;
  gstPercent: number;
  gstPaise: number;
  totalPaise: number;
  paymentMethod: PaymentMethod;
  cashReceivedPaise?: number;
  changePaise?: number;
  createdAt: string;
  syncStatus: "pending" | "synced" | "failed";
}
