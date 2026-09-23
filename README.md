# v for googli

An unnecessarily elaborate, zero-euro Valentine gift built for one very specific person.

It starts with flowers, escalates into a mildly rigged slot machine, hides a letter behind a definitely-not-bank-grade vault, and eventually asks the important question.

**Live site:** [dilcetto.github.io/v-for-googli](https://dilcetto.github.io/v-for-googli/)

## What is inside

- a flower-language bouquet builder with shareable gift links
- a three-reel slot machine with hold buttons, prizes, and an unwinnable LEGO set
- a password-gated memory letter
- a final Valentine question with a suspiciously evasive “no” button
- petals, glassy clouds, floating-island energy, and no external libraries

## Run it locally

This is a plain HTML/CSS/JavaScript site. There is no build step and nothing to install.

```bash
git clone https://github.com/dilcetto/v-for-googli.git
cd v-for-googli
python3 -m http.server 8000
```

Open [http://localhost:8000](http://localhost:8000).

VS Code Live Server or any equivalent static server works too. Opening `index.html` directly may limit clipboard and sharing behavior because browsers treat `file://` pages differently.

## Project structure

```text
.
├── index.html   # scenes, letter, and page structure
├── styles.css   # dreamy glass-cloud styling and responsive layout
└── app.js       # bouquet, slot machine, vault, sharing, and navigation
```

## Customizing it

The project is intentionally simple enough to remix without a framework:

- edit flower definitions and poem lines in `app.js`
- edit the pre-made bouquet in `DANA_TO_HIM_BOUQUET`
- edit the slot symbols and result copy in the Scene 2 section of `app.js`
- edit the memory letter in Scene 3 of `index.html`
- edit the vault password in the Scene 3 section of `app.js`
- adjust the palette and glass effects through the variables at the top of `styles.css`

### A tiny but important privacy note

The vault is a cute interaction, not real security. Its password and letter live in client-side source code and are visible to anyone who inspects the public repository or page. Do not put actual secrets, private credentials, or sensitive personal information in it.

## Sharing bouquets

Bouquets are encoded into a `?gift=` query parameter. No bouquet data is sent to a server or database; the link itself contains the flower selection.

Progress is stored in the browser with `localStorage`, so returning visitors may reopen at their latest unlocked scene. The Restart button clears that saved progress.

## Deploying with GitHub Pages

1. Open the repository’s **Settings → Pages**.
2. Under **Build and deployment**, choose **Deploy from a branch**.
3. Select the `main` branch and the `/ (root)` folder.
4. Save and wait for GitHub Pages to publish the site.

Because the project uses relative asset paths, it works from the repository subpath without extra configuration.

## Browser support

The experience targets current versions of Chrome, Safari, Firefox, and Edge. Clipboard and native sharing features depend on browser support and are most reliable over `https://` or `localhost`.

## License

The code is available under the [MIT License](LICENSE). The project may be reused and remixed, but please replace the personal letter and relationship-specific copy with your own before publishing a fork. That would be less weird for everyone.
