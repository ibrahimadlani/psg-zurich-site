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
  /** Pieces left when it was added: the bag never asks for more (checked again at checkout). */
  max?: number;
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
/** The bag right now (outside React's render, e.g. in an effect). */
export const readCart = () => read();

export const cart = {
  add(item: Omit<CartItem, "quantity">, quantity = 1) {
    const items = read();
    const existing = items.find((line) => line.variantId === item.variantId);
    const cap = Math.min(MAX_QUANTITY, item.max ?? MAX_QUANTITY);
    write(
      existing
        ? items.map((line) => (line.variantId === item.variantId ? { ...line, max: item.max, quantity: Math.min(cap, line.quantity + quantity) } : line))
        : [...items, { ...item, quantity: Math.min(cap, quantity) }],
    );
  },
  setQuantity(variantId: string, quantity: number) {
    write(
      quantity <= 0
        ? read().filter((line) => line.variantId !== variantId)
        : read().map((line) => (line.variantId === variantId ? { ...line, quantity: Math.min(MAX_QUANTITY, line.max ?? MAX_QUANTITY, quantity) } : line)),
    );
  },
  clear() {
    write([]);
  },
  /** Lines corrected after the shop was asked (sold out, fewer left, new price). */
  replace(items: CartItem[]) {
    write(items.filter((item) => item.quantity > 0));
  },
};

/** Opens the bag from anywhere (the line just added is highlighted). */
export const OPEN_CART_EVENT = "psgz:open-cart";
export const openCart = (highlight?: string) => window.dispatchEvent(new CustomEvent(OPEN_CART_EVENT, { detail: highlight ?? null }));

export const cartCount = (items: CartItem[]) => items.reduce((sum, item) => sum + item.quantity, 0);
export const cartTotal = (items: CartItem[]) => items.reduce((sum, item) => sum + item.price * item.quantity, 0);
