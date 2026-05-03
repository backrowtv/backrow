import type { TourSection } from "./TourPopup";

export interface TourContent {
  title: string;
  intro?: string;
  sections: TourSection[];
}

export const homeTour: TourContent = {
  title: "Welcome to BackRow",
  intro: "A few things you might not know to do yet.",
  sections: [
    {
      heading: "Clubs vs. festivals",
      body: "A club is a group of friends. A festival is a themed run inside a club where everyone nominates a movie, watches them all, and votes. One club can run many festivals over time.",
    },
    {
      heading: "Standard vs. endless festivals",
      body: "Standard festivals are themed and rotate nominators with a clear winner. Endless festivals run continuously — anyone can add a movie any time, and ratings just keep accumulating.",
    },
    {
      heading: "Find a club to join",
      body: "Browse public clubs by genre, size, and activity. You can follow without joining if you just want to lurk.",
      href: "/discover",
      linkLabel: "Open Discover",
    },
    {
      heading: "Make your ratings yours",
      body: "Set your rating step (1.0, 0.5, or 0.1), pick a slider thumb icon, and build rubrics for nuanced scoring.",
      href: "/profile/settings/ratings",
      linkLabel: "Rating settings",
    },
  ],
};

export const profileTour: TourContent = {
  title: "Make your profile yours",
  intro: "Most of these are tucked away in settings — here's where to find them.",
  sections: [
    {
      heading: "Customize your avatar",
      body: "Pick an icon, a background color, and a border. No upload required.",
      href: "/profile/edit",
      linkLabel: "Edit avatar",
    },
    {
      heading: "Build your display case",
      body: "Pin favorite movies, showcase challenges, and choose which badge categories appear on your profile.",
      href: "/profile/display-case",
      linkLabel: "Open display case",
    },
    {
      heading: "Tune the navigation",
      body: "Reorder sidebar items on desktop and the bottom-bar on mobile so the things you actually use are one tap away.",
      href: "/profile/settings/display",
      linkLabel: "Display settings",
    },
    {
      heading: "Notifications & privacy",
      body: "Email digests, in-app alerts, and who can see your profile and activity — all togglable per channel.",
      href: "/profile/settings/notifications",
      linkLabel: "Notification settings",
    },
    {
      heading: "Add your social links",
      body: "Letterboxd, Instagram, personal site — they show on your profile so club members can follow you elsewhere.",
      href: "/profile/edit",
      linkLabel: "Edit profile",
    },
  ],
};

export const profileStatsTour: TourContent = {
  title: "Reading your stats",
  sections: [
    {
      heading: "Festival vs. global ratings",
      body: "Stats split into themed-festival ratings (only count inside that festival) and global ratings (count everywhere else). The split keeps your festival average from being skewed by casual rewatches.",
    },
    {
      heading: "Time-range filter",
      body: "Toggle between all-time, this year, and the last 30 days at the top of the page. Rating distributions and genre breakdowns update with the range.",
    },
    {
      heading: "Fun stats",
      body: "Average rating gap with each club member, your most-rated decade, your nomination win rate, and a few weirder ones — scroll all the way down.",
    },
  ],
};

export const profileDisplayCaseTour: TourContent = {
  title: "Build your display case",
  sections: [
    {
      heading: "Pin favorite movies",
      body: "Choose up to four movies to pin at the top of your profile. Re-pick any time.",
    },
    {
      heading: "Showcase challenges",
      body: "Hide challenges that don't fit your vibe, surface the ones you want others to see.",
    },
    {
      heading: "Pick badge categories",
      body: "By default every badge you've earned shows. Narrow it to the categories you care about — festival wins, streaks, anniversaries, etc.",
    },
  ],
};

export const profileNominationsTour: TourContent = {
  title: "Tracking your nominations",
  sections: [
    {
      heading: "Pending vs. completed",
      body: "Pending = you've been picked to nominate, deadline shown. Completed = the nomination went through and is either watched, rated, or already in standings.",
    },
    {
      heading: "Nomination order matters",
      body: "In standard festivals, the nominator can't rate their own pick — it shows as 'Your Pick' instead. Plan accordingly when picking what to nominate.",
    },
    {
      heading: "Future nominations",
      body: "If your club uses scheduled rotations, you'll see upcoming slots here so you can start scouting movies early.",
    },
  ],
};

export const clubCreatorTour: TourContent = {
  title: "Running this club",
  intro: "You're the producer here. A few tools that aren't obvious.",
  sections: [
    {
      heading: "Standard vs. endless mode",
      body: "Standard festivals have phases (nominate → watch → rate → results). Endless festivals run continuously with no end. Pick the right mode per festival, not per club.",
    },
    {
      heading: "Phases advance manually",
      body: "Phase advancement requires confirmation — there's no 'auto-advance at midnight' surprise. Use the festival admin panel to move things along.",
      href: "/profile/settings",
      linkLabel: "Settings",
    },
    {
      heading: "Privacy & invitations",
      body: "Public open, public closed, private invite-only — set in club settings. Invite links can be revoked any time.",
    },
    {
      heading: "Theme & avatar",
      body: "Custom club avatar, accent color, and theme show across the club's hero, festival pages, and member badges.",
    },
    {
      heading: "Standings",
      body: "Live leaderboard for the active festival; previous-festival standings stay browsable in the club's archive.",
    },
  ],
};

export const clubMemberTour: TourContent = {
  title: "Welcome to the club",
  sections: [
    {
      heading: "Festival mode shapes everything",
      body: "Check whether the active festival is standard (themed, scored, rotating nominators) or endless (rolling, no winner). The ratings, deadlines, and your nominator slot all behave differently.",
    },
    {
      heading: "Your rating tasks",
      body: "When a festival is in its rating phase, your queue of unrated festival picks shows on the club page. Rate them all to count toward standings.",
    },
    {
      heading: "Discussions & polls",
      body: "Each festival gets its own discussion thread and the producer can run side-polls. Replies thread Reddit-style.",
    },
    {
      heading: "Notifications & leaving",
      body: "Mute notifications for a club without leaving — useful when you want to lurk a festival you can't watch along with.",
      href: "/profile/settings/notifications",
      linkLabel: "Notification settings",
    },
  ],
};

export const festivalTour: TourContent = {
  title: "How a festival works",
  sections: [
    {
      heading: "The phases",
      body: "Standard festivals run nominate → watch → rate → results. The producer advances phases manually with confirmation; you'll see the current phase at the top of the page.",
    },
    {
      heading: "When ratings count",
      body: "In standard festivals, only ratings submitted before the rate phase ends count toward standings. Late ratings still log to your profile but won't change scores.",
    },
    {
      heading: "Your Pick is locked",
      body: "If you're the nominator for a movie, you can't rate it inside that festival. The rate button is replaced with a 'Your Pick' badge — your score doesn't enter the average.",
    },
    {
      heading: "Standings precision",
      body: "Festival averages display two decimals (7.78, not 7.8) because the math is averaging-of-averages. Your personal rating still shows one decimal everywhere else.",
    },
    {
      heading: "Endless mode differences",
      body: "Endless festivals have no phases and no end. Anyone can nominate any time, ratings stack forever, and the nominator CAN rate their own pick.",
    },
  ],
};

export const movieTour: TourContent = {
  title: "More you can do here",
  sections: [
    {
      heading: "Customize where 'Watch' links go",
      body: "Pick which streaming providers to surface (Letterboxd, JustWatch, your library service, etc.) — your choice applies across every movie page.",
      href: "/profile/settings/display",
      linkLabel: "Display settings",
    },
    {
      heading: "Rate it once, see it everywhere",
      body: "A global rating shows on every club's view of this movie unless you're inside a themed festival, where festival-scoped ratings take over.",
    },
    {
      heading: "Club vs. global stats",
      body: "Toggle between how this movie is rated globally and how it's rated inside each of your clubs. Useful for finding outliers.",
    },
  ],
};

export const discoverTour: TourContent = {
  title: "Finding clubs to join",
  sections: [
    {
      heading: "Cards or table view",
      body: "Cards are scannable for browsing. Table view sorts on members, festival count, and movies-watched — better when you know what you're looking for.",
    },
    {
      heading: "Genre filter",
      body: "Filter by the genres a club tends to watch. Based on the actual movies they've festivaled, not self-reported tags.",
    },
    {
      heading: "Join vs. follow",
      body: "Joining a club lets you nominate and rate. Following just adds it to your feed — useful for clubs that are invite-only or that you want to spectate before committing.",
    },
  ],
};
