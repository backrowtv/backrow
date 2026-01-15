/**
 * Festival Components
 *
 * Re-exports all festival-related components from organized subdirectories.
 */

// Admin components - festival management and controls
export {
  AdvancePhaseButton,
  CreateFestivalModal,
  FestivalAdminPanel,
  FestivalAppearanceSettings,
  FestivalEditModal,
  FestivalPhaseControls,
  FestivalWizard,
  FestivalWorkflowHub,
} from "./admin";

// Display components - presentation and UI
// Note: FestivalCarouselSection is a Server Component - import directly from './display/FestivalCarouselSection'
export {
  FestivalCard,
  FestivalCarouselWrapper,
  FestivalHeroCard,
  FestivalHeroCardClient,
  NoActiveFestivalCard,
  FestivalOverviewPanel,
  FestivalPhaseBar,
  FestivalProgressChecklist,
  FestivalProgressIndicators,
  FestivalShareButton,
  FestivalThemedBackground,
  MovieCarousel,
  PhaseIndicator,
  PhaseTimeline,
  RecentlyPlayedShelf,
  ThemeSelectionResults,
  ViewResultsButton,
  type CarouselMovie,
  type ViewMode,
  type CarouselContext,
} from "./display";

// Endless mode components
// Note: EndlessFestivalSection is a Server Component - import directly from './endless/EndlessFestivalSection'
export {
  EndlessFestivalSettings,
  EndlessFestivalView,
  EndlessFestivalViewWrapper,
  EndlessRatingModal,
} from "./endless";

// Modal components
export { AddMovieModal, AddMovieToThemeModal, MovieGridModal, NominateMovieModal } from "./modals";

// Movie pool components
export {
  CollapsibleMoviePool,
  ForYourConsiderationCarousel,
  HomepageFeaturedMovies,
  MoviePool,
  YourNominationSection,
  FestivalPrivateNotes,
} from "./movies";

// Theme components
export { CollapsibleThemePool, ThemePool, ThemeSelector, ThemeVoting } from "./themes";
