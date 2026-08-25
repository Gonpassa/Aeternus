# Aeternus Design System

## Overview

Aeternus is two things worn as one: a private journal and a research commonplace book.
The visual language treats both as the same physical object — a bound notebook whose pages are either written by hand (journal entries) or filed as index cards (research notes, cataloged by book/chapter).
Nothing here should feel like generic "journaling app" cream-paper-and-terracotta.
The paper tone is real — it's genuinely the right material for this subject — but the accent hierarchy leans ink-blue and moss, with rust held back for small, deliberate marks: mood, tags, active catalog tabs.

Type carries the second voice, and it works the same two-face way the concept does: a display serif for the handwritten register, a workhorse serif for reading, and a monospace for everything that's been filed rather than written.
`{typography.pageTitle}` through `{typography.cardTitle}` are set in Fraunces.
`{typography.body}` is set in Newsreader.
`{typography.button}` and `{typography.label}` are set in IBM Plex Mono, always uppercase — the "typed card catalog" voice that should read as filed, not written.

**Key Characteristics:**
- A single canonical type scale with exactly six named rungs — `{typography.pageTitle}` down to `{typography.label}` — and nothing in between. Every heading, button, and caption in the app maps onto one of these six; there is no seventh size.
- Fraunces for anything that is a heading, Newsreader for anything that is read start-to-end, IBM Plex Mono uppercase for anything that is a label, control, or piece of filed metadata. Font family signals role before size does.
- Warm paper canvas `{colors.paper}` (`#F3EEE2`) — never pure white. The temperature carries the "real paper" premise.
- Rust `{colors.rust}` is a spice, not a base — reserved for tags, the mood mark, and a 2px underline at most. It should never cover more than that at a time.
- `{rounded.md}` 4px for buttons, cards, and dialogs — deliberately tight and rectilinear, so the one flourish in the system (the index card's die-cut tab) keeps its weight.

## Colors

### Surface
- **Paper** (`{colors.paper}` — `#F3EEE2`): App background, journal page.
- **Paper Card** (`{colors.paperCard}` — `#EAE2CC`): Index card / catalog surface, subtle panel fills.

### Text
- **Ink** (`{colors.ink}` — `#232220`): Primary text.
- **Ink Soft** (`{colors.inkSoft}` — `#5B564C`): Secondary text, placeholders, captions.

### Brand & Accent
- **Ink Blue** (`{colors.inkBlue}` — `#2C3E52`): Primary accent — nav rail, primary buttons, page headings.
- **Moss** (`{colors.moss}` — `#55684A`): Secondary accent — links, secondary buttons, focus ring.
- **Rust** (`{colors.rust}` — `#A8532F`): Tertiary accent — tags, mood mark, active tab, error/destructive state. A spice, not a base.

### Structure
- **Line** (`{colors.line}` — `#D8CFB8`): Hairlines, ruled paper lines, card borders.

### Mood taxonomy (6-value primary scale)
Phase 4a's two-tier feelings-wheel taxonomy needs six distinct primary-mood colors, one per mood plus a neutral "steady" option.
Mood marks still carry a text label on hover/focus per the accessibility floor below, so mood pairs never rely on color alone to stay distinguishable.

| Primary mood | Token | Hex |
|---|---|---|
| happy | `{colors.moss}` | `#55684A` |
| calm | `{colors.moodCalm}` | `#C9743A` |
| sad | `{colors.inkBlue}` | `#2C3E52` |
| anxious | `{colors.moodAnxious}` | `#5C4A72` |
| angry | `{colors.moodAngry}` | `#7A2E1E` |
| steady | `{colors.moodSteady}` | `#B8860B` |

## Typography

### Font Family
Three faces, each with one job:
1. **Fraunces** (variable, opsz 24-144, weights 500/600) — headings only, at generous size and tight tracking. Its ink-trap softness is the closest thing to "handwriting adjacent" without being a script font.
2. **Newsreader** (weights 400/500, italic for emphasis) — journal entry text, card notes, any long-form reading. Optimized for paragraphs, not UI chrome.
3. **IBM Plex Mono** (weights 400/500) — dates, chapter/catalog numbers, form labels, button labels, tags. This is the "typed card catalog" voice: it should read as filed, not written, and it is always uppercase.

### Hierarchy

There are exactly six rungs.
Nothing in the app should use a font size outside this table — a new size is never added to fit a single call site; the call site is fit onto the nearest existing rung instead.

| Token | Size | Weight | Line Height | Letter Spacing | Face | Use |
|---|---|---|---|---|---|---|
| `{typography.pageTitle}` | 36px (2.25rem) | 600 | 1.15 | 0 | Fraunces | The single h1 on a page — dashboard greeting, "Journal", entry title, auth headings. |
| `{typography.sectionHeading}` | 24px (1.5rem) | 600 | 1.25 | 0 | Fraunces | An h2 that introduces a region of a page — the nav wordmark, a grouped section within a longer page. |
| `{typography.cardTitle}` | 18px (1.125rem) | 500 | 1.3 | 0 | Fraunces | The heading inside a card or dialog — an entry-list card's title, a dialog's title. |
| `{typography.body}` | 17px (1.0625rem) | 400 | 1.6 | 0 | Newsreader | Journal entry text, card body copy, any long-form reading. |
| `{typography.button}` | 13px (0.8125rem) | 500 | 1 | 0.04em | IBM Plex Mono, uppercase | Every button label, at every button height. A `lg` button is taller than an `xs` button; its label is never bigger. |
| `{typography.label}` | 12px (0.75rem) | 500 | 1 | 0.06em | IBM Plex Mono, uppercase | Form labels, dates, mood tags, catalog numbers, nav account block — anything "filed" rather than "written." |

### Principles
- **Six rungs, no exceptions.** A raw `fontSize` prop anywhere in the client is a bug report waiting to happen; every text element should carry one of the six named `textStyle` tokens above (or a component variant built from one).
- **Font family signals role, not just face.** Fraunces headings scale by prominence (page → section → card); Newsreader is body-only and does not scale; IBM Plex Mono is always uppercase and only ever appears at the two smallest rungs.
- **Button labels don't scale with button height.** Height changes via padding; the label stays fixed at `{typography.button}` regardless of `xs`/`sm`/`default`/`lg`.
- **Sentence-case for Fraunces, uppercase for mono.** The two faces never swap case conventions.

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

Rail is `{colors.inkBlue}` on paper, fixed width, icon-free — mono text labels only, which keeps the typewritten-label voice consistent.
Content area caps at a comfortable reading width (`42rem`) for the journal page.
The catalog grid is allowed to breathe wider since cards are scannable, not read start-to-end.

### Responsive strategy
The rail collapses to a horizontal bar above the content on narrow viewports (Chakra's `base`/`md` breakpoint pair) rather than an off-canvas drawer, so nav labels stay visible instead of hiding behind a hamburger.

## Elevation & Depth

| Level | Treatment | Use |
|---|---|---|
| Level 0 — Flat | No shadow, no border. | Default page background, journal page. |
| Level 1 — Hairline | 1px solid `{colors.line}` border. | Index cards, inputs, selects. |
| Level 2 — Lifted | `boxShadow: md/lg`. | Dialogs, select dropdowns, popovers — the only surfaces allowed to float above the page. |

The paper metaphor means content stays flat on the page; shadow is reserved for things that are genuinely floating above it (an open dialog, a dropdown), never for hover states on cards.

## Shapes

### Border Radius

| Token | Value | Use |
|---|---|---|
| `{rounded.none}` | 0px | Ruled inputs, select chrome inside filter bars — full-bleed, no chrome. |
| `{rounded.sm}` | Chakra `sm` | Tooltip chips. |
| `{rounded.md}` | 4px | The canonical radius — buttons, cards, dialogs, popovers, select menus. Deliberately tight and rectilinear, not the friendly-rounded default, so the card motif's one flourish (the die-cut tab) keeps its visual weight. |
| `{rounded.full}` | 9999px | Mood dots, circular filter pills. |

## Components

### Buttons
- **Primary**: `{colors.inkBlue}` fill, paper text, `{typography.button}` label, `{rounded.md}`, no shadow.
- **Destructive**: `{colors.rust}` fill, paper text, same typography/shape.
- **Outline**: transparent fill, `{colors.inkBlue}` 1px border, `{colors.inkBlue}` text.
- **Ghost**: `{colors.moss}` text, underline on hover — used for low-emphasis actions.
- **Link**: `{colors.moss}` text, underline on hover, no button chrome.
- All variants share one `{typography.button}` label regardless of size (`xs`/`sm`/`default`/`lg`) — only height and padding change between sizes.
- All buttons: 150ms ease transitions on background/border only — no movement, no shadow pop.

### Inputs & Selects
- Flat `{colors.paperCard}` fill, 1px `{colors.line}` border, `{colors.inkBlue}` border + `{colors.moss}` glow ring on focus.
- Labels are `{typography.label}` and sit above the field — never inside as placeholder-only.
- Select carries a plain chevron, no native OS styling; select trigger and menu items are set in `{typography.label}`.

### Index Card
The signature component: a research note rendered as a library index card.
- `{colors.paperCard}` background, 1px `{colors.line}` border.
- A die-cut tab along the top edge in `{colors.rust}` (or `{colors.moss}` for a second category) carries the chapter/category label in `{typography.label}`.
- A monospace catalog number (`No. 014`) in `{typography.label}` sits in the bottom-right corner.
- Card body copy, when present, is set in `{typography.body}`.
- This is the one place the design allows itself a flourish. Everywhere else — buttons, inputs, selects — stays quiet and rectilinear so the card motif keeps its weight.

### Mood Mark
A small filled dot (rust/moss/ink-soft/mood-taxonomy color) instead of an emoji — keeps the journal's tone literary rather than cute, while still giving a fast visual scan of entry mood.
Mood marks carry a text label on hover/focus per the accessibility floor below, so mood pairs never rely on color alone to stay distinguishable.

### Navigation
- **Rail**: `{colors.inkBlue}` fill, `{typography.sectionHeading}` wordmark, `{typography.button}` nav-item labels, `{typography.label}` for the account block at the bottom.
- Icon-free by design — the mono text labels are the whole visual language of the rail.

## Do's and Don'ts

### Do
- Use one of the six `{typography}` tokens for every piece of text in the app — no other font size.
- Keep Fraunces for headings only, at the size matching its role (page/section/card), and Newsreader for anything meant to be read as prose.
- Keep button labels fixed at `{typography.button}` regardless of button height.
- Keep paper warm — `{colors.paper}` `#F3EEE2`, not pure white. The temperature is the brand voice.
- Reserve `{rounded.md}` 4px, tight and rectilinear, for buttons/cards/dialogs, so the index card's die-cut tab stays the one flourish in the system.

### Don't
- Don't introduce a new font size for a single call site. If nothing in the six-rung scale fits, that's a signal the scale needs a real conversation, not a one-off pixel value.
- Don't scale a button's label with its height. Height is padding; the label is fixed.
- Don't use pure white or pure black. The paper's warmth and ink's near-black both carry through every surface and every text color.
- Don't reach for rust outside a tag, a dot, or a thin underline — it's a spice, not a base.
- Don't add hover lift or shadow pop to cards. The paper metaphor means things stay flat on the page; shadow is reserved for things genuinely floating above it (dialogs, dropdowns).

## Motion

Minimal and functional only: 150-200ms ease on hover/focus states, a single on-load moment where the journal page's ruled lines draw in left-to-right (the one orchestrated flourish).
No scroll-triggered reveals, no hover lift/shadow on cards — the paper metaphor means things stay flat on the page.

Exception: deliberate click-feedback animation (e.g. a ripple) is allowed on interactive controls, to confirm a click landed.
This is scoped narrowly to that purpose — it doesn't reopen hover lift, shadow pop, or scroll-triggered motion elsewhere, which stay off the table.
Respect `prefers-reduced-motion` per the accessibility floor below.

## Accessibility Floor

- All interactive elements have a visible focus ring (`{colors.moss}`, 2px, offset).
- Text contrast: `{colors.ink}` on `{colors.paper}` and `{colors.paperCard}` both exceed 4.5:1.
- `prefers-reduced-motion` disables the ruled-line draw-in and all transitions.
- Mood marks carry a text label on hover/focus, not color alone.

## Files

- `demo.html` — standalone static demo (open directly in a browser, no build step) covering the Journal page and the Research Catalog, with buttons, inputs, and selects per this spec.
- `client/src/theme.ts` — the Chakra implementation of this spec: `textStyles.pageTitle` through `textStyles.label` are the six typography tokens above, and the `button`/`text`/`heading` recipes consume them so no component defines its own font size.
