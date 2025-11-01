/**
 * Test Factory — Movie Data
 *
 * Well-known TMDB movie IDs for test data. No live API calls needed.
 */

export interface TestMovie {
  tmdbId: number;
  title: string;
  year: number;
  posterPath: string;
}

export const TEST_MOVIES: TestMovie[] = [
  { tmdbId: 562, title: "Die Hard", year: 1988, posterPath: "/7Bjd8kfmDSOzpmhySpEhkUyK2oH.jpg" },
  { tmdbId: 679, title: "Aliens", year: 1986, posterPath: "/r1x5JGpyqZU8PYhbs4UcrO1Xb6x.jpg" },
  { tmdbId: 106, title: "Predator", year: 1987, posterPath: "/k3mW4qfJo6SKqe6laRyNGnbB9n5.jpg" },
  {
    tmdbId: 218,
    title: "The Terminator",
    year: 1984,
    posterPath: "/qvktm0BHcnmDpul4Hz01GIazWPr.jpg",
  },
  {
    tmdbId: 105,
    title: "Back to the Future",
    year: 1985,
    posterPath: "/vN5B5WgYscRGcQpVhHl6p9DDTP0.jpg",
  },
  { tmdbId: 603, title: "The Matrix", year: 1999, posterPath: "/p96dm7sCMn4VYAStA6siNz30G1r.jpg" },
  {
    tmdbId: 329,
    title: "Jurassic Park",
    year: 1993,
    posterPath: "/maFjKnJ62hDQ9E66dKqDZgbUy0H.jpg",
  },
  {
    tmdbId: 680,
    title: "Pulp Fiction",
    year: 1994,
    posterPath: "/vQWk5YBFWF4bZaofAbv0tShwBvQ.jpg",
  },
  {
    tmdbId: 278,
    title: "The Shawshank Redemption",
    year: 1994,
    posterPath: "/9cqNxx0GxF0bflZmeSMuL5tnGzr.jpg",
  },
  { tmdbId: 550, title: "Fight Club", year: 1999, posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" },
  { tmdbId: 27205, title: "Inception", year: 2010, posterPath: "/xlaY2zyzMfkhk0HSC5VUwzoZPU1.jpg" },
  {
    tmdbId: 155,
    title: "The Dark Knight",
    year: 2008,
    posterPath: "/qJ2tW6WMUDux911r6m7haRef0WH.jpg",
  },
  { tmdbId: 769, title: "Goodfellas", year: 1990, posterPath: "/9OkCLM73MIU2CrKZbqiT8Ln1wY2.jpg" },
  { tmdbId: 13, title: "Forrest Gump", year: 1994, posterPath: "/saHP97rTPS5eLmrLQEcANmKrsFl.jpg" },
  {
    tmdbId: 238,
    title: "The Godfather",
    year: 1972,
    posterPath: "/3bhkrj58Vtu7enYsRolD1fZdja1.jpg",
  },
  {
    tmdbId: 424,
    title: "Schindler's List",
    year: 1993,
    posterPath: "/sF1U4EUQS8YHUYjNl3pMGNIQyr0.jpg",
  },
  { tmdbId: 11, title: "Star Wars", year: 1977, posterPath: "/6FfCtAuVAW8XJjZ7eWeLibRLWTw.jpg" },
  {
    tmdbId: 120,
    title: "The Lord of the Rings: The Fellowship of the Ring",
    year: 2001,
    posterPath: "/6oom5QYQ2yQTMJIbnvbkBL9cHo6.jpg",
  },
  { tmdbId: 807, title: "Se7en", year: 1995, posterPath: "/191nKfP0ehp3uIvWqgPbFmI4lv9.jpg" },
  { tmdbId: 78, title: "Blade Runner", year: 1982, posterPath: "/63N9uy8nd9j7Eog2axPQ8lbr3Wj.jpg" },
  { tmdbId: 694, title: "The Shining", year: 1980, posterPath: "/uAR0AWqhQL1hQa69UDEbb2rE5Wx.jpg" },
  {
    tmdbId: 857,
    title: "Saving Private Ryan",
    year: 1998,
    posterPath: "/uqx37cS8cpHg8U35f9U5IBlrCV3.jpg",
  },
  { tmdbId: 197, title: "Braveheart", year: 1995, posterPath: "/or1gBugydmjToAEq7OZY0owwFk.jpg" },
  { tmdbId: 348, title: "Alien", year: 1979, posterPath: "/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg" },
  { tmdbId: 568, title: "Apollo 13", year: 1995, posterPath: "/tVeKscCm2fY1xDXZk8PgnZ87h9S.jpg" },
  { tmdbId: 577, title: "Jaws", year: 1975, posterPath: "/whz4bwvqE1OmQHIyqHdZD8jU9CO.jpg" },
  {
    tmdbId: 600,
    title: "Full Metal Jacket",
    year: 1987,
    posterPath: "/kMKyx1k8hWWscYFnPbnxxN4Eqo4.jpg",
  },
  {
    tmdbId: 240,
    title: "The Godfather Part II",
    year: 1974,
    posterPath: "/hek3koDUyRQk7FIhPXsa6mT2Zc3.jpg",
  },
  {
    tmdbId: 122,
    title: "The Lord of the Rings: The Return of the King",
    year: 2003,
    posterPath: "/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg",
  },
];

/**
 * Extended movie pool for large-scale scenarios.
 * ~75 additional well-known movies with real TMDB IDs.
 */
export const EXTENDED_MOVIES: TestMovie[] = [
  // 90s Classics
  { tmdbId: 275, title: "Fargo", year: 1996, posterPath: "/rt7cpEr1FQsn1PmrdFSMYaJSyEH.jpg" },
  { tmdbId: 949, title: "Heat", year: 1995, posterPath: "/umSVjVdbVwtx5ryP1MjTpJsFn2e.jpg" },
  {
    tmdbId: 101,
    title: "Léon: The Professional",
    year: 1994,
    posterPath: "/yI6X2cCM5YPJtxMhUd3dPGqDAhw.jpg",
  },
  {
    tmdbId: 37165,
    title: "The Truman Show",
    year: 1998,
    posterPath: "/vuza0WqY239yBXOadKlGwJsZJFE.jpg",
  },
  {
    tmdbId: 489,
    title: "Good Will Hunting",
    year: 1997,
    posterPath: "/bABCBKYBK7A5G1x0FzmtQHDi3Es.jpg",
  },
  {
    tmdbId: 629,
    title: "The Usual Suspects",
    year: 1995,
    posterPath: "/bUPmtQzrRhzqYySeiMsKin2mRMg.jpg",
  },
  {
    tmdbId: 500,
    title: "Reservoir Dogs",
    year: 1992,
    posterPath: "/xi8Iu6qyTfyZVDVy60IExSMWMXo.jpg",
  },
  {
    tmdbId: 641,
    title: "Requiem for a Dream",
    year: 2000,
    posterPath: "/nOd6vjEmzCT0k4BTDisFMFTXOun.jpg",
  },
  {
    tmdbId: 73,
    title: "American History X",
    year: 1998,
    posterPath: "/euypWkaYFOLgfMgx7UMXaHdU77N.jpg",
  },
  {
    tmdbId: 510,
    title: "One Flew Over the Cuckoo's Nest",
    year: 1975,
    posterPath: "/3jcbDmRFiQ83drXNOvRDeKHxS0C.jpg",
  },
  // 2000s Hits
  {
    tmdbId: 6977,
    title: "No Country for Old Men",
    year: 2007,
    posterPath: "/bj1v6YKF8yHqA489GFfPC04lHsR.jpg",
  },
  {
    tmdbId: 7345,
    title: "There Will Be Blood",
    year: 2007,
    posterPath: "/fa0RDkAlCec0STeMNAhPaF89q6U.jpg",
  },
  { tmdbId: 77, title: "Memento", year: 2000, posterPath: "/yuNs09hvpHVU1cBTCAk9zxsL2oW.jpg" },
  { tmdbId: 550, title: "Fight Club", year: 1999, posterPath: "/pB8BM7pdSp6B6Ih7QZ4DrQ3PmJK.jpg" },
  {
    tmdbId: 14,
    title: "American Beauty",
    year: 1999,
    posterPath: "/or3IEkMD9MqSbFOaFmRWMssMbZD.jpg",
  },
  {
    tmdbId: 745,
    title: "The Sixth Sense",
    year: 1999,
    posterPath: "/4AfSDjjCbaZnpiEFO62MBAdgJNE.jpg",
  },
  { tmdbId: 98, title: "Gladiator", year: 2000, posterPath: "/ty8TGRuvJLPUmAR1H1nRIsgCLYU.jpg" },
  {
    tmdbId: 1124,
    title: "The Prestige",
    year: 2006,
    posterPath: "/tRNlZbgNCNOpLpbPEz5L8G8A0JN.jpg",
  },
  {
    tmdbId: 1422,
    title: "The Departed",
    year: 2006,
    posterPath: "/nT97ifVT2J1yMQmeq20Dqv60GU.jpg",
  },
  {
    tmdbId: 24,
    title: "Kill Bill: Vol. 1",
    year: 2003,
    posterPath: "/v7TaX8kXMXs5yFFGR41guUDNcnB.jpg",
  },
  {
    tmdbId: 16869,
    title: "Inglourious Basterds",
    year: 2009,
    posterPath: "/7sfbEnaARXDDhKm0CZ7D7uc2sbo.jpg",
  },
  {
    tmdbId: 4922,
    title: "The Curious Case of Benjamin Button",
    year: 2008,
    posterPath: "/4O4INOPtWTfHq3dd5vYTPV0TCwa.jpg",
  },
  // 2010s Films
  { tmdbId: 244786, title: "Whiplash", year: 2014, posterPath: "/7fn624j5lj3xTme2SgiLCeuedmO.jpg" },
  { tmdbId: 329865, title: "Arrival", year: 2016, posterPath: "/x2FJsf1ElAgr63Y3PNPtJrcmpoe.jpg" },
  {
    tmdbId: 76341,
    title: "Mad Max: Fury Road",
    year: 2015,
    posterPath: "/8tZYtuWezp8JbcsvHYO0O46tFbo.jpg",
  },
  {
    tmdbId: 281957,
    title: "The Revenant",
    year: 2015,
    posterPath: "/oMGbRAEMjJSF7RFTY2Q2DqkXOEh.jpg",
  },
  {
    tmdbId: 49026,
    title: "The Dark Knight Rises",
    year: 2012,
    posterPath: "/hr0L2aueqlP2BYUblTTjmtn0hw4.jpg",
  },
  {
    tmdbId: 68718,
    title: "Django Unchained",
    year: 2012,
    posterPath: "/7oWY8VDWW7thTzWh3OKYRkWUlD5.jpg",
  },
  {
    tmdbId: 157336,
    title: "Interstellar",
    year: 2014,
    posterPath: "/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg",
  },
  {
    tmdbId: 264660,
    title: "Ex Machina",
    year: 2014,
    posterPath: "/btbRB7BrD887pSaXIRMCnXhPaLG.jpg",
  },
  { tmdbId: 293660, title: "Deadpool", year: 2016, posterPath: "/3E53WEZJqP6aM84D8CckXx4pIHw.jpg" },
  { tmdbId: 348, title: "Alien", year: 1979, posterPath: "/vfrQk5IPloGg1v9Rzbh2Eg3VGyM.jpg" },
  // International Cinema
  { tmdbId: 496243, title: "Parasite", year: 2019, posterPath: "/7IiTTgloJzvGI1TAYymCfbfl3vT.jpg" },
  { tmdbId: 670, title: "Oldboy", year: 2003, posterPath: "/pWDtjs568ZfOTMbURQBYuT4Qxka.jpg" },
  { tmdbId: 194, title: "Amélie", year: 2001, posterPath: "/nSxDo4fOwYEPcTNhVMIRaq5Kbii.jpg" },
  { tmdbId: 598, title: "City of God", year: 2002, posterPath: "/k7eYdWvhYQyRQoU2TB2A2Xu2TIS.jpg" },
  {
    tmdbId: 346,
    title: "Seven Samurai",
    year: 1954,
    posterPath: "/8OKmBV5BUFzmozIC3pColi4rCW.jpg",
  },
  { tmdbId: 423, title: "The Pianist", year: 2002, posterPath: "/2hFvxCEF1XQCzGYSfg61Mn1WjwL.jpg" },
  {
    tmdbId: 11216,
    title: "Cinema Paradiso",
    year: 1988,
    posterPath: "/8SRUfRUi6x4O68n0A8Iu9MxXBmi.jpg",
  },
  {
    tmdbId: 153,
    title: "Lost in Translation",
    year: 2003,
    posterPath: "/wSqAXL1EHVJ3MuDi5VYNMBbIx0G.jpg",
  },
  // Horror
  { tmdbId: 1091, title: "The Thing", year: 1982, posterPath: "/tzGY49kseSE9QAKk47uuDGwnSCu.jpg" },
  { tmdbId: 419430, title: "Get Out", year: 2017, posterPath: "/tFXcEccSQMf3zy7uCiqrmopQ3Ik.jpg" },
  {
    tmdbId: 493922,
    title: "Hereditary",
    year: 2018,
    posterPath: "/p9fmuz2Oj3HtEJOKeVBELbhTEIa.jpg",
  },
  { tmdbId: 539, title: "Psycho", year: 1960, posterPath: "/yz4QVqPx3h1hD1DfqqQkCq3rmxW.jpg" },
  {
    tmdbId: 377,
    title: "A Nightmare on Elm Street",
    year: 1984,
    posterPath: "/wGTpGGRMZmyFCcrY2mFzmTnGODa.jpg",
  },
  { tmdbId: 948, title: "Halloween", year: 1978, posterPath: "/qVpCaBcnjRzGL3nOPHi6Sn3sWEq.jpg" },
  // Comedy
  {
    tmdbId: 115,
    title: "The Big Lebowski",
    year: 1998,
    posterPath: "/fMBJPi1UB3VV9hJLGDPV4PW9UXA.jpg",
  },
  { tmdbId: 8363, title: "Superbad", year: 2007, posterPath: "/ek8e8txUyUwd2BNqj6lFEerJfbq.jpg" },
  { tmdbId: 7130, title: "In Bruges", year: 2008, posterPath: "/wqdaBL9BWFT6fPNBJk0YXALVB89.jpg" },
  {
    tmdbId: 18785,
    title: "The Hangover",
    year: 2009,
    posterPath: "/uluhlXubGu1VxkEI3Aso2MEdwpa.jpg",
  },
  { tmdbId: 109445, title: "Frozen", year: 2013, posterPath: "/kgwjIb2JDHRhNk13lmSNiCnB8Hy.jpg" },
  // Drama
  {
    tmdbId: 389,
    title: "12 Angry Men",
    year: 1957,
    posterPath: "/ow3wq89wM8qd5X7hWKxiRfsFf9C.jpg",
  },
  {
    tmdbId: 497,
    title: "The Green Mile",
    year: 1999,
    posterPath: "/o0lO84GI7iKOMYRMIbKicLCP7Bf.jpg",
  },
  {
    tmdbId: 637,
    title: "Life Is Beautiful",
    year: 1997,
    posterPath: "/74hLDKjD5aGYOotO6esUVaeISa2.jpg",
  },
  { tmdbId: 769, title: "Goodfellas", year: 1990, posterPath: "/9OkCLM73MIU2CrKZbqiT8Ln1wY2.jpg" },
  { tmdbId: 111, title: "Scarface", year: 1983, posterPath: "/iQ5ztdjvteGeboqlMo8u5v2RuHs.jpg" },
  {
    tmdbId: 429,
    title: "The Good, the Bad and the Ugly",
    year: 1966,
    posterPath: "/bX2xnavhMYjWDoZp1VM6VnU1xwe.jpg",
  },
  {
    tmdbId: 207,
    title: "Dead Poets Society",
    year: 1989,
    posterPath: "/ai40gM7SUaGA4hi5hLWFMn9bTn1.jpg",
  },
  {
    tmdbId: 792307,
    title: "Poor Things",
    year: 2023,
    posterPath: "/kCGlIMHnOm8JPXq3rXM6c5wMxcT.jpg",
  },
  // Sci-Fi & Fantasy
  {
    tmdbId: 62,
    title: "2001: A Space Odyssey",
    year: 1968,
    posterPath: "/ve72VxNqjGM69Uky4WTo2bK6rfq.jpg",
  },
  {
    tmdbId: 18,
    title: "The Fifth Element",
    year: 1997,
    posterPath: "/fPtlCO1yQtnoLHOwKtWz7db6RGU.jpg",
  },
  {
    tmdbId: 601,
    title: "E.T. the Extra-Terrestrial",
    year: 1982,
    posterPath: "/an0nD6uq6bLxj4eVeraAtzRJL2r.jpg",
  },
  {
    tmdbId: 1895,
    title: "Star Wars: The Empire Strikes Back",
    year: 1980,
    posterPath: "/nNAeTmF4CtdSgMDplXTDPOpYzsX.jpg",
  },
  {
    tmdbId: 127585,
    title: "X-Men: Days of Future Past",
    year: 2014,
    posterPath: "/tYfijzolzgoMOvSWkMBGkCOOLTf.jpg",
  },
  { tmdbId: 438631, title: "Dune", year: 2021, posterPath: "/d5NXSklXo0qyIYkgV94XAgMIckC.jpg" },
  // Action & Thriller
  {
    tmdbId: 9806,
    title: "The Incredibles",
    year: 2004,
    posterPath: "/2LqaLgk1653QJxYAMF5K3PkTQueUwQ.jpg",
  },
  {
    tmdbId: 585,
    title: "Monsters, Inc.",
    year: 2001,
    posterPath: "/sgheSKxZkttIe8ONsf2sKERqBAm.jpg",
  },
  {
    tmdbId: 274,
    title: "The Silence of the Lambs",
    year: 1991,
    posterPath: "/uS9m8OBk1RVFu1LR7JCEcBKKkBM.jpg",
  },
  { tmdbId: 710, title: "Goldfinger", year: 1964, posterPath: "/vu1biiJRIqHJMFqiFWfJIA7kef5.jpg" },
  { tmdbId: 10681, title: "WALL·E", year: 2008, posterPath: "/hbhFnRzzg6ZDmm8YAmxBnQpQIPh.jpg" },
  { tmdbId: 862, title: "Toy Story", year: 1995, posterPath: "/uXDfjJbdP4ijW5hWSBrPrlKpxab.jpg" },
  {
    tmdbId: 857,
    title: "Saving Private Ryan",
    year: 1998,
    posterPath: "/uqx37cS8cpHg8U35f9U5IBlrCV3.jpg",
  },
  {
    tmdbId: 572154,
    title: "Bullet Train",
    year: 2022,
    posterPath: "/j8szr0pFI8EOQOB2JgSGjlNpEBl.jpg",
  },
  // Classics & Prestige
  { tmdbId: 289, title: "Casablanca", year: 1942, posterPath: "/5K7cOHoay2mZusSLezBOY0Qxh8a.jpg" },
  {
    tmdbId: 185,
    title: "A Clockwork Orange",
    year: 1971,
    posterPath: "/4sHeTAp65WrSSuc05nRBKddhBxO.jpg",
  },
  {
    tmdbId: 627,
    title: "Trainspotting",
    year: 1996,
    posterPath: "/bhY62Dvw4fFUZfQ9kZf9TzyJuOL.jpg",
  },
  { tmdbId: 807, title: "Se7en", year: 1995, posterPath: "/191nKfP0ehp3uIvWqgPbFmI4lv9.jpg" },
  {
    tmdbId: 11036,
    title: "The Notebook",
    year: 2004,
    posterPath: "/rNzQyW4f8B8cQeg7Dgj3n6eT5k9.jpg",
  },
];

/**
 * Get the full combined movie pool (TEST_MOVIES + EXTENDED_MOVIES).
 */
export function getAllMovies(): TestMovie[] {
  // Deduplicate by tmdbId in case of overlaps
  const seen = new Set<number>();
  const all: TestMovie[] = [];
  for (const m of [...TEST_MOVIES, ...EXTENDED_MOVIES]) {
    if (!seen.has(m.tmdbId)) {
      seen.add(m.tmdbId);
      all.push(m);
    }
  }
  return all;
}

/**
 * Get N random unique movies from a pool
 */
export function pickMovies(count: number, pool?: TestMovie[]): TestMovie[] {
  const source = pool || TEST_MOVIES;
  const shuffled = [...source].sort(() => Math.random() - 0.5);
  // Deduplicate by tmdbId
  const seen = new Set<number>();
  const unique = shuffled.filter((m) => {
    if (seen.has(m.tmdbId)) return false;
    seen.add(m.tmdbId);
    return true;
  });
  return unique.slice(0, count);
}
