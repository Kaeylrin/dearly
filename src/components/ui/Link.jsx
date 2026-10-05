import { Link as RouterLink, useLocation } from 'react-router-dom'

/*
 * App-wide link. Going to another page animates with a view transition;
 * links within the same page (like /#gifts from the home page) skip the
 * transition and smooth-scroll instead (see app/useScrollManager).
 */
export default function Link({ to, viewTransition, ...rest }) {
  const { pathname } = useLocation()
  const target = typeof to === 'string' ? to.split(/[?#]/)[0] || pathname : (to.pathname ?? pathname)
  return <RouterLink to={to} viewTransition={viewTransition ?? target !== pathname} {...rest} />
}
