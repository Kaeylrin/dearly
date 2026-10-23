const occasions = [
  { id: 'anniversary', label: 'Anniversary', message: 'Another year of choosing you. My favourite part of our story is that we are still writing it.' },
  { id: 'birthday', label: 'Birthday', message: 'Happy birthday, my love. I hope this year brings you as much joy as you bring into my life.' },
  { id: 'apology', label: 'Apology', message: 'I am sorry for hurting you. You deserve to feel heard. I want to listen and do better, at your pace.' },
  { id: 'long-distance', label: 'Long distance', message: 'The miles between us do not change how much you mean to me. Until I can hold you again, keep this little piece of me.' },
]

export const occasionTemplates = {
  letter: occasions.map((o) => ({ ...o, data: { body: o.message, closing: 'With love,' } })),
  bouquet: occasions.map((o) => ({ ...o, data: { note: o.message } })),
}
