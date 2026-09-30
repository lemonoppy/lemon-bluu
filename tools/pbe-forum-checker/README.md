# PBE Forum Reply Checker

Local CLI for collecting usernames whose replies in a PBE forum thread either:

- contain more than 150 words, excluding quoted text; or
- contain a link, excluding links inside quotes.

The opening post is excluded. A username appears once if any of that user's
replies qualifies.

## Setup

Install dependencies from the repository root:

```bash
yarn install
```

The scraper opens your installed Google Chrome and stores its cookies in a
dedicated, gitignored `.chrome-profile/` directory. Complete the Cloudflare
check in that window if prompted. Later runs reuse the same browser profile.
Using regular Chrome instead of Puppeteer's bundled Chrome for Testing avoids
the verification loop caused by its automation fingerprint.

If Chrome is installed somewhere unusual, set its executable explicitly:

```bash
PBE_CHROME_EXECUTABLE="/path/to/Google Chrome" yarn scrape "<thread-url>"
```

## Usage

From this directory:

```bash
yarn scrape "https://forum.pbesim.com/showthread.php?tid=44287"
```

Or from the repository root:

```bash
yarn pbe-forum "https://forum.pbesim.com/showthread.php?tid=44287"
```

The command follows every page in the thread and writes two timestamped files
under `output/`:

- `*.usernames.txt` — one qualifying username per line
- `*.json` — an audit report with each reply's text, word count, links,
  qualification result, permalink, and optional AI review

## Optional AI-authorship review

Set a Gemini API key and add `--ai`:

```bash
GEMINI_API_KEY=your-key yarn scrape \
  "https://forum.pbesim.com/showthread.php?tid=44287" --ai
```

You can put `GEMINI_API_KEY` in this tool's gitignored `.env` file instead.
`GEMINI_MODEL` optionally overrides the default `gemini-2.5-flash` model.

Only qualifying reply bodies are sent to Google. The report records
`likely_human`, `uncertain`, or `likely_ai` with a confidence value and short
reasons. AI-authorship detection is unreliable and can produce false positives,
so the result is a human-review signal only; it never removes a username.

## Development

```bash
yarn test
yarn build
yarn lint
```
