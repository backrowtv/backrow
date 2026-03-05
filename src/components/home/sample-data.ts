// Sample data for home page widgets
// Separated to allow import in both server and client components

export interface NewsItem {
  id: string
  title: string
  source: string
  date: string
  url: string
  category: 'awards' | 'festival' | 'industry'
}

export interface BlogPost {
  id: string
  title: string
  excerpt: string
  author: string
  date: string
  readTime: string
  slug: string
  coverImage?: string
  category: string
}

// Static news data (can be replaced with API later)
export const SAMPLE_FILM_NEWS: NewsItem[] = [
  {
    id: '1',
    title: 'Oscar nominations announced with surprising snubs and history-making nods',
    source: 'Variety',
    date: '2d ago',
    url: 'https://variety.com',
    category: 'awards',
  },
  {
    id: '2',
    title: 'Sundance Film Festival announces 2025 lineup with 83 feature films',
    source: 'IndieWire',
    date: '3d ago',
    url: 'https://indiewire.com',
    category: 'festival',
  },
  {
    id: '3',
    title: 'SAG Awards predictions: Who will take home the top honors?',
    source: 'The Hollywood Reporter',
    date: '4d ago',
    url: 'https://hollywoodreporter.com',
    category: 'awards',
  },
  {
    id: '4',
    title: 'Golden Globes sees big wins for emerging filmmakers',
    source: 'Deadline',
    date: '1w ago',
    url: 'https://deadline.com',
    category: 'awards',
  },
]

// Sample blog data (can be replaced with CMS data later)
export const SAMPLE_BLOG_POSTS: BlogPost[] = [
  {
    id: '1',
    title: 'How to Run the Perfect Movie Night: Tips from Film Club Veterans',
    excerpt: 'After hosting hundreds of film screenings, here are the secrets to creating memorable movie nights your friends will love.',
    author: 'BackRow Team',
    date: 'Dec 15',
    readTime: '5 min read',
    slug: 'perfect-movie-night',
    coverImage: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=600&q=80',
    category: 'Tips',
  },
  {
    id: '2',
    title: '2024 in Review: The Films That Defined the Year',
    excerpt: 'A look back at the standout films that shaped cinema in 2024.',
    author: 'BackRow Team',
    date: 'Dec 10',
    readTime: '8 min read',
    slug: '2024-year-in-review',
    coverImage: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600&q=80',
    category: 'Year in Review',
  },
  {
    id: '3',
    title: 'Festival Mode Guide: Choosing the Right Format for Your Club',
    excerpt: 'Understanding the different festival modes and when to use them.',
    author: 'BackRow Team',
    date: 'Dec 5',
    readTime: '4 min read',
    slug: 'festival-mode-guide',
    coverImage: 'https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=600&q=80',
    category: 'Guide',
  },
  {
    id: '4',
    title: 'Building Your Film Literacy: Where to Start',
    excerpt: 'Essential viewing lists for expanding your cinematic knowledge.',
    author: 'BackRow Team',
    date: 'Nov 28',
    readTime: '6 min read',
    slug: 'film-literacy-guide',
    coverImage: 'https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=600&q=80',
    category: 'Education',
  },
]

