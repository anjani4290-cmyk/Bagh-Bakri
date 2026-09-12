# assets/

App-identity graphics that aren't part of the in-game UI: icons and app
store listing graphics. The game itself only needs `icon.png`
(referenced by `index.html` as the browser favicon) — everything else
here is for packaging/publishing.

Suggested contents once you create them:

```
assets/
├── icon.png                 512x512 - used as the web favicon
├── icon-1024.png             1024x1024 - Apple App Store icon
├── feature-graphic.png       1024x500  - Play Store banner
└── android/
    ├── icon-ldpi.png         36x36
    ├── icon-mdpi.png         48x48
    ├── icon-hdpi.png         72x72
    ├── icon-xhdpi.png        96x96
    ├── icon-xxhdpi.png       144x144
    └── icon-xxxhdpi.png      192x192
```

The `android/icon-*.png` paths above are exactly what `config.xml`
already references for the Cordova Android build, so if you name your
files that way and drop them in `assets/android/`, the build will pick
them up automatically.

**No image-editing skill required** — Canva.com has free templates for
all of these sizes. See the "ASSETS_NEEDED" guide (delivered alongside
this project) for a full walkthrough, including screenshot sizes for
both Play Store and App Store, and a ready-to-use privacy policy
template.
