/**
 * BackRow FAQ Data
 *
 * Verified against the codebase — only features that actually exist are listed.
 *
 * Priority within a category:
 *   1 = Essential (landing eligible, top of category)
 *   2 = Important
 *   3 = Useful
 *   4 = Niche
 *
 * Landing selection is driven by showOnLanding + landingCategory.
 */

export interface FAQQuestion {
  id: string;
  question: string;
  answer: string;
  priority: 1 | 2 | 3 | 4;
  showOnLanding: boolean;
  landingCategory?: "basics" | "watching" | "competing" | "social";
  keywords: string[];
}

export interface FAQCategory {
  id: string;
  title: string;
  description: string;
  priority: number;
  questions: FAQQuestion[];
}

export const faqCategories: FAQCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    description: "The basics.",
    priority: 1,
    questions: [
      {
        id: "what-is-backrow",
        question: "What is BackRow?",
        answer:
          "A place to watch, rate, and argue about movies with other people. Small friend groups run themed festivals. Large communities run open clubs. Same app, different modes.",
        priority: 1,
        showOnLanding: true,
        landingCategory: "basics",
        keywords: ["about", "what is", "introduction", "overview", "platform"],
      },
      {
        id: "is-it-free",
        question: "Is it free?",
        answer: "Yes. No ads, no paywall.",
        priority: 1,
        showOnLanding: true,
        landingCategory: "basics",
        keywords: ["free", "cost", "price", "pay"],
      },
      {
        id: "who-is-it-for",
        question: "Who's it for?",
        answer:
          "Two crowds. Small groups (5–30) who want structure, themes, and a little healthy competition. And large communities — theaters, creators, subreddits — who just want a shared pool to rate and talk about.",
        priority: 1,
        showOnLanding: false,
        keywords: ["audience", "who", "size", "community", "creator", "theater", "friends"],
      },
      {
        id: "how-to-start",
        question: "How do I start?",
        answer:
          "Sign up. Then either create your own club or browse public ones in Discover.",
        priority: 2,
        showOnLanding: false,
        keywords: ["start", "begin", "create", "join", "setup", "onboard"],
      },
      {
        id: "solo-use",
        question: "Can I use it alone?",
        answer:
          "Yeah — spin up a private club with just yourself and use it as a watch log, or rate movies in any public club you're in.",
        priority: 3,
        showOnLanding: false,
        keywords: ["alone", "solo", "myself", "single", "friends"],
      },
      {
        id: "what-movies",
        question: "What movies can we pick?",
        answer: "Anything in TMDB. If it's a feature film, it's in there.",
        priority: 3,
        showOnLanding: false,
        keywords: ["movies", "tmdb", "database", "available", "films"],
      },
    ],
  },
  {
    id: "clubs",
    title: "Clubs",
    description: "What a club is and how they scale.",
    priority: 2,
    questions: [
      {
        id: "what-is-club",
        question: "What's a club?",
        answer:
          "A group built around watching movies. Every club has members, roles, discussions, and a history of festivals.",
        priority: 1,
        showOnLanding: false,
        keywords: ["club", "group", "members", "community"],
      },
      {
        id: "how-big",
        question: "How big can a club be?",
        answer:
          "No cap. Standard festivals feel best at 5–30 — that's when nominations stay manageable. Endless clubs are built to scale into the thousands.",
        priority: 1,
        showOnLanding: false,
        keywords: ["size", "big", "large", "scale", "limit", "cap", "members"],
      },
      {
        id: "private-clubs",
        question: "Can clubs be private?",
        answer:
          "Three privacy levels: Public Open (anyone joins instantly), Public Moderated (anyone can request, admins approve), and Private (invite link only, hidden from Discover).",
        priority: 1,
        showOnLanding: true,
        landingCategory: "social",
        keywords: ["private", "public", "privacy", "moderated", "invite-only"],
      },
      {
        id: "transfer-ownership",
        question: "Can I transfer ownership?",
        answer:
          "Yes — a Producer can hand the club off in settings. The new owner becomes Producer, you drop to Director.",
        priority: 3,
        showOnLanding: false,
        keywords: ["transfer", "ownership", "producer", "hand off"],
      },
      {
        id: "leave-owned-club",
        question: "What if I leave a club I own?",
        answer:
          "Transfer ownership or delete the club first. A club can't exist without a Producer.",
        priority: 3,
        showOnLanding: false,
        keywords: ["leave", "owner", "transfer", "delete"],
      },
      {
        id: "delete-club",
        question: "Can I delete a club?",
        answer:
          "Producers can delete in settings. It's permanent — ratings and festival history go with it.",
        priority: 4,
        showOnLanding: false,
        keywords: ["delete", "remove", "destroy", "club"],
      },
    ],
  },
  {
    id: "festivals-standard",
    title: "Festivals — Standard",
    description: "Themed, phased festivals for tighter groups.",
    priority: 3,
    questions: [
      {
        id: "standard-overview",
        question: "What's a Standard festival?",
        answer:
          "A round with a theme. Members nominate movies, everyone watches and rates, and the top picks earn points. Repeat for the next round.",
        priority: 1,
        showOnLanding: false,
        keywords: ["standard", "festival", "themed", "round"],
      },
      {
        id: "phases",
        question: "What are the phases?",
        answer:
          "Theme Selection → Nomination → Watch & Rate → Results. Your club's director advances them manually, or sets timed deadlines for auto-advance.",
        priority: 1,
        showOnLanding: false,
        keywords: ["phases", "theme", "nomination", "watch", "rate", "results", "flow"],
      },
      {
        id: "themes",
        question: "How do themes work?",
        answer:
          'A theme is the rule for nominations — "80s horror", "Best Picture winners", "movies set in one room". Clubs pick themes by democracy (vote), random draw, or autocracy (director decides).',
        priority: 2,
        showOnLanding: false,
        keywords: ["themes", "voting", "democracy", "random", "autocracy", "director"],
      },
      {
        id: "nominations",
        question: "How do nominations work?",
        answer:
          "Directors set how many picks each member gets per festival (1–10). Search TMDB, write a short pitch, submit. There's also a festival-wide cap so the watch list stays reasonable.",
        priority: 2,
        showOnLanding: false,
        keywords: ["nominate", "submit", "pitch", "cap"],
      },
      {
        id: "blind-nominations",
        question: "What are blind nominations?",
        answer:
          "Nominations without the nominator's name attached. Everyone rates without knowing who picked what, which opens up the guessing game at the reveal.",
        priority: 3,
        showOnLanding: false,
        keywords: ["blind", "anonymous", "nomination", "guess"],
      },
      {
        id: "finish-every-movie",
        question: "Do I have to finish every movie?",
        answer:
          "In Standard, yes — your ratings decide the points. Clubs set watch windows that give everyone a fair shot.",
        priority: 3,
        showOnLanding: false,
        keywords: ["finish", "watch", "complete", "required"],
      },
      {
        id: "watch-together",
        question: "Do we watch together?",
        answer:
          "No. Watch on your own time, rate when you're done. You just need to finish before the round closes.",
        priority: 1,
        showOnLanding: true,
        landingCategory: "watching",
        keywords: ["together", "async", "schedule", "timezone", "pace"],
      },
      {
        id: "where-to-watch",
        question: "Where do we watch?",
        answer:
          "Wherever you already do — streaming, theater, physical. BackRow handles picking, tracking, rating, and discussion.",
        priority: 2,
        showOnLanding: true,
        landingCategory: "watching",
        keywords: ["watch", "stream", "theater", "availability", "where"],
      },
    ],
  },
  {
    id: "festivals-endless",
    title: "Festivals — Endless",
    description: "Open, un-phased festivals for big communities.",
    priority: 4,
    questions: [
      {
        id: "endless-overview",
        question: "What's an Endless festival?",
        answer:
          "A shared pool of movies any member can add to, any time. Members rate what they actually watch. No phases, no scoring, no deadlines.",
        priority: 1,
        showOnLanding: false,
        keywords: ["endless", "open", "pool", "community"],
      },
      {
        id: "standard-vs-endless",
        question: "Standard vs Endless?",
        answer:
          "Standard = tight group, themed rounds, points. Endless = big group, open pool, no competition. Pick based on club size and vibe.",
        priority: 1,
        showOnLanding: false,
        keywords: ["standard", "endless", "difference", "modes", "compare"],
      },
      {
        id: "endless-pool",
        question: "How does the movie pool work?",
        answer:
          "Any member can add a movie whenever. It sits in the pool, people watch and rate on their own time. New ratings keep flowing in indefinitely.",
        priority: 2,
        showOnLanding: false,
        keywords: ["pool", "add", "open", "contribute"],
      },
      {
        id: "endless-themes",
        question: "Do Endless clubs use themes?",
        answer:
          'Optional. Some clubs run a standing theme like "horror only", most leave it open.',
        priority: 3,
        showOnLanding: false,
        keywords: ["theme", "open", "endless"],
      },
      {
        id: "rate-own",
        question: "Can I rate my own pick?",
        answer:
          "In Endless, yes. In Standard, no — it would skew the points.",
        priority: 3,
        showOnLanding: false,
        keywords: ["own", "self", "nomination", "bias"],
      },
    ],
  },
  {
    id: "ratings-rubrics",
    title: "Ratings & Rubrics",
    description: "The 0–10 scale and how multi-category scoring works.",
    priority: 5,
    questions: [
      {
        id: "how-to-rate",
        question: "How does rating work?",
        answer:
          "A number from 0.0 to 10.0. That's it. No stars, no popcorn, no emoji.",
        priority: 1,
        showOnLanding: false,
        keywords: ["rate", "score", "rating", "number", "scale"],
      },
      {
        id: "step-size",
        question: "Can I change how granular it is?",
        answer:
          "Yes — pick 0.1, 0.5, or 1.0 steps in your rating settings.",
        priority: 2,
        showOnLanding: false,
        keywords: ["step", "increment", "granular", "precision"],
      },
      {
        id: "rubrics",
        question: "What's a rubric?",
        answer:
          "A weighted template. Instead of one overall score, you rate each category (e.g. Story 30% / Performances 25% / Direction 25% / Rewatch 20%) and BackRow computes the weighted result. Clubs can set their rubric to off, suggested, or required.",
        priority: 2,
        showOnLanding: false,
        keywords: ["rubric", "weighted", "category", "template", "criteria"],
      },
      {
        id: "rating-scope",
        question: "Do my ratings carry across clubs?",
        answer:
          "Mostly yes. Endless and non-themed festivals share one global rating per movie. Themed Standard festivals are scoped — the same movie can score differently in different themed contexts.",
        priority: 2,
        showOnLanding: false,
        keywords: ["scope", "global", "per-club", "ratings", "themed"],
      },
    ],
  },
  {
    id: "competition-seasons",
    title: "Competition & Seasons",
    description: "Points, standings, and the guessing game.",
    priority: 6,
    questions: [
      {
        id: "how-standings-work",
        question: "How do standings work?",
        answer:
          "In Standard, nominated films earn points based on how the group rates them. Points stack across the season. Whoever has the most at the end wins. Endless clubs don't compete.",
        priority: 1,
        showOnLanding: true,
        landingCategory: "competing",
        keywords: ["standings", "points", "compete", "winner", "ranking"],
      },
      {
        id: "too-big-to-compete",
        question: "What if my club is too big to compete?",
        answer:
          "Use Endless mode. Built for exactly that — no phases, no scoring, no deadlines.",
        priority: 1,
        showOnLanding: true,
        landingCategory: "competing",
        keywords: ["big", "large", "endless", "community", "scale", "compete"],
      },
      {
        id: "points",
        question: "How do points work?",
        answer:
          "After a festival ends, nominations are ranked by average rating. Higher rank = more points. Directors can tune the exact payout curve.",
        priority: 2,
        showOnLanding: false,
        keywords: ["points", "calculate", "ranking", "payout"],
      },
      {
        id: "seasons",
        question: "What's a season?",
        answer:
          "A bundle of festivals with a start and end date the club picks. Points accumulate across the season toward an overall winner. Most clubs run calendar years, but it's up to you.",
        priority: 2,
        showOnLanding: false,
        keywords: ["season", "annual", "yearly", "rollover"],
      },
      {
        id: "guessing-game",
        question: "What's the guessing game?",
        answer:
          "In clubs with blind nominations, you try to guess who nominated what before the reveal. Correct guesses earn bragging rights and count toward badges.",
        priority: 3,
        showOnLanding: false,
        keywords: ["guessing", "game", "blind", "nominate", "guess"],
      },
    ],
  },
  {
    id: "achievements",
    title: "Achievements",
    description: "Badges and your Display Case.",
    priority: 7,
    questions: [
      {
        id: "badges",
        question: "What are badges?",
        answer:
          "Unlockable achievements for participating — movies watched, festivals won or participated in, correct nomination guesses, and one-off moments (first movie, first festival, first win, etc).",
        priority: 1,
        showOnLanding: false,
        keywords: ["badges", "achievement", "unlock"],
      },
      {
        id: "badge-categories",
        question: "How are badges organized?",
        answer:
          "Five categories: Festivals Won, Movies Watched, Festivals Participated, Nominators Guessed, and one-off Achievements. Each tiered category has multiple thresholds, from your first few up to well into the hundreds.",
        priority: 2,
        showOnLanding: false,
        keywords: ["tiers", "categories", "levels", "thresholds"],
      },
      {
        id: "display-case",
        question: "What's a Display Case?",
        answer:
          "Where you pick which badges to feature and pin your favorite movies. Every user has one; clubs have one too. It's the spot for flexing taste, not for scoring.",
        priority: 2,
        showOnLanding: false,
        keywords: ["display case", "favorites", "showcase", "profile", "shelf"],
      },
    ],
  },
  {
    id: "roles-invites",
    title: "Roles & Invites",
    description: "Who can do what, and how to let people in.",
    priority: 8,
    questions: [
      {
        id: "roles",
        question: "What are the roles?",
        answer:
          "Producers own the club and control everything. Directors help run festivals and manage members. Critics are the everyone-else — nominate, watch, rate, discuss.",
        priority: 1,
        showOnLanding: false,
        keywords: ["roles", "producer", "director", "critic", "admin"],
      },
      {
        id: "invite",
        question: "How do I invite people?",
        answer:
          "Share the club's invite link. Public Open clubs let anyone join instantly. Public Moderated clubs put joiners in a pending queue for admins to approve. Private clubs only accept the token-based invite link you send out.",
        priority: 1,
        showOnLanding: false,
        keywords: ["invite", "join", "link", "token", "private"],
      },
      {
        id: "approve-requests",
        question: "How do I approve join requests?",
        answer:
          "Producers and Directors see pending requests in the club's Members section and approve or deny there.",
        priority: 3,
        showOnLanding: false,
        keywords: ["approve", "accept", "reject", "join", "request"],
      },
      {
        id: "promote-demote",
        question: "Can I promote someone to Director?",
        answer:
          "Producers can promote any Critic to Director (or demote back) in the club's Members section.",
        priority: 3,
        showOnLanding: false,
        keywords: ["promote", "demote", "role", "director"],
      },
    ],
  },
  {
    id: "discussions",
    title: "Discussions",
    description: "Threads, spoilers, and comment rules.",
    priority: 9,
    questions: [
      {
        id: "discuss-movies",
        question: "Can we actually talk about the movies?",
        answer:
          "Yeah. Every club has threaded discussions with spoiler flags, tagging, and upvotes. Discuss one movie or start a club-wide thread.",
        priority: 1,
        showOnLanding: true,
        landingCategory: "social",
        keywords: ["discuss", "chat", "threads", "spoilers", "comments"],
      },
      {
        id: "spoiler-tags",
        question: "How do spoilers work?",
        answer:
          "When you post a thread or comment, flip the spoiler flag. Readers see a blurred block until they click to reveal.",
        priority: 2,
        showOnLanding: false,
        keywords: ["spoiler", "tags", "hide", "reveal"],
      },
      {
        id: "thread-tags",
        question: "What are thread tags?",
        answer:
          "When you create a thread you can tag it with a movie, a person (director, actor), or leave it as custom. Filters use those tags so people can jump to threads about a specific film or filmmaker.",
        priority: 3,
        showOnLanding: false,
        keywords: ["tag", "topic", "movie", "person", "filter"],
      },
      {
        id: "upvotes",
        question: "Why are there upvotes?",
        answer:
          'To surface good takes without everyone having to reply "same". Upvote counts sit next to each comment.',
        priority: 3,
        showOnLanding: false,
        keywords: ["upvote", "vote", "ranking", "top"],
      },
      {
        id: "delete-comments",
        question: "Who can delete comments?",
        answer:
          "You can delete your own. Directors and Producers can delete anyone's in their own club.",
        priority: 3,
        showOnLanding: false,
        keywords: ["delete", "moderate", "remove", "comment"],
      },
    ],
  },
  {
    id: "profile-identity",
    title: "Profile & Identity",
    description: "Your ID card, avatar, and what other users see.",
    priority: 10,
    questions: [
      {
        id: "who-sees-profile",
        question: "Can other people see my profile?",
        answer:
          "Not a full profile page — regular users can't visit other users' profiles. When someone taps your avatar anywhere on the site they see your ID card: your display name, avatar, bio, favorite movies/club, festival wins, and any badges you've featured.",
        priority: 1,
        showOnLanding: false,
        keywords: ["profile", "privacy", "visibility", "id card", "card"],
      },
      {
        id: "id-card",
        question: "What's an ID card?",
        answer:
          "A small pop-up card that opens when anyone taps your avatar. It shows a curated snapshot of you — name, bio, favorites, wins, and the badges you chose to feature. You pick what goes on it in your Display Case.",
        priority: 1,
        showOnLanding: false,
        keywords: ["id card", "card", "popup", "snapshot"],
      },
      {
        id: "customize-avatar",
        question: "Can I customize my avatar?",
        answer:
          "Upload a photo, or pick from BackRow's generated icons. You can also tune the icon color and border color.",
        priority: 2,
        showOnLanding: false,
        keywords: ["avatar", "image", "profile picture", "custom", "icon"],
      },
      {
        id: "social-links",
        question: "Can I link my Letterboxd / IMDb / Trakt accounts?",
        answer:
          "Yes. Your ID card supports links to Letterboxd, IMDb, Trakt, TMDB, YouTube, X, Instagram, Reddit, Discord, and TikTok — each with its own visibility toggle so you can hide any you don't want public.",
        priority: 3,
        showOnLanding: false,
        keywords: ["letterboxd", "imdb", "trakt", "social", "links"],
      },
      {
        id: "activity-feed",
        question: "What's the activity feed?",
        answer:
          "A filterable stream of what's happening in the clubs you're in — ratings posted, festivals started, phase changes, announcements, new members. Filter by club, category, member, or date.",
        priority: 2,
        showOnLanding: false,
        keywords: ["activity", "feed", "timeline", "updates"],
      },
    ],
  },
  {
    id: "notifications",
    title: "Notifications",
    description: "In-app, email, and push.",
    priority: 11,
    questions: [
      {
        id: "notifications-how",
        question: "How do notifications work?",
        answer:
          "BackRow sends notifications for club activity — new festivals, phase changes, announcements, events, badge unlocks, and invites. Configure which types you get in Settings → Notifications.",
        priority: 1,
        showOnLanding: false,
        keywords: ["notifications", "alerts", "in-app"],
      },
      {
        id: "email-notifications",
        question: "Can I turn off email?",
        answer:
          "Yes. Settings → Notifications has a toggle for each email-eligible type. You can kill them all or silence specific types.",
        priority: 2,
        showOnLanding: false,
        keywords: ["email", "unsubscribe", "off"],
      },
      {
        id: "push-notifications",
        question: "Does BackRow support push notifications?",
        answer:
          "Yes — web push on desktop and mobile browsers that support it. Opt in from Settings → Notifications.",
        priority: 2,
        showOnLanding: false,
        keywords: ["push", "mobile", "web push"],
      },
      {
        id: "mute-club",
        question: "Can I silence notifications for one club?",
        answer:
          "Yes. Open the club's Settings → Notifications for a master toggle and fine-grained toggles (festival updates, announcements, events, polls, seasons, etc). Each club has its own set.",
        priority: 2,
        showOnLanding: false,
        keywords: ["mute", "silence", "club", "notifications"],
      },
    ],
  },
  {
    id: "accessibility",
    title: "Accessibility",
    description: "Keyboard, text size, motion.",
    priority: 12,
    questions: [
      {
        id: "keyboard-nav",
        question: "Is BackRow keyboard navigable?",
        answer:
          "Yes — navs, buttons, and dialogs are reachable by Tab + Enter with visible focus rings.",
        priority: 1,
        showOnLanding: false,
        keywords: ["keyboard", "tab", "focus", "navigation"],
      },
      {
        id: "text-size",
        question: "Can I make text bigger?",
        answer:
          "BackRow respects your browser/OS text size and zoom.",
        priority: 2,
        showOnLanding: false,
        keywords: ["text", "size", "bigger", "zoom", "larger"],
      },
      {
        id: "reduced-motion",
        question: "Does BackRow respect reduced motion?",
        answer:
          "Yes. Turn on reduced motion in your OS and the fancier transitions calm down.",
        priority: 2,
        showOnLanding: false,
        keywords: ["reduced motion", "animation", "prefers-reduced-motion"],
      },
      {
        id: "accessibility-issues",
        question: "I hit something that's not accessible. How do I report it?",
        answer:
          "Use the Feedback page. Accessibility reports jump to the top of the queue.",
        priority: 3,
        showOnLanding: false,
        keywords: ["a11y", "screen reader", "report", "issue"],
      },
    ],
  },
  {
    id: "privacy-safety",
    title: "Privacy & Safety",
    description: "Who sees what, blocking, moderation, age.",
    priority: 13,
    questions: [
      {
        id: "who-sees-ratings",
        question: "Who can see my ratings?",
        answer:
          "Members of the club you rated in. Private clubs are invisible to outsiders. Your ID card only shows what you choose to feature.",
        priority: 1,
        showOnLanding: false,
        keywords: ["privacy", "visible", "ratings", "who"],
      },
      {
        id: "block",
        question: "Can I block someone?",
        answer:
          "Yes. Blocked users can't see your activity or interact with you.",
        priority: 2,
        showOnLanding: false,
        keywords: ["block", "hide", "moderation"],
      },
      {
        id: "remove-from-club",
        question: "Can a club remove someone?",
        answer:
          "Producers and Directors can remove members from their own club. The removed user can still use the rest of BackRow.",
        priority: 3,
        showOnLanding: false,
        keywords: ["remove", "kick", "ban", "moderate"],
      },
      {
        id: "report-content",
        question: "How do I report someone?",
        answer:
          "Every user ID card has a report option. Reports go to BackRow staff for review.",
        priority: 3,
        showOnLanding: false,
        keywords: ["report", "flag", "abuse", "moderate"],
      },
      {
        id: "age",
        question: "Is there an age requirement?",
        answer: "Yes — 16+. BackRow isn't intended for anyone under 16.",
        priority: 3,
        showOnLanding: false,
        keywords: ["age", "requirement", "16", "minimum"],
      },
    ],
  },
  {
    id: "account-data",
    title: "Account & Data",
    description: "Email, sign-in, deletion.",
    priority: 14,
    questions: [
      {
        id: "sign-in-methods",
        question: "What sign-in methods are supported?",
        answer:
          "Email + password, plus OAuth with Google, Apple, Facebook, X, and Discord.",
        priority: 2,
        showOnLanding: false,
        keywords: ["sign-in", "oauth", "google", "apple", "login"],
      },
      {
        id: "change-email",
        question: "Can I change my email?",
        answer:
          "Yes, in Settings → Account. You'll confirm the new address via a link before the switch takes effect.",
        priority: 3,
        showOnLanding: false,
        keywords: ["email", "change", "update"],
      },
      {
        id: "delete-account",
        question: "Can I delete my account?",
        answer:
          "Yes, from Settings → Account. Transfer or delete any clubs you own first. Deletion is permanent.",
        priority: 1,
        showOnLanding: false,
        keywords: ["delete", "account", "remove"],
      },
    ],
  },
];

/**
 * Get all FAQ categories sorted by priority
 */
export function getAllCategories(): FAQCategory[] {
  return [...faqCategories].sort((a, b) => a.priority - b.priority);
}

/**
 * Get questions for landing page, grouped by landing category
 */
export function getLandingFAQs(): {
  basics: FAQQuestion[];
  watching: FAQQuestion[];
  competing: FAQQuestion[];
  social: FAQQuestion[];
} {
  const landingQuestions = faqCategories
    .flatMap((cat) => cat.questions)
    .filter((q) => q.showOnLanding)
    .sort((a, b) => a.priority - b.priority);

  return {
    basics: landingQuestions.filter((q) => q.landingCategory === "basics"),
    watching: landingQuestions.filter((q) => q.landingCategory === "watching"),
    competing: landingQuestions.filter((q) => q.landingCategory === "competing"),
    social: landingQuestions.filter((q) => q.landingCategory === "social"),
  };
}

/**
 * Landing page category metadata
 */
export const landingCategories = {
  basics: {
    title: "The Basics",
    description: "What BackRow is and how to jump in",
  },
  watching: {
    title: "Watching Movies",
    description: "How and where you actually watch",
  },
  competing: {
    title: "Competing",
    description: "Standings, seasons, and large-scale alternatives",
  },
  social: {
    title: "Social",
    description: "Discussions and club privacy",
  },
};

/**
 * Search FAQs by keyword
 */
export function searchFAQs(query: string): FAQQuestion[] {
  const normalizedQuery = query.toLowerCase().trim();
  if (!normalizedQuery) return [];

  return faqCategories
    .flatMap((cat) => cat.questions)
    .filter(
      (q) =>
        q.question.toLowerCase().includes(normalizedQuery) ||
        q.answer.toLowerCase().includes(normalizedQuery) ||
        q.keywords.some((k) => k.includes(normalizedQuery))
    )
    .sort((a, b) => a.priority - b.priority);
}

/**
 * Get a specific question by ID
 */
export function getFAQById(id: string): FAQQuestion | undefined {
  return faqCategories.flatMap((cat) => cat.questions).find((q) => q.id === id);
}
