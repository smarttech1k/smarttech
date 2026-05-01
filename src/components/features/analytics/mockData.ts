export const ANALYTICS_MOCK_DATA = {
  summary: [
    { id: 'followers', title: 'Total Followers', value: '12,450', change: '+5.2%', isPositive: true, icon: 'Users' },
    { id: 'views', title: 'Total Views', value: '89,300', change: '+12.0%', isPositive: true, icon: 'Eye' },
    { id: 'likes', title: 'Total Likes', value: '24,120', change: '+8.0%', isPositive: true, icon: 'Heart' },
    { id: 'earnings', title: 'Total Earnings', value: '$1,240', change: '+3.0%', isPositive: true, icon: 'DollarSign' },
  ],
  growth: [
    { name: 'Mon', views: 400, followers: 200, revenue: 40 },
    { name: 'Tue', views: 600, followers: 300, revenue: 70 },
    { name: 'Wed', views: 500, followers: 250, revenue: 55 },
    { name: 'Thu', views: 800, followers: 450, revenue: 90 },
    { name: 'Fri', views: 1100, followers: 600, revenue: 120 },
    { name: 'Sat', views: 1300, followers: 750, revenue: 150 },
    { name: 'Sun', views: 1200, followers: 700, revenue: 140 },
  ],
  topContent: [
    { id: 1, title: 'Mastering the Creative Mindset for Success', views: '12K', likes: '1.2K', comments: 84, thumbnail: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?w=300&h=300&fit=crop' },
    { id: 2, title: '5 Secrets to Viral Video Editing Animations', views: '8.4K', likes: '920', comments: 112, thumbnail: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?w=300&h=300&fit=crop' },
    { id: 3, title: 'The Future of UX Design in 2026', views: '7.1K', likes: '840', comments: 65, thumbnail: 'https://images.unsplash.com/photo-1518005020250-6759247f3cae?w=300&h=300&fit=crop' },
    { id: 4, title: 'Creator Monetization: The New Playbook', views: '5.2K', likes: '710', comments: 42, thumbnail: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=300&h=300&fit=crop' },
    { id: 5, title: 'Why Coding is the Essential Modern Skill', views: '4.8K', likes: '650', comments: 38, thumbnail: 'https://images.unsplash.com/photo-1509391366360-fe5bb584852a?w=300&h=300&fit=crop' },
  ],
  audience: {
    countries: [
      { name: 'Nigeria', percentage: 40 },
      { name: 'USA', percentage: 25 },
      { name: 'UK', percentage: 15 },
      { name: 'Germany', percentage: 10 },
      { name: 'Others', percentage: 10 },
    ],
    age: [
      { range: '18-24', percentage: 35 },
      { range: '25-34', percentage: 45 },
      { range: '35-44', percentage: 15 },
      { range: '45+', percentage: 5 },
    ],
    gender: [
      { name: 'Male', value: 55 },
      { name: 'Female', value: 42 },
      { name: 'Others', value: 3 },
    ],
  },
};
