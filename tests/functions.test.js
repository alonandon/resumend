import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../netlify/lib/anthropic.js', () => ({ generateJSON: vi.fn(), generateText: vi.fn() }));
const { generateJSON } = await import('../netlify/lib/anthropic.js');
const { handler: optimize } = await import('../netlify/functions/optimize-with-experiences.js');
const { handler: parseResume } = await import('../netlify/functions/parse-resume.js');

const post = (body) => ({ httpMethod: 'POST', body: JSON.stringify(body) });

describe('optimize-with-experiences', () => {
  beforeEach(() => {
    generateJSON.mockReset();
  });

  const experiences = [{ id: 7, job_title: 'PM', company: 'Acme', responsibilities: [{ description: 'Owned the roadmap for 3 products' }] }];

  it('returns bullets keyed by real experience ids and drops ids the AI made up', async () => {
    generateJSON.mockResolvedValueOnce({
      job_requirements: ['Roadmaps'],
      selected_experiences: [{ experience_id: '7', reason: 'Roadmaps' }, { experience_id: '99', reason: 'fake' }],
      keyword_matches: [],
      optimized_experiences: [
        { experience_id: '7', bullets: [{ text: 'Owned the roadmap for 3 products', metric_tip: null }] },
        { experience_id: '99', bullets: [{ text: 'Invented role', metric_tip: null }] },
      ],
      skills_to_emphasize: [],
      recommendations: [],
    });

    const res = await optimize(post({ jobText: 'PM role', experiences, skills: [] }));
    const body = JSON.parse(res.body);

    expect(res.statusCode).toBe(200);
    expect(body.bullets).toEqual({ 7: ['Owned the roadmap for 3 products'] });
    expect(body.text).not.toContain('Invented role');
    expect(generateJSON.mock.calls[0][0]).toContain('[experience_id: 7]');
  });

  it('sends bullets with invented numbers back for one rewrite', async () => {
    generateJSON
      .mockResolvedValueOnce({
        job_requirements: [], selected_experiences: [], keyword_matches: [],
        optimized_experiences: [{ experience_id: '7', bullets: [{ text: 'Owned roadmaps, lifting revenue 40%', metric_tip: null }] }],
        skills_to_emphasize: [], recommendations: [],
      })
      .mockResolvedValueOnce({ bullets: [{ id: '0', text: 'Owned the roadmap for 3 products' }] });

    const body = JSON.parse((await optimize(post({ jobText: 'PM role', experiences }))).body);

    expect(generateJSON).toHaveBeenCalledTimes(2);
    expect(generateJSON.mock.calls[1][0]).toContain('includes the number 40');
    expect(body.bullets[7]).toEqual(['Owned the roadmap for 3 products']);
  });

  it('rejects an empty experience list before calling the AI', async () => {
    const res = await optimize(post({ jobText: 'PM role', experiences: [] }));
    expect(res.statusCode).toBe(400);
    expect(generateJSON).not.toHaveBeenCalled();
  });
});

describe('parse-resume', () => {
  it('returns experiences with database-ready dates', async () => {
    generateJSON.mockResolvedValueOnce({ experiences: [
      { company: ' Acme ', job_title: 'PM', start_date: '2020-03', end_date: '2022', is_current: false, responsibilities: ['Ran roadmap', ' '] },
      { company: 'Beta', job_title: 'Lead', start_date: '2022', end_date: '2024-01', is_current: true, responsibilities: [] },
    ] });

    const body = JSON.parse((await parseResume(post({ resumeText: 'resume' }))).body);

    expect(body.experiences).toEqual([
      { company: 'Acme', job_title: 'PM', start_date: '2020-03-01', end_date: '2022-01-01', is_current: false, responsibilities: ['Ran roadmap'] },
      { company: 'Beta', job_title: 'Lead', start_date: '2022-01-01', end_date: null, is_current: true, responsibilities: [] },
    ]);
  });
});
