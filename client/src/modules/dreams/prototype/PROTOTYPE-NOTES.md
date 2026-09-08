# Prototype verdict notes (Dream Analysis UI, issues #48/#49)

PROTOTYPE - throwaway branch.
These notes capture the decisions validated by the prototype so they can be folded into the real implementation and recorded on the issues.

## Winner

Variant A, "Marginalia": read-only manuscript column with margin notes aligned to anchors, analysis passes in a section below the text.

## Decisions called out by the user (2026-09-08)

1. **The dream is read-only during analysis.**
   This changes the original approach where the dream stayed editable even on the analysis page.
   The dream gets its own separate edit page; analysis and interpretation happen on a page where the narrative text cannot be edited.
   This affects issue #47's editable-tiptap-on-analysis approach and should be surfaced to that work.
2. **The floating selection toolbar becomes an atom.**
   The popup that appears over a text selection (offering "+ Emotional beat", "+ Symbol", "+ Analytic note") was well liked.
   Commonly called a floating selection toolbar or bubble menu (Tiptap's name).
   Promote it to `client/src/atoms/` as a reusable atom with configurable actions, positioned from a selection rect.
3. **"Readings" is named "Analysis", and Analytic/Synthetic are separate views.**
   The two pass types are inherently separate; only one is shown at a time (tab-style toggle), each with its own list and composer.
   Analytic passes keep the optional anchor picker; synthetic passes are always whole-dream.
4. **Symbols are not buttons.**
   The filled-pill styling read as a clickable action.
   New direction: a "specimen label" - mono small-caps in ink-blue with a dotted underline, no fill, no border radius.
   (A leading ✦ glyph was tried and dropped: at mono label size it renders like a "+" and reads as an add button.)
