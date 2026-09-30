import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';

import {
  countWords,
  evaluatePosts,
  getQualifyingUsernames,
  getThreadPageUrls,
  parseThreadPage,
} from './parser';
import { ParsedPost } from './types';

const THREAD_URL = 'https://forum.pbesim.com/showthread.php?tid=44287';

function fixture(name: string): string {
  return fs.readFileSync(path.join(__dirname, 'fixtures', name), 'utf8');
}

function post(
  id: string,
  username: string,
  wordCount: number,
  links: string[] = [],
): ParsedPost {
  return {
    id,
    username,
    permalink: `${THREAD_URL}#pid${id}`,
    body: Array.from({ length: wordCount }, () => 'word').join(' '),
    wordCount,
    links,
  };
}

test('parses MyBB posts and removes quoted words and links', () => {
  const posts = parseThreadPage(fixture('thread-page-1.html'), THREAD_URL);
  const alice = posts.find((candidate) => candidate.username === 'Alice');

  assert.equal(posts.length, 3);
  assert.ok(alice);
  assert.equal(alice.body, 'Short original reply.');
  assert.equal(alice.wordCount, 3);
  assert.deepEqual(alice.links, []);
});

test('parses themed post IDs and plain-text author names', () => {
  const posts = parseThreadPage(
    `
      <div id="post_200_classic">
        <div class="author_information"><strong>ThemeUser</strong></div>
        <article id="pid_200">Themed reply body.</article>
      </div>
    `,
    THREAD_URL,
  );

  assert.equal(posts.length, 1);
  assert.equal(posts[0].id, '200');
  assert.equal(posts[0].username, 'ThemeUser');
  assert.equal(posts[0].body, 'Themed reply body.');
});

test('parses post bodies without a standard MyBB post container', () => {
  const posts = parseThreadPage(
    `
      <section>
        <header class="author"><a href="/user-42.html">CustomUser</a></header>
        <div class="post_body">Custom theme reply.</div>
      </section>
    `,
    `${THREAD_URL}&page=3`,
  );

  assert.equal(posts.length, 1);
  assert.equal(posts[0].id, '3-0');
  assert.equal(posts[0].username, 'CustomUser');
});

test('discovers and deduplicates pagination URLs for the same thread', () => {
  const urls = getThreadPageUrls(
    fixture('thread-page-1.html'),
    THREAD_URL,
    '44287',
  );

  assert.deepEqual(urls.sort(), [
    'https://forum.pbesim.com/showthread.php?tid=44287&page=1',
    'https://forum.pbesim.com/showthread.php?tid=44287&page=2',
  ]);
});

test('requires more than 150 words unless the reply has a link', () => {
  const evaluated = evaluatePosts([
    post('1', 'Starter', 200, ['https://example.com']),
    post('2', 'Exact', 150),
    post('3', 'Long', 151),
    post('4', 'Linked', 2, ['https://example.com']),
  ]);

  assert.equal(evaluated[0].eligible, false);
  assert.equal(evaluated[0].isOpeningPost, true);
  assert.equal(evaluated[1].eligible, false);
  assert.equal(evaluated[2].eligibilityReason, 'word_count');
  assert.equal(evaluated[3].eligibilityReason, 'link');
});

test('deduplicates paginated posts and qualifying usernames case-insensitively', () => {
  const pageOne = parseThreadPage(fixture('thread-page-1.html'), THREAD_URL);
  const pageTwo = parseThreadPage(
    fixture('thread-page-2.html'),
    `${THREAD_URL}&page=2`,
  );
  const evaluated = evaluatePosts([
    ...pageOne,
    ...pageTwo,
    post('104', 'Alice', 151),
    post('105', 'alice', 1, ['https://example.com']),
  ]);

  assert.equal(
    evaluated.filter((candidate) => candidate.id === '102').length,
    1,
  );
  assert.deepEqual(getQualifyingUsernames(evaluated), ['Bob', 'Alice']);
});

test('counts Unicode words without splitting contractions or hyphenated words', () => {
  assert.equal(
    countWords("Café players don't count two-way as extra words."),
    8,
  );
});
