import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationsUrl = new URL('../db/migrations/', import.meta.url);

test('journaled duplicate playlist status migrations are idempotent', async () => {
  const journal = JSON.parse(
    await readFile(new URL('meta/_journal.json', migrationsUrl), 'utf8'),
  );
  const migrationTags = journal.entries
    .map((entry) => entry.tag)
    .filter((tag) => tag === '0005_tired_silk_fever' || tag === '0005_empty_inhumans');

  assert.deepEqual(migrationTags, ['0005_tired_silk_fever', '0005_empty_inhumans']);

  for (const tag of migrationTags) {
    const sql = await readFile(new URL(`${tag}.sql`, migrationsUrl), 'utf8');
    const statusStatements = sql
      .split(/-->\s*statement-breakpoint/)
      .filter((statement) => /ALTER TABLE\s+"playlist_members"[\s\S]*ADD COLUMN[\s\S]*"status"/i.test(statement));

    assert.equal(statusStatements.length, 1, `${tag} should add playlist_members.status once`);
    assert.match(
      statusStatements[0],
      /ADD COLUMN\s+IF NOT EXISTS\s+"status"/i,
      `${tag} must tolerate the status column created by the other journaled migration`,
    );
  }
});
