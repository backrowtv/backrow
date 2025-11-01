/**
 * Test Resources for BackRow Development
 * 
 * This file contains default test data to use when testing features that require
 * movie data, actors, directors, composers, etc.
 * 
 * All TMDB IDs are real and can be used for testing with the TMDB API.
 */

export const TEST_MOVIES = [
  {
    id: 550, // Fight Club
    title: 'Fight Club',
    release_date: '1999-10-15',
    tmdb_id: 550,
    poster_path: '/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg',
    overview: 'A ticking-time-bomb insomniac and a slippery soap salesman channel primal male aggression into a shocking new form of therapy.',
    director: 'David Fincher',
    director_id: 7467,
    actors: [
      { id: 819, name: 'Edward Norton' },
      { id: 287, name: 'Brad Pitt' },
      { id: 1283, name: 'Helena Bonham Carter' },
    ],
    composers: [
      { id: 1228898, name: 'The Dust Brothers' },
    ],
    genres: ['Drama', 'Thriller'],
    runtime: 139,
  },
  {
    id: 13, // Forrest Gump
    title: 'Forrest Gump',
    release_date: '1994-07-06',
    tmdb_id: 13,
    poster_path: '/arw2vcBvePOVzgyfUnY5lXxM6mC.jpg',
    overview: 'A man with a low IQ has accomplished great things in his life and been present during significant historic events.',
    director: 'Robert Zemeckis',
    director_id: 24,
    actors: [
      { id: 31, name: 'Tom Hanks' },
      { id: 192, name: 'Robin Wright' },
      { id: 13548, name: 'Gary Sinise' },
    ],
    composers: [
      { id: 1228898, name: 'Alan Silvestri' },
    ],
    genres: ['Drama', 'Romance', 'Comedy'],
    runtime: 142,
  },
  {
    id: 278, // The Shawshank Redemption
    title: 'The Shawshank Redemption',
    release_date: '1994-09-23',
    tmdb_id: 278,
    poster_path: '/q6y0Go1tsGEsmtFryDOJo3dEmqu.jpg',
    overview: 'Framed in the 1940s for the double murder of his wife and her lover, upstanding banker Andy Dufresne begins a new life at the Shawshank prison.',
    director: 'Frank Darabont',
    director_id: 1884,
    actors: [
      { id: 192, name: 'Morgan Freeman' },
      { id: 13548, name: 'Tim Robbins' },
      { id: 13549, name: 'Bob Gunton' },
    ],
    composers: [
      { id: 1228900, name: 'Thomas Newman' },
    ],
    genres: ['Drama', 'Crime'],
    runtime: 142,
  },
  {
    id: 238, // The Godfather
    title: 'The Godfather',
    release_date: '1972-03-24',
    tmdb_id: 238,
    poster_path: '/3bhkrj58Vtu7enYsRolD1fZdja1.jpg',
    overview: 'Spanning the years 1945 to 1955, a chronicle of the fictional Italian-American Corleone crime family.',
    director: 'Francis Ford Coppola',
    director_id: 1776,
    actors: [
      { id: 3084, name: 'Marlon Brando' },
      { id: 1158, name: 'Al Pacino' },
      { id: 3085, name: 'James Caan' },
    ],
    composers: [
      { id: 1228898, name: 'Nino Rota' },
    ],
    genres: ['Drama', 'Crime'],
    runtime: 175,
  },
  {
    id: 424, // Schindler's List
    title: 'Schindler\'s List',
    release_date: '1993-12-15',
    tmdb_id: 424,
    poster_path: '/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg',
    overview: 'The true story of how businessman Oskar Schindler saved over a thousand Jewish lives from the Nazis.',
    director: 'Steven Spielberg',
    director_id: 488,
    actors: [
      { id: 1158, name: 'Liam Neeson' },
      { id: 192, name: 'Ralph Fiennes' },
      { id: 13550, name: 'Ben Kingsley' },
    ],
    composers: [
      { id: 1228898, name: 'John Williams' },
    ],
    genres: ['Drama', 'History', 'War'],
    runtime: 195,
  },
  {
    id: 680, // Pulp Fiction
    title: 'Pulp Fiction',
    release_date: '1994-10-14',
    tmdb_id: 680,
    poster_path: '/d5iIlFn5s0ImszYzBPb8JPIfbXD.jpg',
    overview: 'The lives of two mob hitmen, a boxer, a gangster and his wife, and a pair of diner bandits intertwine.',
    director: 'Quentin Tarantino',
    director_id: 138,
    actors: [
      { id: 62, name: 'John Travolta' },
      { id: 192, name: 'Samuel L. Jackson' },
      { id: 13551, name: 'Uma Thurman' },
    ],
    composers: [
      { id: 1228903, name: 'Various Artists' },
    ],
    genres: ['Crime', 'Drama', 'Thriller'],
    runtime: 154,
  },
] as const

export const TEST_DIRECTORS = [
  { id: 7467, name: 'David Fincher', tmdb_id: 7467 },
  { id: 24, name: 'Robert Zemeckis', tmdb_id: 24 },
  { id: 488, name: 'Steven Spielberg', tmdb_id: 488 },
  { id: 138, name: 'Quentin Tarantino', tmdb_id: 138 },
  { id: 1776, name: 'Francis Ford Coppola', tmdb_id: 1776 },
  { id: 1884, name: 'Frank Darabont', tmdb_id: 1884 },
  { id: 1032, name: 'Christopher Nolan', tmdb_id: 1032 },
  { id: 2710, name: 'Martin Scorsese', tmdb_id: 2710 },
] as const

export const TEST_ACTORS = [
  { id: 31, name: 'Tom Hanks', tmdb_id: 31 },
  { id: 287, name: 'Brad Pitt', tmdb_id: 287 },
  { id: 819, name: 'Edward Norton', tmdb_id: 819 },
  { id: 1158, name: 'Al Pacino', tmdb_id: 1158 },
  { id: 192, name: 'Morgan Freeman', tmdb_id: 192 },
  { id: 62, name: 'John Travolta', tmdb_id: 62 },
  { id: 1283, name: 'Helena Bonham Carter', tmdb_id: 1283 },
  { id: 13548, name: 'Gary Sinise', tmdb_id: 13548 },
] as const

export const TEST_COMPOSERS = [
  { id: 1, name: 'John Williams', tmdb_id: 1228898 },
  { id: 2, name: 'Hans Zimmer', tmdb_id: 1228899 },
  { id: 3, name: 'Thomas Newman', tmdb_id: 1228900 },
  { id: 4, name: 'Alan Silvestri', tmdb_id: 1228901 },
  { id: 5, name: 'The Dust Brothers', tmdb_id: 1228902 },
] as const

export const TEST_GENRES = [
  'Drama',
  'Comedy',
  'Action',
  'Thriller',
  'Horror',
  'Romance',
  'Sci-Fi',
  'Fantasy',
  'Crime',
  'Mystery',
  'Adventure',
  'Animation',
  'Documentary',
  'War',
  'Western',
] as const

export const TEST_THEMES = [
  'Coming of Age',
  'Revenge',
  'Redemption',
  'Love Conquers All',
  'Man vs. Nature',
  'The American Dream',
  'War and Peace',
  'Good vs. Evil',
  'Time Travel',
  'Artificial Intelligence',
  'Family Drama',
  'Crime and Punishment',
  'Survival',
  'Identity Crisis',
  'Social Commentary',
] as const

export const TEST_CLUB_NAMES = [
  'Test Movie Club',
  'Cinema Enthusiasts',
  'Film Buffs United',
  'The Movie Collective',
  'Cinephile Society',
] as const

export const TEST_FESTIVAL_THEMES = [
  '90s Classics',
  'Psychological Thrillers',
  'Oscar Winners',
  'Directorial Debuts',
  'Sci-Fi Masterpieces',
  'Film Noir',
  'Coming of Age Stories',
  'War Films',
] as const

// Default placeholder images (using placeholder.com or similar)
export const PLACEHOLDER_IMAGES = {
  movie_poster: 'https://via.placeholder.com/300x450/1a1a1a/ffffff?text=Movie+Poster',
  avatar: 'https://via.placeholder.com/150/1a1a1a/ffffff?text=Avatar',
  club_picture: 'https://via.placeholder.com/800x400/1a1a1a/ffffff?text=Club+Picture',
  background: 'https://via.placeholder.com/1920x1080/1a1a1a/ffffff?text=Background',
} as const

// Helper function to get a random test movie
export function getRandomTestMovie() {
  return TEST_MOVIES[Math.floor(Math.random() * TEST_MOVIES.length)]
}

// Helper function to get a random test director
export function getRandomTestDirector() {
  return TEST_DIRECTORS[Math.floor(Math.random() * TEST_DIRECTORS.length)]
}

// Helper function to get a random test actor
export function getRandomTestActor() {
  return TEST_ACTORS[Math.floor(Math.random() * TEST_ACTORS.length)]
}

// Helper function to get a random test theme
export function getRandomTestTheme() {
  return TEST_THEMES[Math.floor(Math.random() * TEST_THEMES.length)]
}

