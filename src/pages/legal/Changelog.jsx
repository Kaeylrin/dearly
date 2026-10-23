import DocPage from './DocPage'

/* Newest first. `groups` keeps each release scannable: what's new, what got better, what got fixed. */
const RELEASES = [
  {
    version: 'v1.2.0',
    date: '2026-10-23',
    summary: 'More personal gifts, with a little something coming back.',
    groups: [
      { label: 'New', items: [
        'Schedule any gift or bundle to unlock at a chosen Manila date and time, with a countdown while it waits',
        'Let recipients send a short reply or emoji; read replies through your private edit link',
        'Optional first-open email, off by default, with a clear notice for the recipient',
        'Place bouquet flowers by tapping a stem and a spot, or shuffle the arrangement',
        'Anniversary, birthday, apology and long-distance starters for letters and bouquet notes',
        'Combine two to eight existing gifts in one ordered bundle and share one link',
        'A Dearly image card when sharing links, without exposing private gift content',
      ] },
      { label: 'Security', items: [
        'The database withholds locked gift content until server time reaches the unlock time',
        'Atomic email limits: three attempts per gift or IP in three hours, with Copy link always available',
        'Sender email is stored only with opened-notice consent; replies have server-side limits',
      ] },
      { label: 'Improved', items: ['Native mouse-wheel scrolling for a quicker response, while keeping smooth section jumps and other animations', 'Daily database health check and retries for queued opened notices', 'Privacy policy updated for scheduling, sender emails and replies'] },
    ],
  },
  {
    version: 'v1.1.0',
    date: '2026-10-06',
    summary: 'Gifts are saved for real now, and you can email them straight to her.',
    groups: [
      {
        label: 'New',
        items: [
          'Gifts are saved to a database, so share links are short and work in any messaging app, photos and voice notes included',
          'Email it to her: send the gift straight to her inbox with your name and a short note, or copy the link yourself',
          'Edit links keep the same share link, so she always sees your latest version',
          'Floating cards on the home page that show what Dearly can make',
          'Smooth, eased scrolling with the mouse wheel and when jumping between sections',
        ],
      },
      {
        label: 'Improved',
        items: [
          'Soft highlighter style on key phrases across the site',
          'Form fields line up at the same height everywhere, side-by-side fields included',
          'Short gifts open in the middle of her screen, like a card being handed over',
          'Friendlier messages when a link is mistyped or the connection drops',
          'Terms and privacy policy updated: governing law (Philippines), using the email option, and your data rights',
        ],
      },
      {
        label: 'Fixed',
        items: ['Some fields in two-column rows sat lower than the field next to them'],
      },
      {
        label: 'Security',
        items: [
          'Limits on how often gifts can be created, edited, uploaded and emailed, to stop bots and spam',
          'Only the person with the edit link can change a gift or email it',
          'Uploads are checked for type and size',
          'Stricter browser security settings, and edit links never leak to other sites',
        ],
      },
    ],
  },
  {
    version: 'v1.0.0',
    date: '2026-09-28',
    summary: 'The first version of Dearly.',
    groups: [
      {
        label: 'New',
        items: [
          'Eight gifts to make: a letter, a bouquet, a countdown, a scratch card, reasons why, a memory timeline, a voice note and a little quiz',
          'Home page with a letter mockup, the full list of gifts, and a floating nav with light and dark mode',
          'Logo, footer with the changelog, privacy policy, terms and version number',
        ],
      },
    ],
  },
]

const formatDate = (iso) =>
  new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(new Date(iso))

export default function Changelog() {
  return (
    <DocPage title="Changelogs" intro="What changed in Dearly, and when.">
      <ol className="releases">
        {RELEASES.map((r, i) => (
          <li key={r.version} className="release">
            <div className="release-head">
              <h2>
                {r.version}
                {i === 0 && <span className="release-tag">current</span>}
              </h2>
              <time className="release-date" dateTime={r.date}>
                {formatDate(r.date)}
              </time>
            </div>
            <p className="release-summary">{r.summary}</p>
            {r.groups.map((g) => (
              <div key={g.label} className="release-group">
                <h3 className={`release-label release-label-${g.label.toLowerCase()}`}>{g.label}</h3>
                <ul>
                  {g.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ))}
          </li>
        ))}
      </ol>
    </DocPage>
  )
}
