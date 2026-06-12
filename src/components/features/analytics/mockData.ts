export const ANALYTICS_MOCK_DATA = {
  summary: [
    { id: 'followers', title: 'Total Followers', value: '12,450', change: '+5.2%', isPositive: true, icon: 'Users' },
    { id: 'reach', title: 'Total Reach', value: '142,390', change: '+18.4%', isPositive: true, icon: 'Globe' },
    { id: 'engagement', title: 'Engagement Rate', value: '9.4%', change: '+2.1%', isPositive: true, icon: 'Zap' },
    { id: 'learning', title: 'Learning Activity', value: '420 Hours', change: '+12.5%', isPositive: true, icon: 'BookOpen' },
    { id: 'participation', title: 'Community Activity', value: '1,580 Interactions', change: '+8.1%', isPositive: true, icon: 'MessageSquare' },
  ],
  growth: [
    { name: 'Mon', reach: 800, learning: 310, engagement: 220 },
    { name: 'Tue', reach: 1200, learning: 480, engagement: 310 },
    { name: 'Wed', reach: 980, learning: 410, engagement: 290 },
    { name: 'Thu', reach: 1600, learning: 640, engagement: 450 },
    { name: 'Fri', reach: 2200, learning: 790, engagement: 610 },
    { name: 'Sat', reach: 2400, learning: 840, engagement: 680 },
    { name: 'Sun', reach: 2100, learning: 720, engagement: 590 },
  ],
  topContent: [
    { id: 1, title: 'Modular Architecture: Scaling SaaS Microservices with WebRTC', views: '14K', likes: '1.4K', comments: 120, thumbnail: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=300&h=300&fit=crop' },
    { id: 2, title: '5 Critical CSS Grids Mistakes and Interactive Solutions', views: '9.8K', likes: '910', comments: 84, thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=300&fit=crop' },
    { id: 3, title: 'The Next-Gen User Experience Roadmap: Zero Latency Systems', views: '8.4K', likes: '840', comments: 72, thumbnail: 'https://images.unsplash.com/photo-1518005020250-6759247f3cae?w=300&h=300&fit=crop' },
    { id: 4, title: 'Server-Authoritative State Synchronization Playbook', views: '6.5K', likes: '580', comments: 46, thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=300&fit=crop' },
    { id: 5, title: 'Compiling WebAssembly at Runtime: High-Performance Web Canvas', views: '5.2K', likes: '620', comments: 40, thumbnail: 'https://images.unsplash.com/photo-1509391366360-fe5bb584852a?w=300&h=300&fit=crop' },
  ],
  audience: {
    countries: [
      { name: 'United States', percentage: 38 },
      { name: 'United Kingdom', percentage: 22 },
      { name: 'Germany', percentage: 14 },
      { name: 'India', percentage: 12 },
      { name: 'Others', percentage: 14 },
    ],
    age: [
      { range: '18-24', percentage: 30 },
      { range: '25-34', percentage: 50 },
      { range: '35-44', percentage: 15 },
      { range: '45+', percentage: 5 },
    ],
    gender: [
      { name: 'Male', value: 52 },
      { name: 'Female', value: 45 },
      { name: 'Others', value: 3 },
    ],
  },
};
