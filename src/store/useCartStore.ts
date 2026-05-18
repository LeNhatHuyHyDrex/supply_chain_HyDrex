import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  templateId: string;
  name: string;
  imageUrl: string | null;
  origin: string;
  price: number;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  isDrawerOpen: boolean;
  addToCart: (product: Omit<CartItem, 'quantity'>) => void;
  updateQuantity: (templateId: string, amount: number) => void;
  removeFromCart: (templateId: string) => void;
  clearCart: () => void;
  toggleDrawer: () => void;
  setDrawerOpen: (isOpen: boolean) => void;
  totalAmount: () => number;
  totalItems: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isDrawerOpen: false,

      addToCart: (product) =>
        set((state) => {
          const existingItem = state.items.find((item) => item.templateId === product.templateId);
          if (existingItem) {
            return {
              items: state.items.map((item) =>
                item.templateId === product.templateId
                  ? { ...item, quantity: item.quantity + 1 }
                  : item
              ),
              isDrawerOpen: true,
            };
          }
          return {
            items: [...state.items, { ...product, quantity: 1 }],
            isDrawerOpen: true,
          };
        }),

      updateQuantity: (templateId, amount) =>
        set((state) => {
          const updatedItems = state.items.map((item) => {
            if (item.templateId === templateId) {
              return { ...item, quantity: item.quantity + amount };
            }
            return item;
          }).filter((item) => item.quantity > 0);
          return { items: updatedItems };
        }),

      removeFromCart: (templateId) =>
        set((state) => ({
          items: state.items.filter((item) => item.templateId !== templateId),
        })),

      clearCart: () => set({ items: [] }),

      toggleDrawer: () => set((state) => ({ isDrawerOpen: !state.isDrawerOpen })),
      setDrawerOpen: (isOpen) => set({ isDrawerOpen: isOpen }),

      totalAmount: () => {
        return get().items.reduce((sum, item) => sum + item.price * item.quantity, 0);
      },

      totalItems: () => {
        return get().items.reduce((sum, item) => sum + item.quantity, 0);
      },
    }),
    {
      name: 'vku-market-cart',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
