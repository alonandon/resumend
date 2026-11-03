import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/lib/anthropic.js', () => ({ generateJSON: vi.fn() }));
const { generateJSON } = await import('../netlify/lib/anthropic.js');
const { findStyleIssues, fixDashes, polishBullets } = await import('../netlify/lib/style.js');

describe('findStyleIssues', () => {
  it('flags buzzwords in any word form', () => {
    expect(findStyleIssues('Spearheaded the launch')).toEqual(['uses the buzzword "Spearheaded"']);
    expect(findStyleIssues('Leveraging SQL for reports')[0]).toContain('Leveraging');
  });

  it('allows a buzzword the posting or resume already uses', () => {
    expect(findStyleIssues('Built robust pipelines', { allowedText: 'We need robust systems' })).toEqual([]);
  });

  it('flags em and en dashes', () => {
    expect(findStyleIssues('Led the team — shipped on time')).toEqual(['uses an em or en dash']);
  });

  it('flags numbers that are not in the original text', () => {
    const issues = findStyleIssues('Cut costs by 30% for 1,200 users', { sourceText: 'Cut costs for 1200 users' });
    expect(issues).toEqual(["includes the number 30, which is not in the candidate's original text"]);
  });

  it('accepts numbers that match the original, ignoring formatting', () => {
    expect(findStyleIssues('Grew revenue to $1,500,000', { sourceText: 'grew revenue to 1500000 dollars' })).toEqual([]);
  });

  it('skips the number check when there is no source text', () => {
    expect(findStyleIssues('Managed 40 stores')).toEqual([]);
  });
});

describe('fixDashes', () => {
  it('keeps hyphens in number ranges and turns other dashes into commas', () => {
    expect(fixDashes('2019–2021 at Acme — led design')).toBe('2019-2021 at Acme, led design');
  });
});

describe('polishBullets', () => {
  beforeEach(() => {
    generateJSON.mockReset();
  });

  const context = { allowedText: '', sourceText: 'Ran weekly sales reports in Excel' };

  it('rewrites only flagged bullets in one call', async () => {
    generateJSON.mockResolvedValue({ bullets: [{ id: '1', text: 'Built weekly Excel sales reports' }] });
    const bullets = [{ text: 'Ran weekly sales reports in Excel' }, { text: 'Leveraged Excel to boost reporting 40%' }];

    await polishBullets(bullets, context, { canRewrite: () => true });

    expect(generateJSON).toHaveBeenCalledTimes(1);
    expect(generateJSON.mock.calls[0][0]).toContain('[1] Leveraged Excel');
    expect(generateJSON.mock.calls[0][0]).not.toContain('[0]');
    expect(bullets.map((b) => b.text)).toEqual(['Ran weekly sales reports in Excel', 'Built weekly Excel sales reports']);
  });

  it('makes no call when nothing is flagged', async () => {
    await polishBullets([{ text: 'Ran weekly sales reports in Excel' }], context, { canRewrite: () => true });
    expect(generateJSON).not.toHaveBeenCalled();
  });

  it('only fixes dashes when out of time', async () => {
    const bullets = [{ text: 'Ran reports — weekly' }];
    await polishBullets(bullets, context, { canRewrite: () => false });
    expect(generateJSON).not.toHaveBeenCalled();
    expect(bullets[0].text).toBe('Ran reports, weekly');
  });

  it('keeps the first draft if the rewrite call fails', async () => {
    generateJSON.mockImplementation(async () => { throw new Error('busy'); });
    const bullets = [{ text: 'Spearheaded reports' }];
    await polishBullets(bullets, context, { canRewrite: () => true });
    expect(bullets[0].text).toBe('Spearheaded reports');
  });
});
