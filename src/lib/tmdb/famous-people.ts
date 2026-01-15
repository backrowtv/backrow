// Curated list of famous directors/filmmakers with their TMDB IDs
// This helps surface them in search results when TMDB's search doesn't
export const FAMOUS_DIRECTORS: { id: number; name: string }[] = [
  { id: 525, name: "Christopher Nolan" },
  { id: 137427, name: "Denis Villeneuve" },
  { id: 488, name: "Steven Spielberg" },
  { id: 1032, name: "Martin Scorsese" },
  { id: 138, name: "Quentin Tarantino" },
  { id: 578, name: "Ridley Scott" },
  { id: 5655, name: "David Fincher" },
  { id: 5174, name: "Guillermo del Toro" },
  { id: 7467, name: "David Lynch" },
  { id: 240, name: "Stanley Kubrick" },
  { id: 1223, name: "James Cameron" },
  { id: 24, name: "Wes Anderson" },
  { id: 108, name: "Peter Jackson" },
  { id: 1884, name: "Greta Gerwig" },
  { id: 68153, name: "Ari Aster" },
  { id: 72129, name: "Jordan Peele" },
  { id: 7623, name: "Sam Raimi" },
  { id: 608, name: "Tim Burton" },
  { id: 6, name: "Michael Mann" },
  { id: 1124, name: "Spike Lee" },
  { id: 3612, name: "Sofia Coppola" },
  { id: 5140, name: "Paul Thomas Anderson" },
  { id: 7879, name: "The Coen Brothers" },
  { id: 1776, name: "Joel Coen" },
  { id: 1777, name: "Ethan Coen" },
  { id: 39, name: "Darren Aronofsky" },
  { id: 17825, name: "Damien Chazelle" },
  { id: 68152, name: "Robert Eggers" },
  { id: 11614, name: "Edgar Wright" },
  { id: 12453, name: "Bong Joon-ho" },
  { id: 2636, name: "Park Chan-wook" },
  { id: 4762, name: "Wong Kar-wai" },
  { id: 608, name: "Akira Kurosawa" },
  { id: 1614, name: "Hayao Miyazaki" },
  { id: 4027, name: "Makoto Shinkai" },
  { id: 1769, name: "Alfred Hitchcock" },
  { id: 3556, name: "Francis Ford Coppola" },
  { id: 1037, name: "George Lucas" },
  { id: 4523, name: "Ron Howard" },
  { id: 11401, name: "Zack Snyder" },
  { id: 57130, name: "Ryan Coogler" },
  { id: 11218, name: "Barry Jenkins" },
  { id: 10965, name: "Chloe Zhao" },
  { id: 5602, name: "Michael Bay" },
  { id: 6, name: "Guy Ritchie" },
  { id: 11770, name: "Matthew Vaughn" },
  { id: 20629, name: "Taika Waititi" },
  { id: 67802, name: "Yorgos Lanthimos" },
  { id: 37153, name: "Noah Baumbach" },
  { id: 13247, name: "M. Night Shyamalan" },
  { id: 4385, name: "David Cronenberg" },
  { id: 9032, name: "Terrence Malick" },
  { id: 3027, name: "Robert Zemeckis" },
  { id: 15298, name: "Aaron Sorkin" },
  { id: 78108, name: "Alex Garland" },
  { id: 2501, name: "Nicolas Winding Refn" },
  { id: 7569, name: "John Carpenter" },
  { id: 10828, name: "James Wan" },
  { id: 62561, name: "Mike Flanagan" },
  { id: 17521, name: "Shane Black" },
  { id: 6621, name: "Chad Stahelski" },
  { id: 13653, name: "George Miller" },
  { id: 5281, name: "Spike Jonze" },
  { id: 15344, name: "Charlie Kaufman" },
  { id: 59, name: "Billy Wilder" },
  { id: 8354, name: "Woody Allen" },
  { id: 8, name: "Clint Eastwood" },
  { id: 2710, name: "Oliver Stone" },
  { id: 14705, name: "Sean Baker" },
  { id: 9339, name: "Todd Phillips" },
  { id: 17761, name: "Lee Isaac Chung" },
  { id: 73, name: "Paul Greengrass" },
  { id: 9152, name: "Doug Liman" },
  { id: 11701, name: "Taylor Sheridan" },
  { id: 52044, name: "S.S. Rajamouli" },
];

// Famous composers
export const FAMOUS_COMPOSERS: { id: number; name: string }[] = [
  { id: 947, name: "Hans Zimmer" },
  { id: 1240, name: "John Williams" },
  { id: 17779, name: "Ludwig Göransson" },
  { id: 102429, name: "Michael Giacchino" },
  { id: 8168, name: "Alexandre Desplat" },
  { id: 51339, name: "Thomas Newman" },
  { id: 14740, name: "Danny Elfman" },
  { id: 959, name: "Ennio Morricone" },
  { id: 6194, name: "Howard Shore" },
  { id: 8171, name: "James Newton Howard" },
  { id: 6037, name: "Alan Silvestri" },
  { id: 8162, name: "John Powell" },
  { id: 7627, name: "Bernard Herrmann" },
  { id: 40472, name: "Junkie XL" },
  { id: 65404, name: "Ramin Djawadi" },
  { id: 96160, name: "Jonny Greenwood" },
  { id: 957281, name: "Trent Reznor" },
  { id: 59858, name: "Atticus Ross" },
  { id: 1263, name: "John Barry" },
  { id: 1237, name: "Jerry Goldsmith" },
  { id: 18183, name: "Joe Hisaishi" },
  { id: 37440, name: "Benjamin Wallfisch" },
];

// Search famous people by name (case-insensitive partial match)
export function searchFamousPeople(
  query: string,
  type: "director" | "composer"
): { id: number; name: string }[] {
  const list = type === "director" ? FAMOUS_DIRECTORS : FAMOUS_COMPOSERS;
  const lowerQuery = query.toLowerCase().trim();

  // Return matches where any word in the name starts with the query
  // or the full name contains the query
  return list.filter((person) => {
    const lowerName = person.name.toLowerCase();
    const nameParts = lowerName.split(/\s+/);

    // Check if query matches start of any name part
    if (nameParts.some((part) => part.startsWith(lowerQuery))) {
      return true;
    }

    // Check if name contains the query
    if (lowerName.includes(lowerQuery)) {
      return true;
    }

    return false;
  });
}
