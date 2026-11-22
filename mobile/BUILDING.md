# Building OMNIVARA for Android

## Prerequisites
- An Expo account linked to the project in `mobile/app.json`.
- An Expo access token stored in GitHub repository secrets as `EXPO_TOKEN`.

## Build an installable APK
1. Open the GitHub repository settings.
2. Go to **Secrets and variables → Actions**.
3. Create a repository secret named `EXPO_TOKEN` using an Expo access token.
4. Open **Actions → Android APK Build → Run workflow** (or push a change under `mobile/`).
5. Wait for EAS Build to finish. Open the build URL in the job log to download the APK.

The `preview` profile in `eas.json` is configured for an Android APK. The `production` profile creates an Android App Bundle (AAB), normally used for Play Store distribution.

## Local build commands
```bash
cd mobile
npm install
npx eas-cli@latest build --platform android --profile preview
```

## API configuration
Set `EXPO_PUBLIC_API_URL` to the HTTPS URL of the deployed OMNIVARA API before building. Do not put API secrets in this public client variable.

## Voice features
The app requests microphone access for speech input and uses Expo Speech for spoken replies. Test voice recognition on a physical Android device; emulator behavior and available Bengali speech services can vary.
