import { forwardRef } from 'react'
import { MAX_FLOWERS, PAPERS, RIBBONS, WRAP_STYLES, hexOf, labelOf, parseFlower, shade } from './options'

/* ---------- flower heads: drawn around (0, 0), roughly 30px radius ---------- */

const STEM = '#6f8a5e'
const LEAF = '#93ab83'
const LEAF_LIGHT = '#a9bf98'

function Rose({ c }) {
  return (
    <g>
      <circle r="27" fill={shade(c, -0.16)} />
      <circle r="21" fill={c} />
      <path
        d="M-14 2c0-10 8-16 16-14s12 10 8 17-14 8-18 1 2-12 8-12 7 5 4 8"
        fill="none"
        stroke={shade(c, -0.34)}
        strokeWidth="2.6"
        strokeLinecap="round"
      />
      <path d="M-22 6c4 12 18 18 30 12" fill="none" stroke={shade(c, 0.16)} strokeWidth="2.2" strokeLinecap="round" />
    </g>
  )
}

function Tulip({ c }) {
  return (
    <g>
      <path d="M-20-4C-22 20 22 20 20-4L13-24 5-10 0-29-5-10-13-24Z" fill={c} />
      <path d="M0-29-5-10C-6 4-3 14 0 17 3 14 6 4 5-10Z" fill={shade(c, -0.1)} />
      <path d="M-20-4C-18 10-8 17 0 17" fill="none" stroke={shade(c, -0.18)} strokeWidth="1.6" />
    </g>
  )
}

function Peony({ c }) {
  const petals = Array.from({ length: 9 }, (_, i) => (i * 360) / 9)
  const rad = (a) => (a * Math.PI) / 180
  return (
    <g>
      {petals.map((a) => (
        <circle key={a} cx={Math.cos(rad(a)) * 16} cy={Math.sin(rad(a)) * 16} r="13" fill={c} />
      ))}
      <circle r="17" fill={shade(c, 0.14)} />
      {petals.slice(0, 6).map((a) => (
        <circle key={a} cx={Math.cos(rad(a + 20)) * 8} cy={Math.sin(rad(a + 20)) * 8} r="7.5" fill={shade(c, -0.08)} />
      ))}
      <circle r="5" fill={shade(c, 0.32)} />
    </g>
  )
}

function Daisy({ c }) {
  const petals = Array.from({ length: 14 }, (_, i) => (i * 360) / 14)
  return (
    <g>
      {petals.map((a) => (
        <ellipse key={a} rx="5.6" ry="15" cy="-14" transform={`rotate(${a})`} fill={c} stroke={shade(c, -0.1)} strokeWidth="0.8" />
      ))}
      <circle r="8.5" fill="#e3a83f" />
      <circle r="8.5" fill="none" stroke="#c98f2c" strokeWidth="1.2" />
    </g>
  )
}

function Lavender({ c }) {
  return (
    <g>
      <path d="M0 22V-36" stroke={STEM} strokeWidth="2" />
      {Array.from({ length: 9 }, (_, i) => (
        <g key={i} transform={`translate(0 ${18 - i * 6.4})`}>
          <ellipse cx="-4" rx="4.2" ry="5.4" fill={c} transform="rotate(-20)" />
          <ellipse cx="4" rx="4.2" ry="5.4" fill={shade(c, 0.12)} transform="rotate(20)" />
        </g>
      ))}
    </g>
  )
}

function Sprig({ c }) {
  return (
    <g>
      <path d="M0 26V-38" stroke={STEM} strokeWidth="2" />
      {[-26, -12, 2, 16].map((y, i) => (
        <g key={y}>
          <ellipse cx="-9" cy={y} rx="8" ry="6" fill={i % 2 ? shade(c, -0.08) : c} />
          <ellipse cx="9" cy={y + 5} rx="8" ry="6" fill={i % 2 ? c : shade(c, -0.08)} />
        </g>
      ))}
      <ellipse cy="-38" rx="6" ry="5" fill={c} />
    </g>
  )
}

/* A dome of tiny four-petal florets. */
const HYDRANGEA_FLORETS = [
  [0, 0],
  ...Array.from({ length: 6 }, (_, i) => [Math.cos((i * Math.PI) / 3) * 10.5, Math.sin((i * Math.PI) / 3) * 10.5]),
  ...Array.from({ length: 11 }, (_, i) => [Math.cos((i * 2 * Math.PI) / 11 + 0.3) * 21, Math.sin((i * 2 * Math.PI) / 11 + 0.3) * 21]),
]

function Hydrangea({ c }) {
  return (
    <g>
      <circle r="28" fill={shade(c, -0.2)} />
      {HYDRANGEA_FLORETS.map(([x, y], i) => (
        <g key={i} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${(i * 23) % 90})`}>
          {[0, 90, 180, 270].map((a) => (
            <ellipse key={a} cy="-3.6" rx="3.1" ry="3.9" transform={`rotate(${a})`} fill={i % 3 ? c : shade(c, 0.14)} />
          ))}
          <circle r="1.1" fill={shade(c, -0.35)} />
        </g>
      ))}
    </g>
  )
}

/* Gypsophila (baby's breath): thin branching stems with clouds of tiny blooms. */
const GYPSO_TIPS = [
  [-22, -20], [-10, -33], [4, -37], [18, -25], [27, -9], [-27, -3], [10, -14], [-8, -13],
]

function Gypsophila({ c }) {
  return (
    <g>
      <g stroke="#7f9a6c" strokeWidth="1.1" fill="none" strokeLinecap="round">
        {GYPSO_TIPS.map(([x, y], i) => (
          <path key={i} d={`M0 24Q${x / 2} ${(y + 24) / 2 + 6} ${x} ${y}`} />
        ))}
      </g>
      {GYPSO_TIPS.map(([x, y], i) =>
        [[0, 0], [3.4, -2], [-3, -2.6], [1, 3.2], [-3.6, 2]].slice(0, 3 + (i % 3)).map(([dx, dy], j) => (
          <circle key={`${i}-${j}`} cx={x + dx} cy={y + dy} r="2.5" fill={c} stroke={shade(c, -0.14)} strokeWidth="0.5" />
        )),
      )}
    </g>
  )
}

/* Ruffled layers with a slightly irregular edge. */
function ruffle(r1, r2, n, offset = 0) {
  return Array.from({ length: n * 2 }, (_, i) => {
    const a = (i * Math.PI) / n + offset
    const r = (i % 2 ? r2 : r1) + (((i * 37) % 5) - 2) * 0.6
    return `${(Math.cos(a) * r).toFixed(1)},${(Math.sin(a) * r).toFixed(1)}`
  }).join(' ')
}

function Carnation({ c }) {
  return (
    <g>
      <path d="M-7 14 0 32 7 14Z" fill="#7f9a6c" />
      <polygon points={ruffle(27, 21, 22)} fill={shade(c, -0.14)} />
      <polygon points={ruffle(22, 16, 20, 0.15)} fill={c} />
      <polygon points={ruffle(15, 10, 16, 0.3)} fill={shade(c, 0.1)} />
      <polygon points={ruffle(8, 5, 12)} fill={shade(c, -0.06)} />
    </g>
  )
}

/* Six pointed petals; stargazer and orange lilies get freckles. */
function Lily({ c, color }) {
  const petal = 'M0 0C8-8 9-22 0-33C-9-22-8-8 0 0Z'
  const speckled = color === 'pink' || color === 'orange'
  return (
    <g>
      {[60, 180, 300, 0, 120, 240].map((a, i) => (
        <g key={a} transform={`rotate(${a}) scale(${i < 3 ? 0.9 : 1})`}>
          <path d={petal} fill={i < 3 ? shade(c, -0.06) : c} stroke={shade(c, -0.14)} strokeWidth="0.8" />
          <path d="M0-4V-26" stroke={shade(c, -0.22)} strokeWidth="1" opacity="0.6" />
          {speckled && [[2, -11], [-2.2, -15], [1.6, -19], [-1.4, -9]].map(([x, y]) => (
            <circle key={`${x}${y}`} cx={x} cy={y} r="0.9" fill={shade(c, -0.4)} />
          ))}
        </g>
      ))}
      <circle r="4" fill={shade(c, -0.08)} />
      {[30, 90, 150, 210, 270, 330].map((a) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d="M0 0V-14" stroke="#c7b46a" strokeWidth="0.9" />
          <ellipse cy="-14.5" rx="1.3" ry="2.4" fill="#a0522d" />
        </g>
      ))}
    </g>
  )
}

const HEADS = {
  rose: Rose,
  tulip: Tulip,
  peony: Peony,
  daisy: Daisy,
  lavender: Lavender,
  sprig: Sprig,
  hydrangea: Hydrangea,
  gypsophila: Gypsophila,
  carnation: Carnation,
  lily: Lily,
}

export function FlowerIcon({ value }) {
  const f = parseFlower(value)
  if (!f) return null
  const Head = HEADS[f.kind]
  return (
    <svg viewBox="-38 -44 76 80" aria-hidden="true" className="flower-icon">
      <Head c={f.hex} color={f.color} />
    </svg>
  )
}

/* ---------- arrangement ---------- */

/* Head positions, filled centre-out. */
const SLOTS = [
  [200, 182], [148, 204], [252, 202], [176, 140], [226, 142], [108, 166], [292, 164],
  [200, 104], [128, 244], [272, 244], [146, 108], [256, 106], [92, 214], [308, 212],
]

/* Where the stems meet, per wrap style. */
const GATHER = { cone: [200, 352], layered: [200, 352], handtied: [200, 332], vase: [200, 412], hatbox: [200, 320] }

function Bow({ x, y, color, scale = 1 }) {
  return (
    <g fill={color} transform={`translate(${x} ${y}) scale(${scale})`}>
      <path d="M0 0c-18-14-34-12-32-2s18 8 32 2Z" />
      <path d="M0 0c18-14 34-12 32-2s-18 8-32 2Z" />
      <path d="M-4 2-16 34-8 32-2 6ZM4 2 16 34 8 32 2 6Z" />
      <circle r="5" />
      <path d="M-30-4c4 4 10 5 16 3" fill="none" stroke="#000" strokeOpacity="0.12" strokeWidth="1.2" />
    </g>
  )
}

/* Each wrap style draws a layer behind the flowers and a layer in front of them. */
function wrapLayers(style, paper, ribbon) {
  const back = shade(paper, -0.12)
  switch (style) {
    case 'layered':
      return {
        back: (
          <g>
            <path d="M62 222 200 452 338 222 292 192 200 210 108 192Z" fill={back} />
            <path d="M80 232 200 452 320 232 270 214 200 226 130 214Z" fill={shade(paper, 0.45)} />
          </g>
        ),
        front: (
          <g>
            <path
              d="M100 262Q124 248 150 266Q175 250 200 268Q225 250 250 266Q276 248 300 262L200 454Z"
              fill={paper}
            />
            <path d="M100 262 200 454 150 266Q124 248 100 262Z" fill="#000" opacity="0.06" />
            <path d="M200 268 200 454" stroke="#000" strokeOpacity="0.07" strokeWidth="1.5" />
            <Bow x={200} y={352} color={ribbon} />
          </g>
        ),
      }
    case 'handtied':
      return {
        back: (
          <g stroke={STEM} strokeWidth="3" strokeLinecap="round">
            {[-10, -6, -2, 2, 6, 10].map((dx, i) => (
              <path key={dx} d={`M${200 + dx * 0.6} 332L${200 + dx * 1.7} 452`} stroke={i % 2 ? STEM : '#7f9a6c'} />
            ))}
          </g>
        ),
        front: (
          <g>
            <rect x="184" y="322" width="32" height="20" rx="4" fill={ribbon} />
            <path d="M184 328h32M184 336h32" stroke="#000" strokeOpacity="0.12" />
            <Bow x={200} y={332} color={ribbon} scale={0.9} />
          </g>
        ),
      }
    case 'vase':
      return {
        back: null,
        front: (
          <g>
            <path
              d="M168 292Q160 300 163 314Q112 360 132 428Q138 452 200 452Q262 452 268 428Q288 360 237 314Q240 300 232 292Z"
              fill={paper}
              fillOpacity="0.32"
              stroke={shade(paper, -0.25)}
              strokeOpacity="0.55"
              strokeWidth="2"
            />
            {/* water */}
            <path d="M139 372Q200 382 261 372Q270 404 262 428Q256 446 200 446Q144 446 138 428Q130 404 139 372Z" fill={paper} fillOpacity="0.22" />
            <path d="M150 340Q138 380 148 420" fill="none" stroke="#fff" strokeOpacity="0.45" strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="200" cy="292" rx="32" ry="6" fill="none" stroke={shade(paper, -0.25)} strokeOpacity="0.5" strokeWidth="2" />
            <Bow x={200} y={306} color={ribbon} scale={0.8} />
          </g>
        ),
      }
    case 'hatbox':
      return {
        back: <ellipse cx="200" cy="282" rx="118" ry="24" fill={shade(paper, -0.3)} />,
        front: (
          <g>
            <path d="M82 282Q200 306 318 282L310 438Q200 470 90 438Z" fill={paper} />
            <path d="M82 282Q200 306 318 282" fill="none" stroke={shade(paper, 0.25)} strokeWidth="3" />
            <path d="M90 438Q200 470 310 438" fill="none" stroke={shade(paper, -0.18)} strokeWidth="2" />
            <path d="M86 350Q200 376 314 350L313 368Q200 394 87 368Z" fill={ribbon} />
            <path d="M82 282 90 438Q120 450 150 455L140 296Q108 290 82 282Z" fill="#000" opacity="0.05" />
            {/* a shade deeper than the band, so the bow reads against it */}
            <Bow x={200} y={362} color={shade(ribbon, -0.16)} />
          </g>
        ),
      }
    default: // cone
      return {
        back: <path d="M86 236 200 448 314 236 268 214 200 230 132 214Z" fill={back} />,
        front: (
          <g>
            <path d="M96 252 200 452 304 252 252 270 200 258 148 270Z" fill={paper} />
            <path d="M96 252 200 452 148 270Z" fill="#000" opacity="0.06" />
            <path d="M200 258 200 452" stroke="#000" strokeOpacity="0.07" strokeWidth="1.5" />
            <Bow x={200} y={350} color={ribbon} />
          </g>
        ),
      }
  }
}

const BouquetArt = forwardRef(function BouquetArt(
  { flowers, wrap = 'cone', paper = 'kraft', ribbon = 'rouge', title, decorative = false, className = '' },
  ref,
) {
  const style = WRAP_STYLES.some((s) => s.id === wrap) ? wrap : 'cone'
  const [gx, gy] = GATHER[style]
  const items = flowers
    .slice(0, MAX_FLOWERS)
    .map(parseFlower)
    .filter(Boolean)
    .map((f, i) => ({ ...f, x: SLOTS[i][0], y: SLOTS[i][1], rot: ((i * 47) % 30) - 15 }))
  // Back rows (smaller y) are drawn first so front flowers overlap them.
  const byDepth = [...items].sort((a, b) => a.y - b.y)
  const layers = wrapLayers(style, hexOf(PAPERS, paper), hexOf(RIBBONS, ribbon))

  return (
    <svg
      ref={ref}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="40 40 320 420"
      className={`bouquet-art ${className}`}
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title || describe(items, style, paper, ribbon)}
    >
      {layers.back}

      {/* foliage that's always there, so even one flower looks held */}
      <g fill={LEAF}>
        <ellipse cx="128" cy="214" rx="26" ry="11" transform="rotate(-38 128 214)" />
        <ellipse cx="272" cy="212" rx="26" ry="11" transform="rotate(38 272 212)" />
        <ellipse cx="200" cy="224" rx="10" ry="24" fill={LEAF_LIGHT} />
      </g>

      <g stroke={STEM} strokeWidth="2.6" fill="none" strokeLinecap="round">
        {items.map((f, i) => (
          <path key={i} d={`M${f.x} ${f.y + 10}Q${(f.x + gx) / 2} ${(f.y + gy) / 2 + 20} ${gx} ${gy}`} />
        ))}
      </g>

      {byDepth.map((f, i) => {
        const Head = HEADS[f.kind]
        return (
          <g key={i} transform={`translate(${f.x} ${f.y}) rotate(${f.rot})`}>
            <Head c={f.hex} color={f.color} />
          </g>
        )
      })}

      {layers.front}
    </svg>
  )
})

function describe(items, style, paper, ribbon) {
  const wrapPhrase = WRAP_STYLES.find((s) => s.id === style).phrase(labelOf(PAPERS, paper).toLowerCase(), labelOf(RIBBONS, ribbon).toLowerCase())
  if (!items.length) return `An empty bouquet, ${wrapPhrase}`
  const counts = new Map()
  items.forEach((f) => {
    const key = `${f.kind}:${f.color}`
    counts.set(key, { f, n: (counts.get(key)?.n || 0) + 1 })
  })
  const parts = [...counts.values()].map(({ f, n }) => {
    const color = f.def.colors.length > 1 ? `${f.colorLabel.toLowerCase()} ` : ''
    return `${n} ${color}${n > 1 ? f.def.plural : f.def.label.toLowerCase()}`
  })
  return `A bouquet of ${parts.join(', ')}, ${wrapPhrase}`
}

export default BouquetArt
