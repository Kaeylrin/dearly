import Link from '../../components/ui/Link'
import DocPage from './DocPage'

export default function Terms() {
  return (
    <DocPage
      title="Terms and Conditions"
      meta={
        <>
          Version 1.1.0 · Last updated: October 6, 2026
        </>
      }
      intro="By using Dearly, you agree to these terms. If you don’t agree, please don’t use the site."
    >
      <h2>What Dearly is</h2>
      <p>
        Dearly is a free website for creating and sharing personal digital gifts (letters, bouquets, countdowns, and similar). It doesn’t
        require an account to use.
      </p>

      <h2>Using Dearly</h2>
      <ul>
        <li>You’re responsible for what you create and send through Dearly</li>
        <li>Don’t use Dearly to send anything illegal, harassing, hateful, or intended to harm someone</li>
        <li>Don’t attempt to abuse, overload, or break the service (for example, mass-creating gifts to spam the system)</li>
        <li>Only email a gift to someone you know and who would want to receive it, and don’t use the email option for advertising or bulk messages</li>
        <li>Dearly is intended for personal, non-commercial use</li>
      </ul>

      <h2>Content ownership</h2>
      <p>
        What you write or create using Dearly is yours. Dearly doesn’t claim ownership over your letters, bouquets, or any other content
        you make. Dearly needs to store that content to make the shareable link work, but storing it isn’t the same as owning it.
      </p>

      <h2>No warranty</h2>
      <p>
        Dearly is provided as-is, built and maintained as a personal project. There’s no guarantee it will be available at all times, free
        of bugs, or maintained indefinitely. Features described as planned may change or be delayed.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        Dearly is a free personal project, not a commercial service with support guarantees. To the extent permitted by law, Dearly and its
        creator aren’t liable for any loss or damage arising from your use of the site, including lost content, missed messages, or
        service downtime.
      </p>

      <h2>Availability and changes</h2>
      <p>
        Dearly may be updated, changed, or discontinued at any time, with or without notice. Significant changes will be noted in the{' '}
        <Link to="/changelog" className="text-link">
          changelogs
        </Link>{' '}
        where practical.
      </p>

      <h2>Shareable links</h2>
      <p>
        A gift’s link is the access control. Anyone who has the link can view the gift. You’re responsible for who you share that link
        with.
      </p>

      <h2>Governing law</h2>
      <p>
        Dearly is made and run by an individual developer based in the Philippines. These terms are governed by the laws of the Republic
        of the Philippines. Any dispute about Dearly or these terms will be handled by the proper courts of the Philippines.
      </p>
      <p>
        Nothing in these terms takes away rights you have under the consumer or data protection laws of the place where you live, where
        those laws can’t be set aside by an agreement like this one.
      </p>

      <h2>Changes to these terms</h2>
      <p>If these terms change meaningfully, the version number and date at the top of this document will be updated.</p>

      <h2>Contact</h2>
      <p>
        Questions about these terms, or to report a gift that breaks them: email <a className="text-link" href="mailto:dearly.giftsapp@gmail.com">dearly.giftsapp@gmail.com</a>.
      </p>
    </DocPage>
  )
}
