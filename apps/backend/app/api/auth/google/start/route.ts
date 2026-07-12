/**
 * Phase 4: kick off Google OAuth so we can read the user's YT Music library.
 * Generates state, stores it, and 302s to Google's consent screen.
 */
export async function GET(_request: Request) {
  return Response.json({ error: 'not_implemented', phase: 4 }, { status: 501 });
}
