import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  id: string;
  name: string;
  imageUrl: string | null;
  origin: string;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  pendingNavigation: string | null;
  addToCart: (product: Omit<CartItem, 'quantity'>) => void;
  updateQuantity: (id: string, amount: number) => void;
  removeFromCart: (id: string) => void;
  clearCart: () => void;
  toggleDrawer: () => void;
  setDrawerOpen: (isOpen: boolean) => void;
  setPendingNavigation: (tab: string | null) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      isDrawerOpen: false,
      pendingNavigation: null,

      addToCart: (product) =>
        set((state) => {
          const existingItem = state.items.find((item) => item.id === product.id);
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.id === product.id
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
              isDrawerOpen: true, // auto open on add
            };
          }
          return {
            items: [...state.items, { ...product, quantity: 1 }],
            isDrawerOpen: true, // auto open on add
          };
        }),

      updateQuantity: (id, amount) =>
        set((state) => {
          const updatedItems = state.items.map((item) => {
            if (item.id === id) {
              return { ...item, quantity: item.quantity + amount };
            }
            return item;
          }).filter((item) => item.quantity > 0);
          return { items: updatedItems };
        }),

      removeFromCart: (id) =>
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        })),

      clearCart: () => set({ items: [] }),

      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
      setDrawerOpen: (isOpen) => set({ isDrawerOpen: isOpen }),
      setPendingNavigation: (tab) => set({ pendingNavigation: tab }),
    }),
    {
      name: 'shopping-cart-storage',
      // We don't want to persist UI state like isDrawerOpen
      partialize: (state) => ({ items: state.items }),
    }
  )
);
