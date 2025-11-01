export interface DiscussionPreferences {
  /** Collapse comments on tap (tap comment body to collapse). Default: true */
  collapseOnTap: boolean;
  /** Auto-collapse a comment after upvoting it. Default: false */
  collapseOnUpvote: boolean;
}

export const DEFAULT_DISCUSSION_PREFERENCES: DiscussionPreferences = {
  collapseOnTap: true,
  collapseOnUpvote: false,
};
