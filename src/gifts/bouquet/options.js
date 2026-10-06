/*
 * Everything a bouquet can be made of. The artwork, the builder and link
 * validation all read from here, so adding an option is a one-place change.
 *
 * A flower in a saved bouquet is stored as "kind:color" (e.g. "lily:pink").
 * A bare "kind" means its first colour, which keeps older links working.
 */

export const MAX_FLOWERS = 14

// [id, label, base hex]: shading for each flower is derived from the base colour.
export const FLOWERS = [
  {
    kind: 'rose',
    label: 'Rose',
    plural: 'roses',
    colors: [
      ['red', 'Red', '#b5473f'],
      ['pink', 'Pink', '#e48f98'],
      ['peach', 'Peach', '#efac85'],
      ['white', 'White', '#f4ece2'],
      ['burgundy', 'Burgundy', '#7a2934'],
    ],
  },
  {
    kind: 'peony',
    label: 'Peony',
    plural: 'peonies',
    colors: [
      ['blush', 'Blush', '#eeb3ad'],
      ['coral', 'Coral', '#ee9282'],
      ['white', 'White', '#f6eee8'],
      ['magenta', 'Magenta', '#c95b8a'],
    ],
  },
  {
    kind: 'lily',
    label: 'Lily',
    plural: 'lilies',
    colors: [
      ['white', 'White', '#fbf6ee'],
      ['pink', 'Stargazer', '#e58aa6'],
      ['orange', 'Orange', '#f0a04f'],
      ['yellow', 'Yellow', '#f3d36b'],
    ],
  },
  {
    kind: 'hydrangea',
    label: 'Hydrangea',
    plural: 'hydrangeas',
    colors: [
      ['blue', 'Blue', '#8ea7d8'],
      ['lilac', 'Lilac', '#b49fd6'],
      ['pink', 'Pink', '#e9a7c2'],
      ['white', 'White', '#eef0ee'],
    ],
  },
  {
    kind: 'carnation',
    label: 'Carnation',
    plural: 'carnations',
    colors: [
      ['pink', 'Pink', '#ec9fb0'],
      ['red', 'Red', '#c43c44'],
      ['white', 'White', '#f7f1ea'],
      ['coral', 'Coral', '#f09a7e'],
    ],
  },
  {
    kind: 'tulip',
    label: 'Tulip',
    plural: 'tulips',
    colors: [
      ['coral', 'Coral', '#e0877c'],
      ['yellow', 'Yellow', '#efc35a'],
      ['purple', 'Purple', '#9a78bf'],
      ['white', 'White', '#f5efe6'],
      ['red', 'Red', '#c2433b'],
    ],
  },
  {
    kind: 'daisy',
    label: 'Daisy',
    plural: 'daisies',
    colors: [
      ['white', 'White', '#fffaf1'],
      ['pink', 'Pink', '#f2b8c6'],
    ],
  },
  {
    kind: 'gypsophila',
    label: 'Gypsophila',
    plural: 'gypsophila',
    colors: [
      ['white', 'White', '#fbf8f1'],
      ['pink', 'Pink', '#f2c9d3'],
    ],
  },
  { kind: 'lavender', label: 'Lavender', plural: 'lavender', colors: [['purple', 'Purple', '#8f7bb8']] },
  { kind: 'sprig', label: 'Eucalyptus', plural: 'eucalyptus', colors: [['green', 'Green', '#9fb58f']] },
]

const an = (word) => `${/^[aeiou]/i.test(word) ? 'an' : 'a'} ${word}`

export const WRAP_STYLES = [
  { id: 'cone', label: 'Classic cone', phrase: (p) => `in ${an(p)} paper cone` },
  { id: 'layered', label: 'Layered paper', phrase: (p) => `wrapped in layered ${p} paper` },
  { id: 'handtied', label: 'Hand-tied', phrase: (_, r) => `hand-tied with a ${r} ribbon` },
  { id: 'vase', label: 'Glass vase', phrase: () => 'in a glass vase' },
  { id: 'hatbox', label: 'Hat box', phrase: (p) => `in ${an(p)} hat box` },
]

export const PAPERS = [
  ['kraft', 'Kraft', '#c9a27e'],
  ['blush', 'Blush', '#f0cfc7'],
  ['cream', 'Cream', '#f4ebdf'],
  ['sage', 'Sage', '#b9c7a8'],
  ['lilac', 'Lilac', '#cfc2e0'],
  ['ink', 'Ink', '#3b3034'],
]

export const RIBBONS = [
  ['rouge', 'Rouge', '#b5473f'],
  ['wine', 'Wine', '#7d2a35'],
  ['blush', 'Blush', '#e8a9a2'],
  ['gold', 'Gold', '#c9a24f'],
  ['sage', 'Sage', '#7f9a6c'],
  ['cream', 'Cream', '#f6efe4'],
  ['ink', 'Ink', '#2f2629'],
]

/* Which colour pickers matter for each style. */
export const usesPaper = (style) => style !== 'handtied'

const flowerDef = (kind) => FLOWERS.find((f) => f.kind === kind)

/* "lily:pink" → { kind, color, hex, def }, or null if unknown. */
export function parseFlower(value) {
  if (typeof value !== 'string') return null
  const [kind, color] = value.split(':')
  const def = flowerDef(kind)
  if (!def) return null
  const entry = def.colors.find((c) => c[0] === color) || def.colors[0]
  return { kind, color: entry[0], colorLabel: entry[1], hex: entry[2], def }
}

export const hexOf = (list, id) => (list.find((x) => x[0] === id) || list[0])[2]
export const labelOf = (list, id) => (list.find((x) => x[0] === id) || list[0])[1]

/* Mix a hex colour toward black (amount < 0) or white (amount > 0). */
export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16)
  const target = amount < 0 ? 0 : 255
  const t = Math.abs(amount)
  const mix = (c) => Math.round(c + (target - c) * t)
  const r = mix(n >> 16)
  const g = mix((n >> 8) & 255)
  const b = mix(n & 255)
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`
}
