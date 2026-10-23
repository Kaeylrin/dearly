import DocPage from './DocPage'

export default function Privacy() {
  return (
    <DocPage
      title="Privacy Policy"
      meta={
        <>
          Version 1.2.0 · Last updated: October 23, 2026
        </>
      }
      intro="Dearly is built to be used without an account. This policy explains what that does, and doesn’t, mean for your data."
    >
      <h2>What Dearly collects</h2>
      <p>
        <strong>When you create something:</strong>
      </p>
      <ul>
        <li>The content you enter (letter text, bouquet design, countdown date, and so on)</li>
        <li>If you choose to send by email, the recipient’s email address</li>
        <li>If you enable an opened notice, your email address and the first opening time</li>
        <li>If you allow replies, the recipient’s short messages and when they were sent</li>
        <li>An optional scheduled unlock time, entered in Manila time and stored as a UTC instant</li>
        <li>A randomly generated link that lets whoever has it view what you made</li>
      </ul>
      <p>
        <strong>Automatically, from anyone visiting the site:</strong>
      </p>
      <ul>
        <li>
          Basic technical data your browser sends to any website (such as IP address and browser type), used only for keeping the site
          running and secure
        </li>
        <li>A light-or-dark mode preference, stored in your browser only (not sent to Dearly’s servers)</li>
      </ul>
      <p>Dearly only asks for your name if you send by email (so she knows who it’s from), does not require a password, and does not build a profile of who you are.</p>

      <h2>What Dearly does not collect</h2>
      <ul>
        <li>No account credentials, because there are no accounts</li>
        <li>No payment information, since Dearly is free</li>
        <li>No tracking across other websites</li>
        <li>No selling or sharing of data with advertisers</li>
      </ul>

      <h2>How data is used</h2>
      <ul>
        <li>Content you create is stored so the shareable link works</li>
        <li>An email address you provide for sending a gift is used only to send that one email, nothing else</li>
        <li>Your sender email is stored only when you request an opened notice. Turning that option off removes it from the gift.</li>
        <li>The recipient sees a notice before triggering an opened email. Link previews and locked-screen visits do not trigger it. A forwarded link means an opening does not prove who viewed the gift.</li>
        <li>Replies are stored with the gift and visible through the sender’s private edit link. Anyone with the share link may reply if the sender enables this.</li>
        <li>Technical data is used only to operate and secure the site</li>
      </ul>

      <h2>How long data is kept</h2>
      <p>
        Gifts you create are kept so the link continues to work. There is currently no automatic deletion, since the point of several of
        these gift types (a letter, a memory timeline) is that someone can come back to them later. If you want something you made
        deleted, email <a className="text-link" href="mailto:dearly.giftsapp@gmail.com">dearly.giftsapp@gmail.com</a> with its link and it will be removed.
      </p>

      <p>Replies and opening records are kept with the gift until it is deleted. Email delivery records support abuse prevention; IP-based rate-limit records are temporary. Opened email delivery may be retried after a provider failure.</p>

      <h2>Who else sees your data</h2>
      <p>Dearly uses a small number of outside services to run:</p>
      <ul>
        <li>A hosting provider, to serve the website</li>
        <li>A database provider, to store gift content</li>
        <li>An email provider, if you choose to send a gift by email</li>
      </ul>
      <p>
        These providers process data on Dearly’s behalf and don’t use it for their own purposes. None of them are given more than what’s
        needed to perform their specific job (sending an email, storing a record).
      </p>

      <h2>Shareable links</h2>
      <p>
        Anyone with a gift’s link can view it. The link is a long, random string that isn’t guessable, but it isn’t a password either,
        treat it the way you’d treat any private link: don’t post it somewhere public if you don’t want it seen.
      </p>

      <h2>Your rights</h2>
      <p>
        Dearly is run by an individual developer in the Philippines and follows the Data Privacy Act of 2012 (Republic Act No. 10173). You
        can ask what data is held about a gift you made, ask for it to be corrected, or ask for it to be deleted, using the contact below.
      </p>

      <h2>Children’s privacy</h2>
      <p>Dearly isn’t directed at children and doesn’t knowingly collect data from anyone under 13.</p>

      <h2>Changes to this policy</h2>
      <p>If this policy changes in a meaningful way, the version number and date at the top of this document will be updated.</p>

      <h2>Contact</h2>
      <p>
        Questions about your data, or a request to see, correct or delete a gift: email <a className="text-link" href="mailto:dearly.giftsapp@gmail.com">dearly.giftsapp@gmail.com</a>. Include the gift’s link so it can be
        found.
      </p>
    </DocPage>
  )
}
