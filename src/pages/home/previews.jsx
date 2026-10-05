import BouquetArt from '../../gifts/bouquet/BouquetArt'

/* Small previews only where a picture says more than the sentence does. */
export const previews = {
  letter: (
    <span className="mini-letter" aria-hidden="true">
      <i />
      <i />
      <i />
    </span>
  ),
  bouquet: (
    <span className="mini-bouquet" aria-hidden="true">
      <BouquetArt flowers={['rose:red', 'hydrangea:blue', 'lily:white', 'carnation:pink', 'gypsophila:white']} decorative />
    </span>
  ),
  countdown: (
    <span className="mini-countdown" aria-hidden="true">
      <span>12</span>
      <i>d</i>
      <span>04</span>
      <i>h</i>
      <span>37</span>
      <i>m</i>
    </span>
  ),
  scratch: (
    <span className="mini-scratch" aria-hidden="true">
      you
    </span>
  ),
  reasons: (
    <span className="mini-reasons" aria-hidden="true">
      <span className="mini-slip mini-slip-back" />
      <span className="mini-slip">
        <b>No. 7</b>
        <i />
        <i />
      </span>
    </span>
  ),
  timeline: (
    <span className="mini-timeline" aria-hidden="true">
      {[78, 56, 68].map((w, i) => (
        <span key={i} className="mini-tl-row">
          <b />
          <i style={{ width: `${w}%` }} />
        </span>
      ))}
    </span>
  ),
  voice: (
    <span className="mini-voice" aria-hidden="true">
      <span className="mini-play" />
      <span className="mini-wave">
        {[40, 70, 100, 55, 85, 35, 65, 90, 50, 30].map((h, i) => (
          <i key={i} style={{ height: `${h}%` }} />
        ))}
      </span>
    </span>
  ),
  quiz: (
    <span className="mini-quiz" aria-hidden="true">
      {['A', 'B', 'C'].map((l) => (
        <span key={l} className={`mini-q${l === 'B' ? ' is-right' : ''}`}>
          <b>{l}</b>
          <i />
        </span>
      ))}
    </span>
  ),
}
