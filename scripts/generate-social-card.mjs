import { chromium } from '@playwright/test'
import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const logo = (await readFile(new URL('../public/brand/wordmark-light.png', import.meta.url))).toString('base64')
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 })
  await page.setContent(`<!doctype html><html><style>
    *{box-sizing:border-box}body{margin:0;width:1200px;height:630px;background:#faf4ee;color:#241c22;font-family:Georgia,serif;overflow:hidden}
    .border{position:absolute;inset:28px;border:1px solid #e3d5c9;border-radius:8px}.copy{position:absolute;left:90px;top:62px;width:620px}
    img{width:190px;height:92px;object-fit:contain;object-position:left}h1{font-size:70px;line-height:1.12;font-weight:400;letter-spacing:-3px;margin:40px 0 24px}
    em{color:#b5473f;background:#f2ddd8;padding:0 8px}p{font:22px Arial,sans-serif;color:#6b5f63;line-height:1.5}
    .card{position:absolute;right:94px;top:150px;width:300px;height:360px;background:#fffcf8;transform:rotate(9deg);border:1px solid #e3d5c9;box-shadow:0 20px 50px #241c2214;border-radius:6px;padding:36px}
    .heart{font-size:84px;color:#b5473f;text-align:center;margin:0 0 26px}.line{height:2px;background:#e3d5c9;margin:19px 0}.short{width:66%}.label{font:italic 22px Georgia;color:#6b5f63}
    .dot{position:absolute;border-radius:50%;background:#f2ddd8;width:240px;height:240px;right:45px;top:90px;opacity:.7}
  </style><body><div class="border"></div><div class="dot"></div><div class="copy"><img src="data:image/png;base64,${logo}"/><h1>A little gift.<br>A lot of <em>heart.</em></h1><p>Someone made you something.<br>Open your surprise on Dearly.</p></div><div class="card"><div class="heart">♥</div><div class="label">Just for you,</div><div class="line"></div><div class="line"></div><div class="line short"></div></div></body></html>`)
  await page.screenshot({ path: fileURLToPath(new URL('../public/social-card.png', import.meta.url)) })
} finally { await browser.close() }
