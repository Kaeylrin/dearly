import { useEffect } from 'react'
import { Outlet } from 'react-router-dom'
import NavProgress from '../components/ui/NavProgress'
import { dismissSplash } from '../lib/splash'
import { useScrollManager } from './useScrollManager'

/* Wraps every route: scroll behaviour, the loading bar, and lifting the first-load splash. */
export default function Root() {
  useScrollManager()

  useEffect(() => {
    dismissSplash()
  }, [])

  return (
    <>
      <NavProgress />
      <Outlet />
    </>
  )
}
