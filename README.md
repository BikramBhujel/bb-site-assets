# bb-site-assets

Front-end motion for [bikrambhujel.com.np](https://www.bikrambhujel.com.np), loaded by the Blogger theme through jsDelivr.

| File | What it does |
|---|---|
| `bb-motion.css` | Styles for the effects below, light and dark (`html[data-theme]`), reduced-motion fallbacks |
| `bb-motion.js` | Dot grid behind the homepage hero, card and tool-tile spotlight, hire-button sheen, count-up figures; on posts and pages: content and card grids reveal on scroll, an animated image pop-up, the rail pop-up's contents cascade, and the mobile menu slides open |

The letter-by-letter name intro is split by a tiny inline script in the theme itself, because it has to run before the first paint.

## How the theme loads it

```html
<link href='https://cdn.jsdelivr.net/gh/BikramBhujel/bb-site-assets@v1.1.0/bb-motion.css' rel='stylesheet'/>
<script defer='defer' src='https://cdn.jsdelivr.net/gh/BikramBhujel/bb-site-assets@v1.1.0/bb-motion.js'></script>
```

Always link a version tag. To ship a change: edit, commit, tag a new version (`v1.0.1`), then change the tag in the theme.

## Credits

The effects are plain JavaScript ports of [React Bits](https://github.com/DavidHDev/react-bits) components (DotGrid, BlurText, SpotlightCard, ShinyText, CountUp) by David Haz, used under its MIT + Commons Clause license. No React is shipped.
