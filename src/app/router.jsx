import { createBrowserRouter } from 'react-router-dom'
import Root from './Root'
import SiteLayout from '../layouts/SiteLayout'
import GiftLayout from '../layouts/GiftLayout'
import Home from '../pages/home/Home'
import { Changelog, Privacy, Terms } from '../pages/legal'
import NotFound from '../pages/not-found/NotFound'
import { giftTypes, loadGift } from '../gifts/registry'

/*
 * Routes follow the PRD's information architecture:
 *   /                 landing page
 *   /:type/new        create a gift   (site chrome)
 *   /:type/:id        the shared link (recipient chrome)
 *   /privacy /terms /changelog
 *
 * Gift routes are lazy: the router loads the gift's code before the page
 * transition starts, and NavProgress shows if that takes a moment.
 */
const createRoutes = giftTypes.map((type) => ({
  path: `${type}/new`,
  lazy: async () => {
    const [{ default: CreatePage }, gift] = await Promise.all([import('../pages/create/CreatePage'), loadGift(type)])
    return { Component: () => <CreatePage key={type} gift={gift} /> }
  },
}))

const viewRoutes = giftTypes.map((type) => ({
  path: `${type}/:id`,
  lazy: async () => {
    const [{ default: ViewPage }, gift] = await Promise.all([import('../pages/view/ViewPage'), loadGift(type)])
    return { Component: () => <ViewPage gift={gift} /> }
  },
}))

export const router = createBrowserRouter([
  {
    element: <Root />,
    // The index.html splash stays up while the first route loads.
    HydrateFallback: () => null,
    children: [
      {
        element: <SiteLayout />,
        children: [
          { index: true, element: <Home /> },
          { path: 'privacy', element: <Privacy /> },
          { path: 'terms', element: <Terms /> },
          { path: 'changelog', element: <Changelog /> },
          ...createRoutes,
          { path: '*', element: <NotFound /> },
        ],
      },
      { element: <GiftLayout />, children: viewRoutes },
    ],
  },
])
