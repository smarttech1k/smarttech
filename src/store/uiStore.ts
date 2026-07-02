import { create } from 'zustand';
import { clearStoredAuth, getStoredAuth, setStoredAuth, type AuthUser } from '../lib/api';

interface UIState {
  // Auth
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  authToken: string | null;
  currentUser: AuthUser | null;
  setAuthSession: (token: string, user: AuthUser) => void;
  clearAuthSession: () => void;
  
  // Theme
  isDarkMode: boolean;
  toggleTheme: () => void;
  
  // Sidebar (Desktop)
  isSidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (value: boolean) => void;
  
  // Modals
  showAuthModal: boolean;
  setShowAuthModal: (value: boolean) => void;
  
  // Content
  recentPosts: any[];
  addRecentPost: (post: any) => void;

  // Cart
  cart: any[];
  addToCart: (item: any) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;

  // Enrolled Courses
  enrolledCourses: string[];
  enrollInCourses: (courseIds: string[]) => void;
}

export const useUIStore = create<UIState>((set) => ({
  ...(() => {
    const stored = getStoredAuth();
    return {
      isAuthenticated: Boolean(stored.token),
      authToken: stored.token,
      currentUser: stored.user,
    };
  })(),

  // Auth - Default to false as requested for "Auth state (isLoggedIn true/false)"
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  setAuthSession: (token, user) => {
    setStoredAuth(token, user);
    set({ isAuthenticated: true, authToken: token, currentUser: user });
  },
  clearAuthSession: () => {
    clearStoredAuth();
    set({ isAuthenticated: false, authToken: null, currentUser: null });
  },
  
  // Theme - Default to light
  isDarkMode: false,
  toggleTheme: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
  
  // Sidebar
  isSidebarOpen: false,
  toggleSidebar: () => set((state) => ({ isSidebarOpen: !state.isSidebarOpen })),
  setSidebarOpen: (value) => set({ isSidebarOpen: value }),
  
  // Modals
  showAuthModal: false,
  setShowAuthModal: (value) => set({ showAuthModal: value }),

  // Content
  recentPosts: [],
  addRecentPost: (post) => set((state) => ({ 
    recentPosts: [post, ...state.recentPosts] 
  })),

  // Cart
  cart: [],
  addToCart: (item) => set((state) => {
    // Avoid duplicates
    if (state.cart.some(i => i.id === item.id)) {
      return {};
    }
    return { cart: [...state.cart, item] };
  }),
  removeFromCart: (itemId) => set((state) => ({
    cart: state.cart.filter(i => i.id !== itemId)
  })),
  clearCart: () => set({ cart: [] }),

  // Enrolled Courses (unlocked on checkout)
  enrolledCourses: [],
  enrollInCourses: (courseIds) => set((state) => ({
    enrolledCourses: Array.from(new Set([...state.enrolledCourses, ...courseIds]))
  })),
}));
