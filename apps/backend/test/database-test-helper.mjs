export function enableDatabaseIntegrationTests(env = process.env) {
  const testDatabaseUrl = env.SPICE_TEST_DATABASE_URL?.trim();
  if (!testDatabaseUrl) return false;

  env.DATABASE_URL = testDatabaseUrl;
  return true;
}
