import { create } from 'zustand';

interface UIState {
  // Auth
  isAuthenticated: boolean;
  setAuthenticated: (value: boolean) => void;
  
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

  // Notifications - one count, fed by the single subscription AppLayout owns, read
  // by both the navbar bell and the sidebar item.
  unreadNotifications: number;
  setUnreadNotifications: (value: number) => void;

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
  // Auth - Default to false as requested for "Auth state (isLoggedIn true/false)"
  isAuthenticated: false,
  setAuthenticated: (value) => set({ isAuthenticated: value }),
  
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

  // Notifications
  unreadNotifications: 0,
  setUnreadNotifications: (value) => set({ unreadNotifications: Math.max(0, value) }),

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
