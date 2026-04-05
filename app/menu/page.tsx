"use client";

import { useState } from "react";
import { useApp } from "@/lib/store/AppContext";
import AppShell from "@/components/ui/AppShell";
import Modal from "@/components/ui/Modal";
import type { MenuItem, MenuCategory, AddOn, BusinessType } from "@/lib/types";
import { fmtRupee } from "@/lib/utils";
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, FolderPlus } from "lucide-react";

export default function MenuPage() {
  const { state, upsertMenuItem, deleteMenuItem, upsertCategory, deleteCategory, showToast } = useApp();
  const { menuItems, categories, business } = state;

  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set(categories.map((c) => c.id)));
  const [editItem, setEditItem] = useState<Partial<MenuItem> | null>(null);
  const [editCat, setEditCat] = useState<Partial<MenuCategory> | null>(null);

  const toggleCat = (id: string) =>
    setExpandedCats((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });

  const openNewItem = (categoryId: string) =>
    setEditItem({ categoryId, isVeg: true, isAvailable: true, addOns: [], pricePaise: 0 });

  const openNewCat = () =>
    setEditCat({ name: "", sortOrder: categories.length });

  const handleDeleteItem = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    await deleteMenuItem(id);
    showToast("Item deleted");
  };

  const handleDeleteCat = async (id: string) => {
    if (!confirm("Delete this category and all its items?")) return;
    const catItems = menuItems.filter((i) => i.categoryId === id);
    for (const item of catItems) await deleteMenuItem(item.id);
    await deleteCategory(id);
    showToast("Category deleted");
  };

  const handleSaveItem = async (item: MenuItem) => {
    await upsertMenuItem(item);
    showToast(editItem?.id ? "Item updated ✓" : "Item added ✓");
    setEditItem(null);
  };

  const handleSaveCat = async (cat: MenuCategory) => {
    await upsertCategory(cat);
    showToast(editCat?.id ? "Category updated ✓" : "Category added ✓");
    setEditCat(null);
  };

  return (
    <AppShell>
      <div className="flex flex-col min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white px-4 pt-12 pb-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-black text-gray-900">Menu Editor</h1>
          <div className="flex gap-2">
            <button
              onClick={openNewCat}
              className="flex items-center gap-1 text-sm font-bold text-gray-600 border border-gray-200 px-3 py-1.5 rounded-xl press"
            >
              <FolderPlus size={15} /> Category
            </button>
            <button
              onClick={() => openNewItem(categories[0]?.id ?? "")}
              className="flex items-center gap-1 text-sm font-bold text-white bg-primary-500 px-3 py-1.5 rounded-xl press shadow-sm"
            >
              <Plus size={15} /> Item
            </button>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-3">
        {categories.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-300">
            <span className="text-5xl mb-3">🍽️</span>
            <p className="font-semibold">No menu yet</p>
            <p className="text-sm mt-1">Add a category to get started</p>
          </div>
        ) : (
          categories.map((cat) => {
            const items = menuItems.filter((i) => i.categoryId === cat.id);
            const open = expandedCats.has(cat.id);
            return (
              <div key={cat.id} className="bg-white rounded-2xl shadow-sm overflow-hidden">
                {/* Category row */}
                <div className="flex items-center px-4 py-3">
                  <button onClick={() => toggleCat(cat.id)} className="flex items-center gap-2 flex-1 min-w-0 press">
                    {open ? <ChevronDown size={16} className="text-gray-400 shrink-0" /> : <ChevronRight size={16} className="text-gray-400 shrink-0" />}
                    <span className="font-bold text-gray-900 truncate">{cat.name}</span>
                    <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full shrink-0">{items.length}</span>
                  </button>
                  <div className="flex items-center gap-2 ml-2 shrink-0">
                    <button onClick={() => setEditCat(cat)} className="text-gray-400 hover:text-gray-600 press p-1"><Pencil size={14} /></button>
                    <button onClick={() => handleDeleteCat(cat.id)} className="text-red-400 hover:text-red-500 press p-1"><Trash2 size={14} /></button>
                    <button
                      onClick={() => openNewItem(cat.id)}
                      className="w-7 h-7 rounded-lg bg-primary-500 flex items-center justify-center press shadow-sm ml-1"
                    >
                      <Plus size={14} className="text-white" />
                    </button>
                  </div>
                </div>

                {/* Items */}
                {open && (
                  <div className="border-t border-gray-50">
                    {items.length === 0 ? (
                      <p className="text-sm text-gray-400 text-center py-4">
                        No items — tap <strong>+</strong> to add
                      </p>
                    ) : (
                      items.map((item) => (
                        <div key={item.id} className="flex items-center px-4 py-3 border-b border-gray-50 last:border-0 gap-3">
                          <span className={`w-3 h-3 rounded-sm border-2 shrink-0 flex items-center justify-center ${item.isVeg ? "border-green-600" : "border-red-500"}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.isVeg ? "bg-green-600" : "bg-red-500"}`} />
                          </span>
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-bold truncate ${!item.isAvailable ? "text-gray-400 line-through" : "text-gray-900"}`}>
                              {item.name}
                            </p>
                            <p className="text-xs text-gray-500">{fmtRupee(item.pricePaise)}</p>
                          </div>
                          <button onClick={() => setEditItem(item)} className="text-gray-400 hover:text-gray-600 press p-1"><Pencil size={14} /></button>
                          <button onClick={() => handleDeleteItem(item.id)} className="text-red-400 hover:text-red-500 press p-1"><Trash2 size={14} /></button>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Modals */}
      <ItemEditModal
        key={editItem ? (editItem.id ?? "new") : "closed"}
        item={editItem}
        categories={categories}
        businessType={business?.businessType}
        onClose={() => setEditItem(null)}
        onSave={handleSaveItem}
      />

      <CatEditModal
        key={editCat ? (editCat.id ?? "newcat") : "closedcat"}
        cat={editCat}
        onClose={() => setEditCat(null)}
        onSave={handleSaveCat}
      />
      </div>
    </AppShell>
  );
}

// ─── Item Edit Modal ──────────────────────────────────────────────────────────
// Uses `key` prop on parent call to fully reset state when opening different items

interface ItemEditModalProps {
  item: Partial<MenuItem> | null;
  categories: MenuCategory[];
  businessType?: BusinessType;
  onClose: () => void;
  onSave: (item: MenuItem) => void;
}

function ItemEditModal({ item, categories, businessType, onClose, onSave }: ItemEditModalProps) {
  // All hooks at top — no conditional hooks
  const [name, setName] = useState(item?.name ?? "");
  const [catId, setCatId] = useState(item?.categoryId ?? categories[0]?.id ?? "");
  const [priceRupee, setPriceRupee] = useState(item?.pricePaise ? (item.pricePaise / 100).toString() : "");
  const [isVeg, setIsVeg] = useState(item?.isVeg ?? true);
  const [isAvailable, setIsAvailable] = useState(item?.isAvailable ?? true);
  const [fastAdd, setFastAdd] = useState(item?.fastAdd ?? false);
  const [weightBased, setWeightBased] = useState(item?.weightBased ?? false);
  const [addOns, setAddOns] = useState<AddOn[]>(item?.addOns ?? []);
  const [aoName, setAoName] = useState("");
  const [aoPrice, setAoPrice] = useState("");

  const isNew = !item?.id;

  const addAddOn = () => {
    if (!aoName.trim()) return;
    setAddOns((prev) => [
      ...prev,
      { id: crypto.randomUUID(), name: aoName.trim(), pricePaise: Math.round(Number(aoPrice) * 100) || 0 },
    ]);
    setAoName("");
    setAoPrice("");
  };

  const removeAddOn = (id: string) => setAddOns((prev) => prev.filter((a) => a.id !== id));

  const handleSave = () => {
    if (!name.trim() || !catId) return;
    onSave({
      id: item?.id ?? crypto.randomUUID(),
      name: name.trim(),
      categoryId: catId,
      pricePaise: Math.round(Number(priceRupee) * 100) || 0,
      isVeg,
      isAvailable,
      fastAdd,
      weightBased,
      addOns,
      sizes: item?.sizes,
      portions: item?.portions,
      isCombo: item?.isCombo,
      priceEditable: item?.priceEditable,
    });
  };

  return (
    <Modal open={!!item} onClose={onClose} title={isNew ? "Add Item" : "Edit Item"} fullScreen>
      <div className="px-5 pb-10 pt-2 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Item Name *</label>
          <input className="bm-input" placeholder="e.g. Masala Chai" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Category *</label>
          <select className="bm-input" value={catId} onChange={(e) => setCatId(e.target.value)}>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        {/* Price */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Base Price (₹)</label>
          <input
            type="number"
            className="bm-input"
            placeholder="0"
            value={priceRupee}
            onChange={(e) => setPriceRupee(e.target.value)}
          />
        </div>

        {/* Veg / Non-veg */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Type</label>
          <div className="flex gap-2">
            <button
              onClick={() => setIsVeg(true)}
              className={`flex-1 h-11 rounded-xl border-2 font-bold text-sm press transition-all ${isVeg ? "border-green-500 bg-green-50 text-green-700" : "border-gray-200 text-gray-500"}`}
            >
              🟢 Veg
            </button>
            <button
              onClick={() => setIsVeg(false)}
              className={`flex-1 h-11 rounded-xl border-2 font-bold text-sm press transition-all ${!isVeg ? "border-red-500 bg-red-50 text-red-600" : "border-gray-200 text-gray-500"}`}
            >
              🔴 Non-Veg
            </button>
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <Toggle label="Available" value={isAvailable} onChange={setIsAvailable} />
          {(businessType === "food_truck" || businessType === "kiosk") && (
            <Toggle label="Fast Add (skip modal)" value={fastAdd} onChange={setFastAdd} />
          )}
          {businessType === "bakery" && (
            <Toggle label="Weight-based pricing" value={weightBased} onChange={setWeightBased} />
          )}
        </div>

        {/* Add-ons */}
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-2">Add-ons</label>
          <div className="space-y-2 mb-2">
            {addOns.map((ao) => (
              <div key={ao.id} className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2">
                <span className="flex-1 text-sm font-semibold text-gray-800">{ao.name}</span>
                {ao.pricePaise > 0 && <span className="text-xs text-gray-400">+{fmtRupee(ao.pricePaise)}</span>}
                <button onClick={() => removeAddOn(ao.id)} className="text-red-400 press"><Trash2 size={13} /></button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input className="bm-input flex-1" placeholder="Add-on name" value={aoName} onChange={(e) => setAoName(e.target.value)} />
            <input type="number" className="bm-input w-20" placeholder="₹" value={aoPrice} onChange={(e) => setAoPrice(e.target.value)} />
            <button onClick={addAddOn} className="px-3 rounded-xl bg-primary-500 text-white font-bold press shadow-sm">
              <Plus size={16} />
            </button>
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={!name.trim() || !catId}
          className="w-full h-12 bg-primary-500 text-white rounded-2xl font-bold disabled:opacity-40 press shadow-md mt-2"
        >
          {isNew ? "Add Item" : "Save Changes"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Category Edit Modal ──────────────────────────────────────────────────────

function CatEditModal({
  cat,
  onClose,
  onSave,
}: {
  cat: Partial<MenuCategory> | null;
  onClose: () => void;
  onSave: (c: MenuCategory) => void;
}) {
  const [name, setName] = useState(cat?.name ?? "");
  const isNew = !cat?.id;

  return (
    <Modal open={!!cat} onClose={onClose} title={isNew ? "Add Category" : "Edit Category"}>
      <div className="px-5 pb-6 pt-2 space-y-4">
        <div>
          <label className="block text-xs font-bold text-gray-500 mb-1.5">Category Name</label>
          <input
            className="bm-input"
            placeholder="e.g. Main Course"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
        </div>
        <button
          onClick={() => onSave({ id: cat?.id ?? crypto.randomUUID(), name: name.trim(), sortOrder: cat?.sortOrder ?? 0 })}
          disabled={!name.trim()}
          className="w-full h-12 bg-primary-500 text-white rounded-2xl font-bold disabled:opacity-40 press shadow-md"
        >
          {isNew ? "Add Category" : "Save"}
        </button>
      </div>
    </Modal>
  );
}

// ─── Toggle helper ────────────────────────────────────────────────────────────

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-semibold text-gray-700">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-11 h-6 rounded-full relative transition-colors press ${value ? "bg-primary-500" : "bg-gray-200"}`}
      >
        <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${value ? "left-6" : "left-1"}`} />
      </button>
    </div>
  );
}
