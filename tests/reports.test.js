import { describe, it, expect } from 'vitest';
import { buildAnalyzeMarkdown, buildOptimizeMarkdown, normalizeDate } from '../netlify/lib/reports.js';

describe('normalizeDate', () => {
  it.each([
    ['2021-03-15', '2021-03-15'],
    ['2021-03', '2021-03-01'],
    ['2021', '2021-01-01'],
    ['March 2021', null],
    [null, null],
    ['', null],
  ])('%s -> %s', (input, expected) => {
    expect(normalizeDate(input)).toBe(expected);
  });
});

describe('buildAnalyzeMarkdown', () => {
  const result = {
    keyword_alignment: ['Swap "managed" for "led"'],
    content_improvements: [],
    missing_qualifications: ['SQL'],
    strengths: ['Clear **impact**'],
    roles: [{ job_title: 'PM', company: 'Acme', bullets: [
      { text: 'Led roadmap', metric_tip: null },
      { text: 'Ran launches', metric_tip: 'Add how many launches' },
    ] }],
  };
  const md = buildAnalyzeMarkdown(result);

  it('renders every section as a level-2 header', () => {
    expect(md.match(/^## /gm)).toHaveLength(5);
  });

  it('renders the bullet section in the format the results screen copies from', () => {
    expect(md).toContain('## 5. Ready-to-Use Bullet Points\n**PM - Acme**\n- Led roadmap\n- Ran launches\nTip: Add how many launches');
  });

  it('strips stray bold markers from AI text and fills empty sections', () => {
    expect(md).toContain('- Clear impact');
    expect(md).toContain('## 2. Content Improvements\nNone noted.');
  });
});

describe('buildOptimizeMarkdown', () => {
  it('names roles from the experience library', () => {
    const md = buildOptimizeMarkdown({
      job_requirements: ['5 years of PM'],
      selected_experiences: [{ experience_id: '7', reason: 'Covers roadmap ownership' }],
      keyword_matches: [{ keyword: 'Roadmap', evidence: 'Owned the 2023 roadmap' }],
      optimized_experiences: [{ experience_id: '7', bullets: [{ text: 'Owned the roadmap', metric_tip: null }] }],
      skills_to_emphasize: ['SQL'],
      recommendations: [],
    }, new Map([['7', { job_title: 'PM', company: 'Acme' }]]));

    expect(md).toContain('## 2. Selected Experiences\n**PM - Acme**\n- Covers roadmap ownership');
    expect(md).toContain('- Roadmap: Owned the 2023 roadmap');
    expect(md).toContain('## 4. Optimized Bullet Points\n**PM - Acme**\n- Owned the roadmap');
  });
});
