export const FLOWER_SLOTS = [
  [200, 182], [148, 204], [252, 202], [176, 140], [226, 142], [108, 166], [292, 164],
  [200, 104], [128, 244], [272, 244], [146, 108], [256, 106], [92, 214], [308, 212],
]

export function cleanPositions(value, count) {
  const used = new Set()
  return Array.from({ length: count }, (_, i) => {
    const candidate = value?.[i]
    const slot = Number.isInteger(candidate) && candidate >= 0 && candidate < FLOWER_SLOTS.length && !used.has(candidate)
      ? candidate : FLOWER_SLOTS.findIndex((_, index) => !used.has(index))
    used.add(slot)
    return slot
  })
}

export function placeFlower(positions, flowerIndex, slot) {
  const next = [...positions]
  const occupied = next.indexOf(slot)
  if (occupied !== -1) next[occupied] = next[flowerIndex]
  next[flowerIndex] = slot
  return next
}

export function shuffledPositions(count) {
  const slots = FLOWER_SLOTS.map((_, i) => i)
  for (let i = slots.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[slots[i], slots[j]] = [slots[j], slots[i]]
  }
  return slots.slice(0, count)
}
