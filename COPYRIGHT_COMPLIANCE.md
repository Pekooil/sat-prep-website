# Copyright Compliance

This application assists students in using the **College Board Question Bank** (QB). The QB is a free, official College Board resource. Our application never stores, displays, or redistributes any copyrighted SAT content.

---

## The Core Workflow

1. The app generates a study schedule with specific QB filter recommendations (domain, skill, difficulty).
2. The student visits [College Board Question Bank](https://satsuite.collegeboard.org/digital/digital-practice-preparation/practice-tests/linear) directly.
3. The student applies the recommended filters on the CB website and downloads/practices questions there.
4. The student returns to this app and logs their results (questions attempted, questions correct).
5. The app uses those results to update its domain rankings and re-prioritize the plan.

**At no point does this application store, cache, proxy, or display any SAT question, passage, answer choice, or explanatory content.**

---

## What We Store

| Stored | Not Stored |
|---|---|
| Questions attempted (integer) | The questions themselves |
| Questions correct (integer) | Answer choices |
| Domain / skill label strings | Passages or reading excerpts |
| QB filter recommendations | Images or diagrams from questions |
| User-written error descriptions | Official explanations |
| User-written correct approach notes | PDFs or test booklets |

The domain and skill label strings (e.g., "Craft and Structure", "Words in context") are the official names College Board uses publicly for its own QB filter UI. Using these strings as filter references does not reproduce copyrighted content.

---

## Explicitly Forbidden

- Storing any SAT question text, even partially
- Displaying any SAT passage or stimulus material
- Storing or displaying answer choices
- Scraping the College Board website or QB in any way
- Caching QB responses from any API
- Redistributing College Board PDFs or practice test files
- Framing the College Board website in an iframe

---

## Practice Tests

The app schedules "Full Practice Test" days and directs students to use **official College Board Bluebook practice tests**, which are distributed for free by College Board. We do not host, mirror, or redistribute these files. The `calendar_tasks` row for a practice test day contains only:

```jsonb
{
  "domain": "Full-Length Practice Test",
  "skill": "Complete test simulation (Bluebook)",
  "difficulty": "hard"
}
```

No test content is embedded.

---

## User-Generated Content

The Error Log stores only what the student writes themselves: their description of a mistake, their incorrect reasoning, and their own explanation of the correct approach. Students must not paste question text or answer choices into these fields. The field labels and placeholder text should make this clear in any future UI copy.

---

## Compliance Checklist for New Features

Before shipping any feature that touches SAT content:

- [ ] Does it display any question text? → **Block**
- [ ] Does it store any passage or reading excerpt? → **Block**
- [ ] Does it scrape or proxy any College Board URL? → **Block**
- [ ] Does it reproduce answer choices? → **Block**
- [ ] Does it display domain/skill labels from CB QB filter UI? → **Allowed** (public UI labels)
- [ ] Does it store user-entered numeric results (attempted/correct)? → **Allowed**
- [ ] Does it store user-written notes and explanations? → **Allowed** (user's own words)
- [ ] Does it link to the official CB QB URL? → **Allowed and encouraged**
