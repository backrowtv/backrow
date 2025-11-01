/**
 * TEST USER CONFIGURATION & MANDATORY TESTING RULES
 *
 * This file defines test users, clubs, and MANDATORY testing procedures.
 * Used by TestAuthWidget for quick user switching in development.
 *
 * ╔═══════════════════════════════════════════════════════════════════════╗
 * ║  MANDATORY: ALWAYS USE CHROME DEVTOOLS MCP FOR ALL BROWSER TESTING   ║
 * ╚═══════════════════════════════════════════════════════════════════════╝
 *
 * There are NO ALTERNATIVES. Do NOT use:
 * - npx playwright test (FORBIDDEN)
 * - Playwright MCP / browser_eval (FORBIDDEN)
 * - curl / fetch (FORBIDDEN)
 * - Manual testing suggestions (FORBIDDEN)
 *
 * ============================================================
 * CHROME DEVTOOLS MCP TOOLS (USE THESE ONLY)
 * ============================================================
 *
 * Browser Navigation:
 *   mcp__chrome-devtools__navigate_page  - Go to URL
 *   mcp__chrome-devtools__new_page       - Open new tab
 *   mcp__chrome-devtools__list_pages     - List open tabs
 *   mcp__chrome-devtools__select_page    - Switch tabs
 *
 * Page Inspection:
 *   mcp__chrome-devtools__take_snapshot    - Get page a11y tree (preferred)
 *   mcp__chrome-devtools__take_screenshot  - Visual screenshot
 *
 * User Interaction:
 *   mcp__chrome-devtools__click      - Click element by uid
 *   mcp__chrome-devtools__fill       - Fill single input
 *   mcp__chrome-devtools__fill_form  - Fill multiple inputs
 *   mcp__chrome-devtools__hover      - Hover element
 *   mcp__chrome-devtools__press_key  - Keyboard input
 *
 * Debugging:
 *   mcp__chrome-devtools__list_console_messages  - Get console logs
 *   mcp__chrome-devtools__list_network_requests  - Get network activity
 *   mcp__chrome-devtools__evaluate_script        - Run JS in page
 *
 * ============================================================
 * CHROME DEVTOOLS MCP SETUP (REQUIRED BEFORE TESTING)
 * ============================================================
 *
 * 1. Open Chrome manually and navigate to http://localhost:3000
 * 2. Open Chrome DevTools (Cmd+Option+I or right-click > Inspect)
 * 3. The MCP will auto-connect when DevTools panel is open
 * 4. Verify connection: mcp__chrome-devtools__list_pages should work
 *
 * If "Not connected" error:
 * - Ensure Chrome DevTools panel is open (not just the browser)
 * - Try closing and reopening DevTools
 * - Restart your editor if needed
 *
 * ============================================================
 * DATABASE OPERATIONS (SUPABASE MCP ONLY)
 * ============================================================
 *
 * ALWAYS use Supabase MCP:
 *   mcp__supabase__execute_sql      - Run queries
 *   mcp__supabase__apply_migration  - Schema changes
 *   mcp__supabase__list_tables      - View schema
 *
 * NEVER use:
 *   - psql / supabase CLI
 *   - Direct database connections
 *
 * ============================================================
 * TEST INTERFACE SETUP
 * ============================================================
 *
 * ENABLE TestAuthWidget:
 * 1. Set NEXT_PUBLIC_ENABLE_TEST_AUTH=true in .env.local
 * 2. Restart dev server (bun run dev)
 * 3. Test widget appears in sidebar
 * 4. Click user buttons to sign in/out instantly
 *
 * DISABLE:
 * Set NEXT_PUBLIC_ENABLE_TEST_AUTH=false in .env.local
 *
 * NEVER commit .env.local with test auth enabled to git.
 */

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: string;
  description: string;
}

/**
 * Test users for QA testing
 * Note: Stephen requires separate password config
 */
export const TEST_USERS: TestUser[] = [
  {
    email: "producer@test.backrow.tv",
    password: "TestPassword123!",
    name: "Producer",
    role: "Club Owner",
    description: "Can manage clubs, create festivals, manage members",
  },
  {
    email: "director@test.backrow.tv",
    password: "TestPassword123!",
    name: "Director",
    role: "Club Admin",
    description: "Can manage festivals and club content",
  },
  {
    email: "critic@test.backrow.tv",
    password: "TestPassword123!",
    name: "Critic",
    role: "Member",
    description: "Standard member - can view, rate, participate",
  },
  {
    email: "visitor@test.backrow.tv",
    password: "TestPassword123!",
    name: "Visitor",
    role: "Non-member",
    description: "Not a member of test clubs - for access testing",
  },
];

/**
 * Test club slugs for quick navigation
 */
export const TEST_CLUBS = {
  festivalTestLab: "festival-test-lab",
  endlessMovieNight: "endless-movie-night",
  auditTestClub: "audit-test-club",
  hummina: "hummina",
} as const;

/**
 * Test routes for quick navigation
 */
export const TEST_ROUTES = [
  { path: `/club/${TEST_CLUBS.festivalTestLab}`, label: "Festival Test Lab" },
  { path: `/club/${TEST_CLUBS.festivalTestLab}/manage`, label: "Manage Club" },
  { path: `/club/${TEST_CLUBS.festivalTestLab}/stats`, label: "Club Stats" },
  { path: `/club/${TEST_CLUBS.festivalTestLab}/history`, label: "Club History" },
  { path: "/profile/display-case", label: "Display Case" },
  { path: "/search", label: "Search" },
  { path: "/discover", label: "Discover" },
  { path: "/feedback", label: "Feedback" },
] as const;
