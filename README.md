# Dice Roll

A dice-roller plugin for Supernote e-ink devices (Manta / Nomad). Type dice
notation, roll, and insert the result — as a number or as movable dice images —
straight into your note.

![Dice Roll after a roll](assets/screenshots/DiceRoll%20-%20First%20Roll.png)

## Installation

Download the latest `dice_roll.<version>.snplg` from
[`build/outputs/`](build/outputs/) and side-load it onto your device following
the r/Supernote_dev guide:
**[Welcome — here's your README](https://www.reddit.com/r/Supernote_dev/comments/1shdzjg/welcome_heres_your_readme/)**.

## What it does

- **Roll any dice notation** and see each die rendered as a 3D polyhedron, with
  the total below.
- **Insert into your note**:
  - *Insert Total* — drops the final number in the centre of the page.
  - *Insert Dice* — drops a single movable image of the rolled dice.
  - *Copy Total* — copies the number to the clipboard.
- **Net modifier** is shown as `dice ± modifier = total` and is never part of
  the inserted dice.
- **Keep / advantage**: keep-highest/lowest and advantage/disadvantage. Dropped
  dice are shown struck through and don't count or get inserted.
- **Black or white dice**: a global toggle, or per-die colour keywords.
- **Lasso to fill the input**: lasso a text box or handwriting and it becomes
  the notation (handwriting is OCR'd).
- **Animation** toggle for a quick roll animation.

## Screenshots

| Black dice | Inserted into a note |
| --- | --- |
| ![Black dice](assets/screenshots/DiceRoll%20-%20Black%20Dice.png) | ![Insert dice](assets/screenshots/Dice%20Roll%20-%20Insert%20Dice.png) |

## Notation & examples

| You type | What happens |
| --- | --- |
| `4d6` | Roll four six-sided dice |
| `d20` | One d20 (count defaults to 1) |
| `1d8+1d6` or `1d8, 1d6` | Combine groups (`+` and `,` both work) |
| `2d20+3-1` | Modifiers add up: shows `dice + 2 = total` |
| `4d6kh3` | Roll 4d6, **keep highest 3** (lowest struck out) |
| `2d20kl1` or `2d20kl` | **Keep lowest** (count after `kh`/`kl` defaults to 1) |
| `d20adv` / `d20dis` | **Advantage / disadvantage** (roll 2, keep best / worst) |
| `1d7`, `3d13` | Any die from **d2–d100** (no dedicated art → shown in a circle) |
| `1d12 hope, 1d12 fear` | Per-die colour: first **white**, second **black** |
| `4d6kh3 fear + 2` | Everything together: keep + colour + modifier |

**Colour keywords** (after a dice group): `white` / `light` / `hope` / `good`
make a die white; `black` / `dark` / `fear` / `bad` make it black. A keyword
overrides the global Black-dice toggle for that group; dice without a keyword
follow the toggle.

Out-of-range input is reported when you tap **Roll** (e.g. `d101`, or keeping
more dice than you rolled).

## Building from source

The plugin bundles a native module (`react-native-view-shot`), so the build
produces a native APK and **requires JDK 17**:

```sh
npm install
npm run gen:dice   # regenerate dice images (only after changing art/layout)
JAVA_HOME="/opt/homebrew/opt/openjdk@17/libexec/openjdk.jdk/Contents/Home" ./buildPlugin.sh
```

The packaged plugin is written to `build/outputs/dice_roll.<version>.snplg`.

### Releasing a new version

The build runs locally (the native build is too finicky for CI), so the built
`.snplg` is committed and a tag-triggered GitHub Action
([`.github/workflows/release.yml`](.github/workflows/release.yml)) attaches it
to a Release:

1. Bump the version in `package.json` and `PluginConfig.json`.
2. Build (above) — produces `build/outputs/dice_roll.<version>.snplg`.
3. Commit, tag, and push:
   ```sh
   git add -A
   git commit -m "Release vX.Y.Z"
   git tag vX.Y.Z
   git push origin main --tags
   ```

Pushing the tag triggers the workflow, which creates the `vX.Y.Z` Release and
uploads the matching `.snplg`. (The job fails fast if the artifact for that
version wasn't committed.)

## License

Licensed under the **GNU Affero General Public License v3.0** (AGPL-3.0). See
[LICENSE](LICENSE).
