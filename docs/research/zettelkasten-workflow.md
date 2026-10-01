# Zettelkasten workflow, from primary sources

What do the primary sources prescribe for the workflow from reading to Literature note to Permanent note, and which of those prescriptions should the Notes module encode as guidance for its user?

Sources, in order of authority: Luhmann's "Kommunikation mit Zettelkästen" in [English translation](https://luhmann.surge.sh/communicating-with-slip-boxes); Sönke Ahrens, _How to Take Smart Notes_; the first-party [zettelkasten.de](https://zettelkasten.de) articles by Christian Tietze and Sascha Fast.
The book text was not accessible to me directly, so every Ahrens passage is quoted from a page that reproduces it verbatim and I name that page; none is from memory.
Vocabulary follows issue #65's map. These findings were captured before the module was specified; the `## Notes` section of `CONTEXT.md` is now the authority on the terms, and where the two disagree the glossary wins.

## 1. What a Literature note should contain

Ahrens gives the format directly: bibliographic details on one side, brief notes on the content on the other, which "should be very short, extremely selective, and use your own words" ([Sloww](https://www.sloww.co/how-to-take-smart-notes/), quoting the book's overview section).
The canonical shape is "On page x, it says y" (Sloww) - a claim, attached to a place in a Source.
The selection rule: "Write down what you don't want to forget or think you might use in your own thinking or writing" ([excerpts at rufuspollock.com](https://rufuspollock.com/2020/04/01/ahrens-how-to-take-smart-notes/)).

On copying he is explicit: "Be extra selective with quotes - don't copy them to skip the step of really understanding what they mean" (rufuspollock.com).
So "in your own words" is a comprehension test, not paraphrase by word-substitution.
The check is downstream: "If we try to fool ourselves here... we will detect it in the next step when we try to turn our literature notes into permanent notes" ([Andy Matuschak's notes](https://notes.andymatuschak.org/How_to_Take_Smart_Notes_-_Ahrens)).
zettelkasten.de allows one exception: "write it in your own words. There is nothing wrong with capturing a verbatim quote on top" ([Introduction](https://zettelkasten.de/introduction/)).

No source gives a word count; both give a physical bound instead, one index card, one side, which renders honestly as "a few sentences on one point" rather than a character limit.
What it should not contain is the user's own conclusions: "Collecting information does not increase your knowledge" ([Getting Started](https://zettelkasten.de/overview/)).

## 2. When and how Permanent notes get written

The review sitting is prescribed, with a deadline.
Ahrens: "Go through the notes you made in step one or two (ideally once a day and before you forget what you meant) and think about how they relate to what is relevant for your own... thinking or interests" (rufuspollock.com).
Then: "Write exactly one note for each idea and write as if you were writing for someone else: Use full sentences, disclose your sources, make references and try to be as precise, clear and brief as possible" (rufuspollock.com).

"One idea per note" is a property of the written note, not of the source material.
zettelkasten.de's Principle of Atomicity limits "each Zettel to one thought each" so the system "will assist you in thinking instead of just assisting in creating excerpts" (Introduction); the practical test is "Put things which belong together in a Zettel, but try to separate concerns from one another" ([Create Zettel from Reading Notes](https://zettelkasten.de/posts/create-zettel-from-reading-notes/)).

No source sets a quota per sitting.
Ahrens' much-cited figure is descriptive, not prescriptive - Luhmann's roughly 90,000 slips average about six a day over a career - and Tietze's worked example of a book read in one sitting produced about seven primary Zettel plus a few connecting ones (Create Zettel from Reading Notes).
Single digits per session is the order of magnitude, and the module should not push for more.

A note is judged ready by whether it connects.
Ahrens' last step is to add it to the slip-box by filing it near related notes, linking it, and making sure it can be found again (Sloww).
Luhmann is blunter, and this is the strongest primary warrant for Aeternus's link requirement: "Every note is only an element which receives its quality only from the network of links and back-links within the system. A note that is not connected to this network will get lost in the card file and will be forgotten by it" ([Luhmann, section III](https://luhmann.surge.sh/communicating-with-slip-boxes)).

## 3. How links are chosen, and whether a reason is required

Luhmann describes linking mechanically and says nothing about justifying a link.
He notes only that fixed numbers mean "you can add as many references to them as you may want", and that you should be "right away recording back links in the slips that are being linked to" (section II), with the side effect that "the content that we take note of is usually also enriched".
So: no stated reason, but reciprocal links and deliberate connection-making.

Ahrens treats link-making as the thinking itself, "making good cross-references is a matter of serious thinking and a crucial part of the development of thoughts" (Andy Matuschak's notes), but I found no passage requiring a written justification.

zettelkasten.de does require one: "To make the most of a connection, always state explicitly why you made it. This is the link context", and "If you just add links without any explanation you will not create knowledge" (Introduction).
That is the clearest of the three prescriptions and the one worth encoding: a Link should carry a short reason, asked for at the moment of linking rather than later.

## 4. Topics, keywords, indexes, and finding notes again

Luhmann rejected topic hierarchy at the root, deciding "against the systematic ordering in accordance with topics and sub-topics" because a content-based system "would mean that we make a decision that would bind us to a certain order for decades in advance" (section II).
Aeternus's "Topics are tags, never folders" is faithful, not a departure.

He replaced it with something, though: "we must regulate the process of rediscovery of notes, for we cannot rely on our memory of numbers... Therefore we need a register of keywords that we constantly update" (section III).
Ahrens adds that the register is meant to be thin: Luhmann "would add the number of one or two (rarely more) notes next to a keyword", and keywords are "assigned with an eye towards the topics you are working on or interested in, never by looking at the note in isolation" (rufuspollock.com).
A keyword points at an entry-point note that links onward; it is not a bucket holding every relevant note.

Sascha Fast names the failure mode a tag field invites: broad topic tags return "a buttload of notes. Some don't even contain the word 'diet' apart from the tag" ([The Difference Between Good and Bad Tags](https://zettelkasten.de/posts/object-tags-vs-topic-tags/)).
His fix is object tags: tag a note only when it is _about_ that thing, not when it merely touches it.

Gained by the swap: no index to maintain, and full-text search covers the lookup case the register was invented for.
Lost: the discipline of few keywords per note, and the entry-point note that gave a topic a curated front door.
The mitigation is guidance rather than structure - prompt for a Topic only where it is what the note is about, and keep the vocabulary controlled-but-growing the way Symbol already is.

## 5. Rereading and retention

Primary-source claims.
Ahrens states that "the best-researched and most successful learning method is elaboration" ([Goodreads](https://www.goodreads.com/author/quotes/14876464.S_nke_Ahrens?page=7)), meaning "really thinking about the meaning of what we read... how it could be combined with other knowledge" (Sloww), and that information "Learned right, which means understanding, which means connecting in a meaningful way to previous knowledge... almost cannot be forgotten anymore" (Goodreads).
Rereading and highlighting he treats as illusions of competence, because rereading never confronts you with what you have not yet learned ([Sloww](https://www.sloww.co/how-to-take-smart-notes/), [markwk.com](https://www.markwk.com/smart-notes.html)).
Luhmann's only remark here is that the box is "a kind of secondary memory... an alter ego with who we can constantly communicate", used by posing questions to it rather than retrieving from it (section III).

My synthesis, separated.
The method delivers elaboration well and retrieval practice barely: writing a Literature note closed-book is a retrieval attempt, and the only one in the workflow, since everything after it is elaboration and connection.
Spacing is absent entirely - the one-day deadline is about not forgetting what you meant, not a review schedule.
That is the gap the later AI quiz fills, so the data model should let a quiz target a single Permanent note and its Links.
The module should not add spaced review now, nor claim the box produces retention on its own.

## Departures Aeternus has already made

Faithful: Topics as tags; Literature note bound to Source and Locator; Permanent note as the user's own idea with no Source; the link requirement on save, which is Luhmann's warning turned into a constraint.
The departures, all defensible:

- **Folgezettel rejected.** zettelkasten.de agrees it is not a principle: it "came as a consequence of him having to deal with a physical Zettelkasten" ([Luhmann's Folgezettel](https://zettelkasten.de/posts/luhmann-folgezettel-truth/)). Nothing lost.
- **Keyword register rejected.** A real departure from Luhmann, section III. Lost: the curated entry point per topic. Mitigated by search plus tag discipline.
- **Untitled Literature notes.** No source requires a title, and the "On page x, it says y" shape implies none.
- **Titles as full-sentence claims.** Stronger than Ahrens, who asks only for full sentences, and a good strengthening: a title that will not state as a claim signals more than one idea in the note.
- **Learning, not writing output.** Both sources orient the box toward producing text. Dropping that removes the method's own forcing function for quality, so the link requirement and the quiz carry more weight here than in the original.

## Process for every note saved

1. Read a little, with a pen, and stop at the first thing worth keeping.
2. Open the Source you are reading, or create it, and record the Locator you have reached.
3. Write the Literature note closed-book, in your own words: if you cannot say it without looking, reread the passage rather than copy it.
4. Keep it to a few sentences on a single point, and quote only where the author's exact wording is itself the thing you need.
5. Save it and go back to reading; do not stop to connect it to anything yet.
6. Come back within a day, before you forget what you meant, and reread that session's Literature notes.
7. Ask of each one what it means for what you already think, and what it supports, contradicts, or complicates.
8. Write a Permanent note only where you have something of your own to say, titled as a full-sentence claim and written for a reader who has not read the Source.
9. Give it exactly one idea: if the title needs an "and", it is two notes.
10. Link it to at least one existing note, saying in the Link's reason why they belong together, add Topics only for what the note is actually about, and if nothing links, the idea is not ready yet.

Step 10's reason is no longer guidance in Aeternus: #69 made it a required field written at the moment of linking, and ADR 0015 records why. The rest of the process above remains guidance.
