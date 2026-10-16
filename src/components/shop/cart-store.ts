"use client";

import { useSyncExternalStore } from "react";

/*
 * The shop's cart, kept in the browser (localStorage) so it survives a reload or a closed tab.
 * Prices shown here are a reminder only: the server prices the order again at checkout.
 */

export type CartItem = {
  variantId: string;
  slug: string;
  name: string;
  size: string;
  price: number;
  image: string | null;
  quantity: number;
};

const KEY = "psgz-cart";
const MAX_QUANTITY = 10;
const listeners = new Set<() => void>();
let cache: CartItem[] | null = null;
const EMPTY: CartItem[] = [];

function read(): CartItem[] {
  if (cache) return cache;
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? "[]") as CartItem[];
    cache = Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.variantId === "string" && item.quantity > 0) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: CartItem[]) {
  cache = items;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    // Private mode: the cart lives until the page closes.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changed the cart.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== KEY) return;
    cache = null;
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export const useCart = () => useSyncExternalStore(subscribe, read, () => EMPTY);

export const cart = {
  add(item: Omit<CartItem, "quantity">, quantity = 1) {
    const items = read();
    const existing = items.find((line) => line.variantId === item.variantId);
    write(
      existing
        ? items.map((line) => (line.variantId === item.variantId ? { ...line, quantity: Math.min(MAX_QUANTITY, line.quantity + quantity) } : line))
        : [...items, { ...item, quantity: Math.min(MAX_QUANTITY, quantity) }],
    );
  },
  setQuantity(variantId: string, quantity: number) {
    write(quantity <= 0 ? read().filter((line) => line.variantId !== variantId) : read().map((line) => (line.variantId === variantId ? { ...line, quantity: Math.min(MAX_QUANTITY, quantity) } : line)));
  },
  clear() {
    write([]);
  },
};

export const cartCount = (items: CartItem[]) => items.reduce((sum, item) => sum + item.quantity, 0);
export const cartTotal = (items: CartItem[]) => items.reduce((sum, item) => sum + item.price * item.quantity, 0);
