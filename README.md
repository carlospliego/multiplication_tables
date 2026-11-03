# Times Table Rocket

A small times-table game for an 8-year-old, built as an installable web app (PWA). It works offline once it has loaded, needs no account, and collects no data.

## What the game is

Your child flies a rocket around a map of the times tables. Each table is a short mission of quick questions. The game keeps track of which facts are solid and which are shaky, and brings the shaky ones back more often, so practice stays on what actually needs it.

## How to play daily

About 10 minutes a day is plenty.

1. Open the app from the Home Screen.
2. Do today's mission (the game picks what to practise).
3. Stop when the mission is done. A little every day beats a long session once a week.

## Putting it on the iPad

Once the site is live (see "Deploying"):

1. Open https://carlospliego.github.io/multiplication_tables/ in **Safari**.
2. Tap **Share**, then **Add to Home Screen**, then **Add**.
3. Open it once while online so it can save itself for offline use.

## Progress and backups

Progress is saved **only on that device and browser**. There is no cloud copy. Clearing Safari website data, or using a different device, starts from zero.

To back up or move progress, open the **Grown-ups** area. A parent gate asks a two-digit multiplication question first.

- **Export progress** saves a backup file.
- **Import a save file** loads one, for example on a new iPad.

## Reset

In the Grown-ups area, the **Reset** section clears all progress after you type the confirmation word. This cannot be undone, so export a backup first if in doubt.

## Development

Needs Node 22 or newer.

```
npm install
npm run dev     # local dev server
npm test        # unit tests
npm run e2e     # browser tests (Playwright; needs browsers installed)
npm run build   # type-check and production build into dist/
npm run icons   # regenerate the app icons
```

## Deploying

Deployment is automatic through GitHub Actions (`.github/workflows/deploy.yml`).

1. In the repository on GitHub, go to **Settings, then Pages**, and set **Source** to **GitHub Actions**.
2. Push to `main`. The workflow runs lint and tests, builds with the `/multiplication_tables/` base path, and publishes.
3. The app appears at https://carlospliego.github.io/multiplication_tables/.

You can also run the workflow by hand from the **Actions** tab.
