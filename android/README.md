# android/

This folder is a placeholder. The real native Android project (Gradle
files, `AndroidManifest.xml`, generated Java/Kotlin glue code, etc.) is
**generated automatically by Cordova** — it isn't something you hand-write
or hand-edit, and it isn't included in this source tree.

## How to generate it

From the project root:

```bash
npm install -g cordova
cordova create cordova-shell com.yourname.baghbakri "Bagh Bakri"
cd cordova-shell
cp -r ../index.html ../src ../assets ../images ../sounds ../lib www/
cordova platform add android
cordova build android --release
```

This will create a full `platforms/android/` folder inside `cordova-shell/`
with everything needed to open in Android Studio or build an APK/AAB from
the command line.

See `../README.md` for the complete step-by-step publishing instructions
(signing the APK, uploading to Google Play, etc.).

## Why keep an empty `android/` folder here at all?

So the project layout matches what you'll get once you generate the
platform — and as a reminder for anyone cloning the repo that Android
support is one `cordova platform add android` away, not something
missing from the game itself.
