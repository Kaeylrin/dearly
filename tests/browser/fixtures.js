import { test as base, expect } from '@playwright/test'

export const test = base.extend({
  page: async ({ page }, providePage) => {
    const errors = []
    page.on('pageerror', (err) => errors.push(err.message))
    page.on('console', (message) => {
      if (message.type() === 'error' && !message.text().startsWith('Failed to load resource:')) errors.push(message.text())
    })
    // Keep tests offline and independent of Google's font service.
    await page.route('https://fonts.googleapis.com/**', (route) => route.fulfill({ contentType: 'text/css', body: '' }))
    await providePage(page)
    expect(errors, 'Unexpected browser runtime errors').toEqual([])
  },
})
export { expect }
