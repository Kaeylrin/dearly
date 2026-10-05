import DocPage from './DocPage'

export default function Changelog() {
  return (
    <DocPage title="Changelogs">
      <section className="release">
        <h2>
          v1.0.0 <span className="release-tag">current</span>
        </h2>
        <ul>
          <li>
            Landing page built: asymmetric hero with a letter mockup, flowing list of all eight gift types, sticky nav with light/dark mode
            toggle
          </li>
          <li>Logo integrated</li>
          <li>Footer added: Changelog, Privacy Policy, Terms and Conditions, version number, and creator credit</li>
          <li>PRD, implementation plan, privacy policy, and terms and conditions written</li>
        </ul>
      </section>
    </DocPage>
  )
}
