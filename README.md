# CometRow website

Marketing site for CometRow. Kept on its own `website` branch and folder, separate from the app.

```sh
npm install
npm run dev      # http://localhost:5180
npm run build    # static output in dist/
```

- Brand name and contact email: `src/brand.ts`. `CONTACT_EMAIL` stays empty until a monitored mailbox exists.
- No cookies, analytics or third-party requests: fonts are self-hosted via Fontsource.
- Design check: `npx impeccable detect http://localhost:5180`
