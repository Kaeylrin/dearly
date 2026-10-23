// Global styles first, so component styles (imported by the router's modules) can override them.
import './styles/index.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'

// Browsers without view transitions get a CSS entrance on each page instead.
if (!document.startViewTransition) document.documentElement.classList.add('no-vt')

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
