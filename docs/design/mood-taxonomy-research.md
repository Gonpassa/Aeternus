# Mood Taxonomy Research

**Date:** 2026-08-20
**Git commit:** `e3bd2fc`
**Branch:** `main`
**Status:** Research note, not a decision. No ADR has been written from this yet.

## Question

Is Aeternus's Phase 4a mood model - a two-tier taxonomy with exactly five primary moods (`happy`, `calm`, `sad`, `anxious`, `angry`), each carrying four suggested specific emotions - well grounded in established emotion psychology, or should it be adjusted or restructured?

## Why this file lives here

This note isn't itself a resolved decision, so it doesn't belong in `docs/adr/` yet - ADRs record decisions already made, not open research questions.
`docs/design/` already owns the mood vocabulary's visual half (`design-system.md` lines 86-100 define the five mood-mark colors), so the conceptual half belongs next to it.
If a decision comes out of this note, that decision should be recorded as the next sequential `docs/adr/NNNN-mood-taxonomy.md` and this file should become its background reference.

## What the repo actually does today

| Concern | Where | Behaviour |
|---|---|---|
| Primary mood type | `packages/shared-types/src/index.ts:28` | `'happy' \| 'calm' \| 'sad' \| 'anxious' \| 'angry'` |
| Secondary tier | `packages/shared-types/src/index.ts:32-38` | `MOOD_TAXONOMY`, 4 suggested words per primary |
| Persistence | `backend/src/db/schema.ts:24,35` | Postgres enum `primary_mood`, column `NOT NULL` |
| Server validation | `backend/src/modules/journal/validation.ts:14,31` | Primary mood required; specific emotion optional free text |
| Picker UI | `client/src/modules/journal/components/MoodPicker/MoodPicker.tsx:92-127` | Radiogroup of 5 swatches, then a pill row plus a "Custom" text input |
| Form gate | `client/src/modules/journal/components/EntryForm/EntryForm.tsx:89-91` | Blocks submit with "Please choose a mood." |
| Colors | `client/src/modules/journal/moodColors.ts:3-25`, `docs/design/design-system.md:89-100` | rust / moss / ink-blue / `#B98A2E` / `#7A2E1E` |

Two behaviours matter for the evaluation below.

1. **Mood is mandatory.** There is no `neutral` value, no "skip", and `MoodPicker` has no way to deselect once a swatch is clicked (`handlePrimaryMoodClick` only ever emits a mood, never `null`). `CONTEXT.md:16` states this as intent: "required on every entry".
2. **The second tier is already open.** The `optional-custom-mood` change (see git history, pre-superpowers-removal: `docs/superpowers/specs/2026-08-11-optional-custom-mood-design.md:15,24`) demoted `SpecificEmotion` to `string` and dropped taxonomy validation, so tier two is suggestions plus free text. Only tier one is a closed set.

The original rationale is in git history, pre-superpowers-removal (`docs/superpowers/specs/2026-08-11-phase4a-journal-entries-design.md:33`), which cites Gloria Willcox's Feeling Wheel and How We Feel as the models, and explicitly rejects a flat "happy/neutral/sad" enum as a grab-all.
That is where `neutral` was dropped: it was never in the shipped taxonomy, it was the strawman the two-tier design argued against.

## 1. Discrete / basic emotion theories

Paul Ekman's own site lists **seven** universal emotions: anger, contempt, disgust, enjoyment, fear, sadness, surprise ([Paul Ekman Group, Universal Emotions](https://www.paulekman.com/universal-emotions/)).
The site states he initially identified six (anger, surprise, disgust, enjoyment, fear, sadness) and later found "the strongest evidence to date of a seventh emotion, which is contempt".
It also notes that most emotion scientists agree on at least five core emotions, and - importantly for a two-tier design - that "emotions are comprised of a family of related emotional states" rather than being single points.
That family framing is the strongest published support for the primary/secondary split as a *shape*, independent of which primaries you choose.

Robert Plutchik's psychoevolutionary theory posits **eight** basic emotions arranged as four bipolar pairs: joy/sadness, trust/disgust, fear/anger, surprise/anticipation ([Plutchik, R. (2001). The Nature of Emotions. *American Scientist*, 89, 344-350](https://www.scirp.org/reference/referencespapers?referenceid=3549928)).
Each is rendered at three intensity levels on the wheel, and adjacent primaries combine into named dyads (joy + trust = love).
Plutchik's wheel is therefore genuinely two-tier in two different senses at once: intensity within a primary, and blending across primaries.

Gloria Willcox's Feeling Wheel - the source the Phase 4a spec actually cites - is a therapy tool rather than an empirical model. It has an inner ring of core feelings (sad, mad, scared, joyful, powerful, peaceful) and two outer rings of progressively more specific words ([Willcox, G. (1982). The Feeling Wheel. *Transactional Analysis Journal*, 12(4), 274-276](https://journals.sagepub.com/doi/10.1177/036215378201200411)).
Note that Willcox's inner ring is six, not five, and includes `powerful`, an agency/dominance term with no analogue in this repo's set.

Two counterweights are worth recording so the note is not one-sided.

- Cowen and Keltner found that **27** distinct categories, not six, were needed to account for reported feeling across 2,185 emotion-eliciting videos, and that those categories are bridged by continuous gradients rather than discrete boundaries ([Cowen & Keltner, 2017, *PNAS* 114(38): E7900-E7909](https://www.pnas.org/doi/abs/10.1073/pnas.1702247114)). Any small closed primary set is a deliberate lossy compression, and should be defended as a UX decision rather than as psychological truth.
- Lisa Feldman Barrett argues the natural-kind view of emotion is inconsistent with the evidence and may be "an error of arbitrary aggregation" ([Barrett, L.F. (2006). Are Emotions Natural Kinds? *Perspectives on Psychological Science*, 1(1), 28-58](https://journals.sagepub.com/doi/10.1111/j.1745-6916.2006.00003.x)). This is the strongest argument *against* letting named-emotion buckets be the load-bearing primary tier at all.

## 2. Dimensional models

James Russell's circumplex places affect words in a circle over two bipolar axes: pleasure-displeasure (horizontal) and arousal-sleepiness (vertical) ([Russell, J.A. (1980). A circumplex model of affect. *Journal of Personality and Social Psychology*, 39(6), 1161-1178](https://www.semanticscholar.org/paper/9bb28869d9808b12273c42229c2d1aa564e5bac8)).
The eight reference points sit at 45-degree intervals: pleasure (0), excitement (45), arousal (90), distress (135), displeasure (180), depression (225), sleepiness (270), relaxation (315).
The model has north of 15,000 citations and is the direct ancestor of most product mood grids.

Watson and Tellegen rotated Russell's circumplex 45 degrees and drew two new axes through the densest clusters, labelling them High Positive Affect and High Negative Affect ([Watson, D. & Tellegen, A. (1985). Toward a consensual structure of mood. *Psychological Bulletin*, 98(2), 219-235](https://pubmed.ncbi.nlm.nih.gov/3901060/)).
The practical consequence is that positive and negative affect behave as two semi-independent dimensions, not as two ends of one slider - which matters if you ever want a single "how was today" scalar.

Mehrabian and Russell's PAD model adds a third axis, dominance, to pleasure and arousal ([PAD emotional state model, from *An Approach to Environmental Psychology*, MIT Press, 1974](https://en.wikipedia.org/wiki/PAD_emotional_state_model)).
Dominance is what separates `angry` (high dominance) from `anxious`/`scared` (low dominance) when both are high-arousal-negative.
It is also what Willcox's `powerful` is capturing.
Almost no consumer mood app exposes dominance, and this repo does not either - but it is the reason `angry` and `anxious` feel like genuinely different moods despite occupying the same circumplex quadrant.

## 3. Two-tier taxonomies in shipped products

### How We Feel

First-party description: "a free app created by scientists, designers, engineers, and therapists", "Conceived in conjunction with Yale University's Center for Emotional Intelligence and based on the work of Dr Marc Brackett", with check-ins guided by "an elegant color-coded matrix" ([How We Feel on the App Store](https://apps.apple.com/us/app/how-we-feel/id1562706384)).
Brackett's own site confirms the lineage and the research basis: the app descends from the Mood Meter, which he describes as "built based on decades of research on the circumplex model of emotion", and the current version ships "an updated Mood Meter (now with 144 words!)" ([marcbrackett.com](https://marcbrackett.com/how-we-feel-app-3/)).

The Mood Meter itself, per Yale's RULER program materials, is a coordinate plane: the x axis is pleasantness (unpleasant left, pleasant right), the y axis is energy (high top, low bottom), producing four colored quadrants - yellow (high energy, pleasant), green (low energy, pleasant), red (high energy, unpleasant), blue (low energy, unpleasant) ([RULER Mood Meter Tip Sheet, rulerapproach.org](https://www.rulerapproach.org/wp-content/uploads/2023/03/Mood-Meter-Tip-Sheet.pdf)).

This is the single most important finding for this note. **How We Feel's primary tier is not named emotions at all. It is the four valence-by-energy quadrants.** Named emotions are entirely the second tier, and there are 144 of them.

### Apple Health "State of Mind" (iOS 17+)

Apple's own newsroom describes logging as: "Users can scroll through engaging, multidimensional shapes and choose how they are feeling in a range from Very Pleasant to Very Unpleasant", then "select associations that are having the biggest impact on their feelings, like Travel or Family, and describe their feelings, such as Grateful or Worried" ([Apple Newsroom, June 2023](https://www.apple.com/newsroom/2023/06/apple-provides-powerful-insights-into-new-areas-of-health/)).

The HealthKit API makes the structure exact. `HKStateOfMind` has a `kind` of either `momentaryEmotion` or `dailyMood`; a continuous `valence` from -1.0 to 1.0 whose classification buckets are Very Unpleasant, Unpleasant, Slightly Unpleasant, **Neutral**, Slightly Pleasant, Pleasant, Very Pleasant; and 38 `Label` cases including amazed, amused, angry, annoyed, anxious, ashamed, brave, calm, confident, content, disappointed, discouraged, disgusted, drained, embarrassed, excited, frustrated, grateful, guilty, happy, hopeful, hopeless, indifferent, irritated, jealous, joyful, lonely, overwhelmed, passionate, peaceful, proud, relieved, sad, satisfied, scared, stressed, surprised, worried ([HKStateOfMind.Label, Apple Developer Documentation](https://developer.apple.com/documentation/healthkit/hkstateofmind/label); enumeration walked through in [Exploring HealthKit: Working with State of Mind APIs](https://rudrank.com/exploring-healthkit-working-with-state-of-mind)).

So Apple's primary tier is a **single valence dimension with an explicit Neutral midpoint**, and its secondary tier is a flat 38-word list not nested under any parent. Arousal is not modelled.

### Daylio

Daylio ships five default mood levels (Rad, Good, Meh, Bad, Awful) and lets users create unlimited custom moods, but those custom moods "are saved under the 5 default mood categories" and appear nested beneath the main moods in the entry flow ([Daylio Knowledge Base: Create and manage moods](https://daylio.net/faq/docs/daylio-faq/tutorials/create-and-manage-moods/)).
Daylio's own guidance is to start with five, because "It's always better to start with 5 moods which will make flow simple and speedy".

Daylio's primary tier is therefore a **5-point ordinal valence scale with a neutral centre (Meh)**, and the second tier is user-defined.

### Pattern across all three

| Product | Primary tier | Neutral? | Secondary tier |
|---|---|---|---|
| How We Feel | 4 valence x energy quadrants | No explicit neutral | 144 emotion words |
| Apple Health | continuous valence, 7 buckets | Yes, explicit Neutral | 38 flat labels |
| Daylio | 5-point ordinal valence | Yes, "Meh" | user-defined, nested |
| **Aeternus** | **5 named emotions** | **No** | **4 suggestions + free text** |

Not one of the three shipped products uses named emotions as the primary tier.
All three use a dimension, and put the names in tier two.
Aeternus is the outlier in kind, not just in count.

## 4. Evaluating `happy, calm, sad, anxious, angry`

### Circumplex mapping

Plotting the five against Russell's pleasure/arousal axes:

| Mood | Valence | Arousal | Quadrant |
|---|---|---|---|
| happy | pleasant | high | high-energy pleasant (yellow) |
| calm | pleasant | low | low-energy pleasant (green) |
| sad | unpleasant | low | low-energy unpleasant (blue) |
| anxious | unpleasant | high | high-energy unpleasant (red) |
| angry | unpleasant | high | high-energy unpleasant (red) |

The set covers all four quadrants, which is better than a naive happy/sad/neutral scale.
But the coverage is lopsided: **three of five moods are unpleasant, and two of those five share the same quadrant.**
The high-energy-unpleasant corner gets two primaries; the two pleasant quadrants get one each.
Anyone whose day was genuinely good has one swatch to choose between "happy" and "calm"; anyone whose day was bad has three.
That skew will show up directly in the deferred insights/overview feature as an apparent negativity bias in the user's data that is really an artefact of the picker.

`angry` and `anxious` are separable, but the axis that separates them is PAD's **dominance**, not valence or arousal ([PAD model](https://en.wikipedia.org/wiki/PAD_emotional_state_model)).
That is defensible. It just is not the circumplex, and the design has not stated it as a principle.

### Coverage against the literature

Missing families that are well attested:

- **Disgust.** Present in Ekman's list, in Plutchik's eight, and in Apple's 38 labels. Absent here with no secondary word anywhere near it. Arguably low value for a personal journal, but its absence should be a stated choice.
- **Surprise.** In Ekman and Plutchik. Genuinely awkward for daily journaling because it is valence-ambiguous and momentary. Reasonable to omit.
- **Fear as distinct from anxiety.** The APA and the wider literature draw the line clearly: fear is "an appropriate, present-oriented, and short-lived response to a clearly identifiable and specific threat", while anxiety is future-oriented, longer-acting, and directed at a diffuse threat ([APA, Anxiety topic page](https://www.apa.org/topics/anxiety); [Classification and assessment of fear and anxiety, *Neuroscience & Biobehavioral Reviews*](https://www.sciencedirect.com/science/article/am/pii/S0149763422003670)). Apple carries both `anxious` and `scared`. For a once-a-day retrospective journal, `anxious` is the right one to keep, and dropping `fear` is defensible.
- **Low-arousal-negative beyond sadness.** `sad` is the only occupant of the blue quadrant, and its four suggestions (`lonely`, `disappointed`, `hurt`, `grieving`) are all grief-family. Nothing covers tiredness, flatness, drained-ness, boredom, or numbness, which are extremely common journal states. Apple covers this with `drained`, `discouraged`, `indifferent`, `hopeless`. This is the most real gap in the set.
- **Agency / powerful.** Willcox's inner ring includes `powerful`; Apple has `brave`, `confident`, `proud`. Aeternus has `proud` buried as a suggestion under `happy`. This is a defensible tier-two placement.

### The neutral question

Comparable apps split, but the two that use an ordinal or continuous primary scale both include a neutral midpoint: Daylio's "Meh" and Apple's explicit `Neutral` valence classification plus an `indifferent` label.
How We Feel does not have a neutral, but it does not need one - the centre of a 2D grid is reachable by construction.

Aeternus has neither.
Mood is required (`schema.ts:35`, `validation.ts:31`, `EntryForm.tsx:89`), there is no neutral swatch, and `MoodPicker` cannot deselect.
That combination means a user with a flat, unremarkable day must misreport.
They will pick `calm` (which the taxonomy defines as `peaceful`/`relaxed`/`relieved`/`secure`, all actively positive) or `sad` (defined as `lonely`/`hurt`/`grieving`, actively distressing).
Neither is true, and both corrupt the data the future insights feature will read.

There is also a UX cost independent of accuracy: a required field with no escape hatch is friction on the write path, and mood-tracking UX writing is consistent that friction on the daily check-in is what kills the habit.

Note the asymmetry this creates with the second tier, which was already made optional and free-text by the optional-custom-mood change.
Tier two trusts the user; tier one does not.

## 5. Recommendation

**Do not keep the five as-is. Adjust rather than restructure - but restructure the *rationale*.**

I would not move to valence x arousal quadrants as the visible primary tier, despite that being what How We Feel does.
Aeternus's design language is explicitly literary and anti-clinical (`design-system.md:87`: a filled dot "instead of an emoji - keeps the journal's tone literary rather than cute").
A 2D affect grid is a clinical instrument and would read as an imported product pattern, not as this notebook.
Named moods with hand-mixed pigment colors are the right surface for this product.

The fix is to make the named set *derive* from the circumplex rather than merely coexist with it.

### Concrete changes

1. **Add a sixth primary: a low-arousal-negative / depleted bucket.**
   Name it `drained` or `low`.
   Suggestions: `tired`, `flat`, `discouraged`, `numb`.
   This closes the largest real gap, and it relieves `sad` of having to absorb every non-grief bad day. Precedent: Apple's `drained`/`discouraged`/`indifferent`.

2. **Add a neutral primary, or make mood optional. Prefer the former.**
   A seventh swatch, `steady` or `neutral`, in `--ink-soft` (the design system already names ink-soft as a mood-mark color at line 87 but no mood currently uses it).
   Rationale for a bucket over an optional field: an explicit neutral is *data* ("today was unremarkable"), whereas a skipped field is *absence of data*, and the two are not interchangeable for a future insights view. Daylio's "Meh" and Apple's `Neutral` are both explicit values, not skips.
   If instead you make mood optional, the change is: nullable enum column, drop the `EntryForm.tsx:89` gate, and add deselect-on-reclick to `handlePrimaryMoodClick`. That is the cheaper change but the weaker one.

3. **Rebalance the pleasant side.**
   With six or seven primaries, two pleasant to three unpleasant plus neutral is acceptable.
   If you would rather stay smaller, an alternative is merging `anxious` and `angry` into one high-energy-unpleasant primary and letting the second tier separate them - but I do not recommend this, because the dominance distinction between them is real and users feel it strongly.

4. **Fill the tier-two gaps without expanding tier one.**
   Add `hopeful` and `amused` under `happy`; add `bored` and `restless` somewhere sensible.
   Tier two is already free text, so this is purely about better defaults, and it is the cheapest lever available.

5. **Write down the axis rationale.**
   Add a short section to `CONTEXT.md` (or the eventual ADR) stating: the primary tier is a deliberate small basis spanning valence x arousal, with dominance separating `angry` from `anxious`, and this is a UX compression, not a claim about emotion ontology.
   Cite Cowen and Keltner and Barrett as the reason the compression is acknowledged as lossy.
   Without this, the next person to touch the set has nothing to argue against.

### Cost

Adding primaries is a Postgres enum change (`primaryMoodEnum`, `backend/src/db/schema.ts:24`), which needs a migration, plus new tokens in `moodColors.ts`, `design-system.md`, and the theme.
Adding values to a Postgres enum is additive and non-breaking for existing rows.
Nothing already stored has to move.
Roughly half a day of work, most of it picking two more colors that survive next to rust, moss, and ink-blue without muddying the palette.

### Open questions

- [ ] Six primaries or seven (does `neutral` earn a swatch)? This decides whether the picker row still fits on one line on mobile.
- [ ] Are two more distinct pigments available in the palette without weakening the "rust is a spice" rule (`design-system.md:25`)?
- [ ] Should the deferred insights feature aggregate by primary mood, or by a derived valence/arousal score? If the latter, the primaries need a static valence/arousal annotation in `shared-types`, which is a small addition worth making now.

## Sources

- [Paul Ekman Group, Universal Emotions](https://www.paulekman.com/universal-emotions/)
- [Plutchik, R. (2001). The Nature of Emotions. *American Scientist*, 89, 344-350](https://www.scirp.org/reference/referencespapers?referenceid=3549928)
- [Willcox, G. (1982). The Feeling Wheel. *Transactional Analysis Journal*, 12(4)](https://journals.sagepub.com/doi/10.1177/036215378201200411)
- [Russell, J.A. (1980). A circumplex model of affect. *JPSP*, 39(6), 1161-1178](https://www.semanticscholar.org/paper/9bb28869d9808b12273c42229c2d1aa564e5bac8)
- [Watson, D. & Tellegen, A. (1985). Toward a consensual structure of mood. *Psychological Bulletin*, 98(2)](https://pubmed.ncbi.nlm.nih.gov/3901060/)
- [PAD emotional state model (Mehrabian & Russell, 1974)](https://en.wikipedia.org/wiki/PAD_emotional_state_model)
- [Cowen & Keltner (2017). Self-report captures 27 distinct categories of emotion. *PNAS* 114(38)](https://www.pnas.org/doi/abs/10.1073/pnas.1702247114)
- [Barrett, L.F. (2006). Are Emotions Natural Kinds? *Perspectives on Psychological Science*, 1(1)](https://journals.sagepub.com/doi/10.1111/j.1745-6916.2006.00003.x)
- [How We Feel on the App Store](https://apps.apple.com/us/app/how-we-feel/id1562706384)
- [marcbrackett.com, How We Feel app](https://marcbrackett.com/how-we-feel-app-3/)
- [RULER Mood Meter Tip Sheet, rulerapproach.org](https://www.rulerapproach.org/wp-content/uploads/2023/03/Mood-Meter-Tip-Sheet.pdf)
- [Apple Newsroom, June 2023: powerful insights into new areas of health](https://www.apple.com/newsroom/2023/06/apple-provides-powerful-insights-into-new-areas-of-health/)
- [HKStateOfMind.Label, Apple Developer Documentation](https://developer.apple.com/documentation/healthkit/hkstateofmind/label)
- [Exploring HealthKit: Working with State of Mind APIs](https://rudrank.com/exploring-healthkit-working-with-state-of-mind)
- [Daylio Knowledge Base: Create and manage moods](https://daylio.net/faq/docs/daylio-faq/tutorials/create-and-manage-moods/)
- [APA, Anxiety](https://www.apa.org/topics/anxiety)
- [Classification and assessment of fear and anxiety, *Neurosci. Biobehav. Rev.*](https://www.sciencedirect.com/science/article/am/pii/S0149763422003670)
