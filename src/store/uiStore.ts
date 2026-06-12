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
  
  // Content
  recentPosts: any[];
  addRecentPost: (post: any) => void;
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

  // Content
  recentPosts: [],
  addRecentPost: (post) => set((state) => ({ 
    recentPosts: [post, ...state.recentPosts] 
  })),
}));
