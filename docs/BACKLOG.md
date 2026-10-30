# ResuMend Backlog

Prioritized top to bottom. Foundation and security work comes first because the
features later in the list depend on it (shared AI module, structured output,
saved data).

Status: `[ ]` not started · `[~]` in progress · `[x]` done · `[-]` deferred

---

## Foundation & Robustness

### 1. [x] Fix known bugs and clean up lint
"Start New Analysis" crashes because it calls `setJobText`/`setJobUrl`, which
were removed. Usage logging passes arguments in the wrong order, the app crashes
on load if `localStorage` is blocked, fake progress timers never get cleared,
and the profile tab can spin forever. Fix these, get `npm run lint` passing, and
add a CI check that runs lint and build on every PR.

### 2. [-] Secure the AI functions
The Netlify functions are open to anyone on the internet and spend our Anthropic
credits. Require a signed-in user's token (or a strict guest allowance), limit
CORS to our domain, and add per-user rate limits so one person or bot can't run
up the bill.

_Deferred: needs a decision on guest access first (require sign-in, a small
daily guest allowance, or one free guest analysis)._

### 3. [x] Verify database security (RLS) and scope every query
Most queries don't filter by user and rely on Supabase Row Level Security. Confirm
RLS is on for every table (including `responsibilities` and `usage_logs`), commit
the policies as migrations, and add explicit `user_id` filters as a second
safeguard so one user can never see another's resume.

_Done in code: `supabase/migrations/20261030000000_enable_rls.sql` and user_id
filters on every query. The migration must be run in the Supabase SQL editor._

### 4. [x] Shared AI module, current model, and retries
Move every Claude call into one shared module that uses the official SDK. This
gives us one place to set the model (and upgrade from the outdated one), built-in
retries when the API is busy, and removes about 160 lines of copy-pasted
boilerplate across the four functions.

### 5. [x] Reliable function calls and timeouts
Long AI calls can hit Netlify's timeout and return an HTML error page, which the
app then fails to parse and shows a confusing message. Add one client helper
that checks responses and shows friendly errors, and raise the function timeouts
(or move to background/streaming) so analyses finish.

_Done: client helper, JSON errors from every function, and an AI timeout set
below the function limit. Follow-up: confirm the site's Netlify function timeout,
and move to background functions if analyses still run long._

### 6. [ ] Validate uploads and input sizes
There are no limits on PDF size or text length, so large files fail with
unclear errors. Check file type and size before upload, cap text length on the
server, and tell the user exactly what went wrong.

### 7. [ ] Human-sounding writing style
AI-sounding text reduces trust. Add a shared writing-style block to every prompt:
banned buzzwords, no em dashes, plain verbs, match the user's own voice, and
**never invent metrics** (prompt the user to add real numbers instead). Add a
post-generation check that catches violations and asks the model to rewrite
them once.

### 8. [ ] Structured AI output (no more markdown scraping)
Bullets and imported resumes are currently pulled out of free-form text with
regex and `JSON.parse`, which breaks when the AI formats things differently.
Switch to structured JSON output that is validated on the server, and add unit
tests (Vitest) around the new parsing. This is required for item 11.

### 9. [ ] Remove PII from logs and error messages
Resume content, job text, and Supabase details are written to the browser console
and server logs, and raw API errors are sent to the browser. Remove debug logs,
log only lengths and IDs, and return generic error messages.

### 10. [ ] Make multi-step saves atomic
Editing an experience deletes all its bullets and then re-adds them. If the
second step fails, the bullets are lost. Resume import can also stop halfway and
duplicate data on retry. Move these into single database transactions.

---

## Features

### 11. [ ] Review each AI bullet before it goes on the resume
Show every original bullet next to the AI rewrite with **Accept / Edit / Reject**,
and build the resume from the user's choices. The user stays in control and can
catch anything the AI got wrong before it reaches an employer.

### 12. [ ] Saved resumes and version history
Save each tailored resume with the company, role, job posting, bullets, and date.
Users can re-download any past version instead of recreating it, and remember
exactly which resume they sent for which role.

### 13. [ ] Match score with before/after
Show a 0–100 fit score against the posting (keywords, skills, seniority,
must-haves), with a before/after view like "62 → 87". This turns a long report
into a clear result.

### 14. [ ] Friendly errors and crash protection
Replace about 30 `alert()` pop-ups with inline messages and toasts, add loading,
empty, and error states to every list, and add an error boundary so one bug
doesn't blank the whole app. Add error monitoring so we see problems before
users report them.

### 15. [ ] Import a job posting from a link
Paste a LinkedIn, Greenhouse, Lever, or Workday URL and we fetch the posting for
you, with manual paste as the fallback. This removes the most tedious step.

### 16. [ ] Cover letter generator
Write a tailored cover letter from the same posting and the experiences the
optimizer already picked, with a tone choice and a PDF that matches the resume.
It follows the human-writing rules: no "I am excited to apply," a specific
opening, one real story, and under 250 words.

### 17. [ ] More templates, live editing, and Word export
Offer more layouts than the single Harvard style (modern, compact one-page,
technical). Add a live preview where users can tweak text and reorder sections
before downloading, and support DOCX export, which many recruiters and
applicant tracking systems prefer.

### 18. [ ] Interview prep
Generate likely behavioral and technical questions for the role, with STAR-style
answer outlines drawn from the user's real saved experiences. Written as
speaking notes, not essays.

### 19. [ ] Skill gap plan
Turn "missing qualifications" into a clear list: which gaps are real and which
are only wording, how to honestly show related experience, and what to learn for
real gaps. Show patterns across saved postings (for example, "Kubernetes was
missing in 4 of your last 6").

### 20. [ ] Career coach
Add a resume and a dream-job posting, and get a step-by-step path to that job:
skills to build, experience to gain, and milestones, with a plan for each step.
It builds on the skill gap analysis (19) and saved data (12), and uses a direct,
mentor-like voice with no pep talk.
