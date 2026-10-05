import './Logo.css'

/* Both wordmarks are rendered; CSS shows the one that matches the theme, so there's no flash. */
export default function Logo({ className = '' }) {
  return (
    <span className={`logo ${className}`}>
      <img className="logo-img logo-for-light" src="/brand/wordmark-light.png" alt="Dearly" width="560" height="271" />
      <img className="logo-img logo-for-dark" src="/brand/wordmark-dark.png" alt="" aria-hidden="true" width="560" height="271" />
    </span>
  )
}
