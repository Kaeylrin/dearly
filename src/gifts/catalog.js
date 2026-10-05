/* The eight gift types, in the order the landing page lists them. Copy is from the reference design. */
export const catalog = [
  {
    type: 'letter',
    title: 'A letter',
    blurb: "Write what you'd say if you had the words. She opens it as a page made just for her.",
  },
  {
    type: 'bouquet',
    title: 'A bouquet',
    blurb: 'Build flowers that never wilt. Save as an image, or send it straight to her inbox.',
  },
  {
    type: 'countdown',
    title: 'A countdown',
    blurb: 'Until your next monthsary, or any date worth waiting for. Just the truth, ticking down.',
  },
  {
    type: 'scratch',
    title: 'A scratch card',
    blurb: 'Hide a message underneath. She has to reveal it herself, a little at a time.',
  },
  {
    type: 'reasons',
    title: 'Reasons why',
    blurb: 'Keep a running list of why you love her. She gets one at a time, and can look back on the rest.',
  },
  {
    type: 'timeline',
    title: 'A memory timeline',
    blurb: 'Dates, photos, and short notes, laid out in order. A small history of the two of you.',
  },
  {
    type: 'voice',
    title: 'A voice note',
    blurb: 'Say it out loud instead. Attach a short recording to a letter or any other gift.',
  },
  {
    type: 'quiz',
    title: 'A little quiz',
    blurb: 'How well does she know you, really? A playful set of questions, just for fun.',
  },
]

export const catalogByType = Object.fromEntries(catalog.map((g) => [g.type, g]))
