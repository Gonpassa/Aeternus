# Nee.3 Design System

## Concept

Nee.3 is two things worn as one: a private journal and a research commonplace book.
The visual language treats both as the same physical object — a bound notebook whose pages are either written by hand (journal entries) or filed as index cards (research notes, cataloged by book/chapter).
Nothing here should feel like generic "journaling app" cream-paper-and-terracotta.
The paper tone is real (it's genuinely the right material for this subject), but the accent hierarchy leans ink-blue and moss, with rust held back for small, deliberate marks — mood, tags, active catalog tabs.

## Color

| Token | Hex | Role |
|---|---|---|
| `--paper` | `#F3EEE2` | App background, journal page |
| `--paper-card` | `#EAE2CC` | Index card / catalog surface, subtle panel fills |
| `--ink` | `#232220` | Primary text |
| `--ink-soft` | `#5B564C` | Secondary text, placeholders, captions |
| `--ink-blue` | `#2C3E52` | Primary accent — nav, primary buttons, headings |
| `--moss` | `#55684A` | Secondary accent — links, secondary buttons, focus ring |
| `--rust` | `#A8532F` | Tertiary accent — tags, mood mark, active tab, error state |
| `--line` | `#D8CFB8` | Hairlines, ruled paper lines, card borders |
| `--mood-anxious` | `#B98A2E` | Mood mark — anxious (Phase 4a taxonomy) |
| `--mood-angry` | `#7A2E1E` | Mood mark — angry (Phase 4a taxonomy) |

Rust is a spice, not a base. It should never cover more than a tag, a dot, or a 2px underline at a time.

## Type

- **Display — Fraunces** (variable, opsz 24-144, weights 500/600). Headings only, used at generous size and tight tracking. Its ink-trap softness is the closest thing to "handwriting adjacent" without being a script font.
- **Body — Newsreader** (weights 400/500, italic for emphasis). Journal entry text, card notes, any long-form reading. Optimized for paragraphs, not UI chrome.
- **Utility — IBM Plex Mono** (weights 400/500). Dates, chapter/catalog numbers, form labels, button labels, tags. This is the "typed card catalog" voice — it should read as filed, not written.

Scale (rem, 1rem = 16px):

| Role | Size | Weight | Face |
|---|---|---|---|
| Page title | 2.75 | 600 | Fraunces |
| Section heading | 1.5 | 600 | Fraunces |
| Card title | 1.125 | 500 | Fraunces |
| Body / entry text | 1.0625 | 400 | Newsreader |
| Label / meta | 0.75, uppercase, tracking 0.06em | 500 | IBM Plex Mono |
| Button | 0.8125, uppercase, tracking 0.04em | 500 | IBM Plex Mono |

## Layout

Single shell, two modes, switched by a left rail:

```
┌───────┬──────────────────────────────────────┐
│ RAIL  │  MODE CONTENT                          │
│       │                                        │
│ logo  │  Journal: single notebook page,        │
│ Journal│ stitched left margin, ruled lines,    │
│ Catalog│ date + mood select + textarea         │
│ ...   │                                        │
│       │  Catalog: filter bar (search, select,  │
│       │  button) + grid of index cards         │
└───────┴──────────────────────────────────────┘
```

Rail is `--ink-blue` on paper, fixed width, icon-free (mono text labels only — keeps the typewritten-label voice consistent).
Content area caps at a comfortable reading width (`42rem`) for the journal page; the catalog grid is allowed to breathe wider since cards are scannable, not read start-to-end.

## Signature element: the index card

A research note is rendered as a library index card: a die-cut tab along the top edge carrying the chapter/category label, a punch hole in the top-left corner, and a monospace catalog number (`No. 014`) in the corner. The journal page echoes the same "bound object" idea with a dashed stitch line down its left margin. Together they say: everything you write here gets filed, whether it's a feeling or a footnote.

This is the one place the design allows itself a flourish (the tab + punch hole). Everywhere else — buttons, inputs, selects — stays quiet and rectilinear so the card motif keeps its weight.

## Components

**Buttons**
- Primary: `--ink-blue` fill, paper text, mono label, 2px square-ish radius (`4px`), no shadow.
- Secondary: transparent fill, `--ink-blue` 1.5px border, `--ink-blue` text.
- Ghost/tag button: `--moss` text, underline on hover, used for low-emphasis actions (e.g. "add tag").
- All buttons: uppercase mono label, 0.04em tracking, 150ms ease transitions on background/border only — no movement, no shadow pop.

**Inputs & selects**
- Flat `--paper-card` fill, 1px `--line` border, `--ink-blue` border + `--moss` glow ring on focus.
- Labels are mono, uppercase, sit above the field (never inside as placeholder-only).
- Select carries a plain chevron, no native OS styling.

**Index card**
- `--paper-card` background, 1px `--line` border, tab cut from the top edge in `--rust` (or `--moss` for a second category), punch hole top-left, mono catalog number bottom-right, Fraunces title, Newsreader excerpt.

**Mood mark**
- A small filled dot (rust/moss/ink-soft) instead of an emoji — keeps the journal's tone literary rather than cute, while still giving a fast visual scan of entry mood.

**Mood mark colors (5-value primary taxonomy)**
Phase 4a's two-tier feelings-wheel taxonomy needs five distinct primary-mood colors. Three come from the existing palette; two extend it:

| Primary mood | Token | Hex |
|---|---|---|
| happy | `--rust` | #A8532F |
| calm | `--moss` | #55684A |
| sad | `--ink-blue` | #2C3E52 |
| anxious | `--mood-anxious` | #B98A2E |
| angry | `--mood-angry` | #7A2E1E |

Mood marks still carry a text label on hover/focus per the accessibility floor below, so mood pairs never rely on color alone to stay distinguishable.

## Motion

Minimal and functional only: 150-200ms ease on hover/focus states, a single on-load moment where the journal page's ruled lines draw in left-to-right (the one orchestrated flourish). No scroll-triggered reveals, no hover lift/shadow on cards — the paper metaphor means things stay flat on the page.

## Accessibility floor

- All interactive elements have a visible focus ring (`--moss`, 2px, offset).
- Text contrast: `--ink` on `--paper` and `--paper-card` both exceed 4.5:1.
- `prefers-reduced-motion` disables the ruled-line draw-in and all transitions.
- Mood marks carry a text label on hover/focus, not color alone.

## Files

- `demo.html` — standalone static demo (open directly in a browser, no build step) covering the Journal page and the Research Catalog, with buttons, inputs, and selects per this spec.
