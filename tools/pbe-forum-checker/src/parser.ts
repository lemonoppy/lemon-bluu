import * as cheerio from 'cheerio';

import { EligibilityReason, EvaluatedPost, ParsedPost } from './types';

const POST_ID_PREFIX_PATTERN = /^post_(\d+)/;
const BODY_ID_PATTERN = /^pid_(\d+)$/;
const WORD_PATTERN = /[\p{L}\p{N}]+(?:['’ʼ-][\p{L}\p{N}]+)*/gu;

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function countWords(value: string): number {
  return value.match(WORD_PATTERN)?.length ?? 0;
}

export function parseThreadPage(html: string, pageUrl: string): ParsedPost[] {
  const $ = cheerio.load(html);
  const posts: ParsedPost[] = [];

  $('.post_body, [id^="pid_"]').each((_index, element) => {
    const originalBody = $(element);
    const bodyIdMatch = BODY_ID_PATTERN.exec(originalBody.attr('id') ?? '');
    const post = originalBody
      .closest('[id^="post_"], .post, table')
      .first();
    const postIdMatch = POST_ID_PREFIX_PATTERN.exec(post.attr('id') ?? '');
    const permalinkHref = post
      .find(
        [
          'a[href*="pid="]',
          'a[href*="#pid"]',
          '.postbit_details a[href*="showthread.php"]',
        ].join(', '),
      )
      .first()
      .attr('href');
    const permalinkIdMatch = permalinkHref?.match(/(?:[?&]pid=|#pid)(\d+)/);
    const id =
      bodyIdMatch?.[1] ??
      postIdMatch?.[1] ??
      permalinkIdMatch?.[1] ??
      `${new URL(pageUrl).searchParams.get('page') ?? '1'}-${_index}`;

    const postContext = post.length > 0 ? post : originalBody.parent();

    const username = normalizeWhitespace(
      postContext
        .find(
          [
            '.author_information .largetext a',
            '.author_information .largetext',
            '.author_information [itemprop="name"]',
            '.author_information strong',
            '.author_information a[href*="member.php"]',
            '.post_author a[href*="member.php"]',
            '.post_author a[href*="user-"]',
            '.post_author strong a',
            '.post_author .largetext',
            '.postauthor a[href*="member"]',
            '.postauthor .username',
            '.author a[href*="member"]',
            '.author a[href*="user"]',
            '.post_username',
            '.username',
            '.author-name',
            'a[href*="member.php?action=profile"]',
          ].join(', '),
        )
        .first()
        .text(),
    );

    if (!username || posts.some(existingPost => existingPost.id === id)) return;

    const body = originalBody.clone();
    body
      .find(
        [
          'blockquote',
          '.mycode_quote',
          '.quote',
          'script',
          'style',
          '.edited_by',
        ].join(', '),
      )
      .remove();
    body.find('br').replaceWith(' ');

    const text = normalizeWhitespace(body.text());
    const links = body
      .find('a[href]')
      .map((_linkIndex, link) => $(link).attr('href') ?? '')
      .get()
      .filter(
        (href) =>
          href !== '' &&
          !href.startsWith('#') &&
          !href.startsWith('javascript:'),
      )
      .map((href) => new URL(href, pageUrl).toString());

    posts.push({
      id,
      username,
      permalink: permalinkHref
        ? new URL(permalinkHref, pageUrl).toString()
        : `${pageUrl}#pid${id}`,
      body: text,
      wordCount: countWords(text),
      links: [...new Set(links)],
    });
  });

  return posts;
}

export function getThreadPageUrls(
  html: string,
  currentUrl: string,
  threadId: string,
): string[] {
  const $ = cheerio.load(html);
  const urls = new Set<string>();

  $(
    '.pagination a[href], a.pagination_page[href], a.pagination_next[href]',
  ).each((_index, element) => {
    const href = $(element).attr('href');
    if (!href) return;

    const candidate = new URL(href, currentUrl);
    if (
      candidate.hostname !== 'forum.pbesim.com' ||
      candidate.pathname !== '/showthread.php' ||
      candidate.searchParams.get('tid') !== threadId
    ) {
      return;
    }

    const page = candidate.searchParams.get('page');
    if (!page || !/^\d+$/.test(page)) return;

    const normalized = new URL('/showthread.php', candidate.origin);
    normalized.searchParams.set('tid', threadId);
    normalized.searchParams.set('page', page);
    urls.add(normalized.toString());
  });

  return [...urls];
}

export function evaluatePosts(posts: ParsedPost[]): EvaluatedPost[] {
  const uniquePosts = new Map<string, ParsedPost>();
  for (const post of posts) {
    if (!uniquePosts.has(post.id)) uniquePosts.set(post.id, post);
  }

  const openingPostId = uniquePosts.values().next().value?.id;

  return [...uniquePosts.values()].map((post) => {
    const isOpeningPost = post.id === openingPostId;
    const passesWordCount = post.wordCount > 150;
    const hasLink = post.links.length > 0;
    const eligible = !isOpeningPost && (passesWordCount || hasLink);
    let eligibilityReason: EligibilityReason = null;

    if (eligible && passesWordCount && hasLink) {
      eligibilityReason = 'word_count_and_link';
    } else if (eligible && passesWordCount) {
      eligibilityReason = 'word_count';
    } else if (eligible && hasLink) {
      eligibilityReason = 'link';
    }

    return {
      ...post,
      isOpeningPost,
      eligible,
      eligibilityReason,
    };
  });
}

export function getQualifyingUsernames(posts: EvaluatedPost[]): string[] {
  const usernames = new Map<string, string>();

  for (const post of posts) {
    if (post.eligible && !usernames.has(post.username.toLocaleLowerCase())) {
      usernames.set(post.username.toLocaleLowerCase(), post.username);
    }
  }

  return [...usernames.values()];
}
