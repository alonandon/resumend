// JSON schemas for structured AI output, and builders that turn the result into the
// markdown the results screen renders. Building markdown here (instead of asking the
// AI for it) keeps the layout consistent no matter how the AI words things.

const string = { type: 'string' };
const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };
const strings = { type: 'array', items: string };
const object = (properties) => ({
  type: 'object',
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
});

const bullet = object({ text: string, metric_tip: nullableString });

export const ANALYZE_SCHEMA = object({
  keyword_alignment: strings,
  content_improvements: strings,
  missing_qualifications: strings,
  strengths: strings,
  roles: { type: 'array', items: object({ job_title: string, company: string, bullets: { type: 'array', items: bullet } }) },
});

export const OPTIMIZE_SCHEMA = object({
  job_requirements: strings,
  selected_experiences: { type: 'array', items: object({ experience_id: string, reason: string }) },
  keyword_matches: { type: 'array', items: object({ keyword: string, evidence: string }) },
  optimized_experiences: { type: 'array', items: object({ experience_id: string, bullets: { type: 'array', items: bullet } }) },
  skills_to_emphasize: strings,
  recommendations: strings,
});

export const PARSE_RESUME_SCHEMA = object({
  experiences: {
    type: 'array',
    items: object({
      company: string,
      job_title: string,
      start_date: nullableString,
      end_date: nullableString,
      is_current: { type: 'boolean' },
      responsibilities: strings,
    }),
  },
});

// Markdown helpers. The results screen treats "**text**" lines as role headers
// and "- " lines as bullets, so strip stray markdown from AI-written text.
const clean = (text) => String(text ?? '').replace(/\*\*/g, '').replace(/\s+/g, ' ').trim();
const section = (title, lines) => [`## ${title}`, ...lines, ''].join('\n');
const list = (items) => (items.length ? items.map((item) => `- ${clean(item)}`) : ['None noted.']);

const roleBlock = (heading, bullets) => [
  `**${clean(heading)}**`,
  ...bullets.map((b) => `- ${clean(b.text)}`),
  ...bullets.filter((b) => b.metric_tip).map((b) => `Tip: ${clean(b.metric_tip)}`),
];

export const buildAnalyzeMarkdown = (result) => [
  section('1. Keyword Alignment', list(result.keyword_alignment)),
  section('2. Content Improvements', list(result.content_improvements)),
  section('3. Missing Qualifications', list(result.missing_qualifications)),
  section('4. Strength Highlights', list(result.strengths)),
  section('5. Ready-to-Use Bullet Points', result.roles.flatMap((role) =>
    roleBlock(`${role.job_title} - ${role.company}`, role.bullets))),
].join('\n');

const roleName = (exp) => (exp ? `${exp.job_title} - ${exp.company}` : 'Experience');

// experiencesById: Map of String(id) -> experience, used for role names
export const buildOptimizeMarkdown = (result, experiencesById) => [
  section('1. Job Posting Analysis', list(result.job_requirements)),
  section('2. Selected Experiences', result.selected_experiences.flatMap((s) => [
    `**${clean(roleName(experiencesById.get(s.experience_id)))}**`,
    `- ${clean(s.reason)}`,
  ])),
  section('3. Keyword Alignment', list(result.keyword_matches.map((m) => `${m.keyword}: ${m.evidence}`))),
  section('4. Optimized Bullet Points', result.optimized_experiences.flatMap((o) =>
    roleBlock(roleName(experiencesById.get(o.experience_id)), o.bullets))),
  section('5. Skills to Emphasize', list(result.skills_to_emphasize)),
  section('6. Additional Recommendations', list(result.recommendations)),
].join('\n');

// Database date columns need YYYY-MM-DD; resumes often only give a month or year.
export const normalizeDate = (value) => {
  const text = String(value ?? '').trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  if (/^\d{4}-\d{2}$/.test(text)) return `${text}-01`;
  if (/^\d{4}$/.test(text)) return `${text}-01-01`;
  return null;
};
