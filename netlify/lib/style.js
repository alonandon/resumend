// Shared writing rules that keep generated text from reading like AI wrote it,
// plus a checker that catches violations and one targeted rewrite pass.
import { generateJSON } from './anthropic.js';

export const STYLE_RULES = `WRITING STYLE (follow strictly):
- Write like a competent professional writing their own resume, not a copywriter.
- Never use these words unless the job posting or the candidate's original text uses them: spearheaded, leveraged, utilized, synergy, robust, seamless, dynamic, passionate, results-driven, proven track record, cutting-edge, innovative, orchestrated, championed, fostered, streamlined, delve, world-class, best-in-class, game-changer.
- Never use stock openers like "In today's fast-paced", "I am excited to", or "I am writing to express".
- No em dashes or en dashes. No semicolons in bullets.
- Don't group things in threes by habit. Use the number of items that is true.
- Prefer plain verbs: led, built, ran, cut, fixed, wrote, shipped, trained, sold, managed.
- Vary bullet length and structure. Not every bullet should be "Verb + X, resulting in Y%".
- Concrete beats impressive: name the tool, the team size, the customer, the thing.
- Match the candidate's own vocabulary and tone. Change as few words as needed to align with the posting.

NUMBERS (critical):
- Only use numbers, percentages, and dollar amounts that appear in the candidate's original text.
- Never estimate or invent a metric. If a bullet would be stronger with a number the candidate didn't give, keep the bullet without it and put a short suggestion in metric_tip (for example "Add how many people were on the team"). Otherwise set metric_tip to null.

EXAMPLE
Original: "Ran weekly reports for the sales team in Excel"
BAD: "Spearheaded data-driven reporting initiatives, leveraging Excel to empower sales stakeholders"
GOOD: "Built weekly Excel sales reports the sales team used to track pipeline" (metric_tip: "Add how many people used the reports")`;

// Each pattern also matches common word forms (leveraged, leveraging, ...)
const BANNED_PATTERNS = [
  'spearhead\\w*', 'leverag\\w*', 'utiliz\\w*', 'synerg\\w*', 'robust\\w*', 'seamless\\w*',
  'dynamic', 'passionate\\w*', 'results-driven', 'proven track record', 'cutting-edge',
  'innovative\\w*', 'orchestrat\\w*', 'champion(?:ed|ing)', 'foster(?:ed|ing)', 'streamlin\\w*',
  'delv\\w*', 'world-class', 'best-in-class', 'game-chang\\w*',
  "in today's fast-paced", 'i am excited to', 'i am writing to express',
].map((pattern) => new RegExp(`\\b${pattern}\\b`, 'i'));

const DASH = /[–—]/;

// Numbers like 12, 1,200, 3.5, $40k, 25% all normalize to their digits ("1200", "3.5")
const NUMBER = /\d+(?:,\d{3})*(?:\.\d+)?/g;
const numbersIn = (text) => new Set((text.match(NUMBER) ?? []).map((n) => n.replace(/,/g, '')));

// Returns a list of human-readable problems with one piece of generated text.
// allowedText: words the job posting or original resume already use are fine.
// sourceText: the candidate's original text; numbers not found there are flagged.
export const findStyleIssues = (text, { allowedText = '', sourceText = null } = {}) => {
  const issues = [];

  for (const pattern of BANNED_PATTERNS) {
    const match = text.match(pattern);
    if (match && !pattern.test(allowedText)) {
      issues.push(`uses the buzzword "${match[0]}"`);
    }
  }

  if (DASH.test(text)) issues.push('uses an em or en dash');

  if (sourceText !== null) {
    const sourceNumbers = numbersIn(sourceText);
    for (const number of numbersIn(text)) {
      if (!sourceNumbers.has(number)) {
        issues.push(`includes the number ${number}, which is not in the candidate's original text`);
      }
    }
  }

  return issues;
};

// Deterministic last resort: date ranges keep a hyphen, other dashes become commas.
export const fixDashes = (text) =>
  text
    .replace(/(\d)\s*[–—]\s*(\d)/g, '$1-$2')
    .replace(/\s*[–—]\s*/g, ', ');

const REWRITE_SCHEMA = {
  type: 'object',
  properties: {
    bullets: {
      type: 'array',
      items: {
        type: 'object',
        properties: { id: { type: 'string' }, text: { type: 'string' } },
        required: ['id', 'text'],
        additionalProperties: false,
      },
    },
  },
  required: ['bullets'],
  additionalProperties: false,
};

// Checks every bullet; rewrites the ones with problems in one AI call (if time allows),
// then applies deterministic dash fixes. Mutates bullet.text in place.
// bullets: [{ text }], context: { allowedText, sourceText }, canRewrite: () => boolean
export const polishBullets = async (bullets, context, { canRewrite }) => {
  const flagged = bullets
    .map((bullet, index) => ({ bullet, id: String(index), issues: findStyleIssues(bullet.text, context) }))
    .filter((item) => item.issues.length > 0);

  if (flagged.length > 0 && canRewrite()) {
    try {
      const list = flagged
        .map((item) => `[${item.id}] ${item.bullet.text}\n    Problems: ${item.issues.join('; ')}`)
        .join('\n');

      const { bullets: rewrites } = await generateJSON(
        `Rewrite each resume bullet below to fix the listed problems. Keep the meaning and facts. Change as little as possible. Do not add any new numbers; if a problem is an invented number, remove it.

${STYLE_RULES}

CANDIDATE'S ORIGINAL TEXT (the only allowed source of facts and numbers):
${context.sourceText ?? '(not provided)'}

BULLETS TO FIX:
${list}

Return every bullet with the same id.`,
        { schema: REWRITE_SCHEMA, maxTokens: 2000 }
      );

      const byId = new Map(rewrites.map((r) => [r.id, r.text]));
      for (const item of flagged) {
        const rewritten = byId.get(item.id);
        if (rewritten?.trim()) item.bullet.text = rewritten.trim();
      }
    } catch (err) {
      // The first draft is still usable; keep it rather than failing the request
      console.warn(`Style rewrite skipped: ${err.message}`);
    }
  }

  for (const bullet of bullets) bullet.text = fixDashes(bullet.text);

  const remaining = bullets.filter((b) => findStyleIssues(b.text, context).length > 0).length;
  if (flagged.length > 0) {
    console.log(`Style check: ${flagged.length} bullet(s) flagged, ${remaining} still flagged after polish`);
  }
};
