# legendary-potato

react-native-vision-camera bug reproduction: sharing one `CameraFrameOutput`
between two `CameraSession`s aborts the app on iOS.

```
Assertion failed: (figCaptureSession == _outputInternal->figCaptureSession),
function -[AVCaptureOutput detachFromFigCaptureSession:]_block_invoke,
file AVCaptureOutput.m, line 333.
```

## Versions

- react-native 0.86.0 (new architecture, Hermes), plain `@react-native-community/cli init` template
- react-native-vision-camera 5.2.2
- react-native-nitro-modules 0.36.1, react-native-nitro-image 0.15.1

## Setup

```bash
npm install
```

```bash
cd ios && bundle install && bundle exec pod install
```

## Running

A **physical iOS device** is required — the simulator has no capture device, so
`session.configure(...)` never attaches a real `AVCaptureOutput`.

```bash
npx react-native run-ios --device
```

Grant camera access, then tap one of the two buttons and follow the
`[crash-repro]` log lines.

## 1. Raw code repro

[`src/runImperativeRepro.ts`](src/runImperativeRepro.ts) — no `<Camera>`, no
React, deterministic:

1. Creates session #1 with a new `CameraFrameOutput`, configures and starts it.
2. Tears session #1 down the way a `<Camera>` unmount does: `stop()`, then
   `configure([])`.
3. Creates session #2 and configures it with the **same** output.
4. Releases session #1 (`dispose()`, then allocation pressure to force the
   Hermes GC to finalize the hybrid object).

Step 4 is where it aborts: `-[AVCaptureSession dealloc]` detaches an output
whose `figCaptureSession` is by then session #2's.

## 2. `<Camera>` repro

[`src/DeclarativeRepro.tsx`](src/DeclarativeRepro.tsx) — the same bug but closer to as we experience it in our app. The `CameraFrameOutput` is created in a hook (as `useBarcodeScannerOutput`)
that stays mounted, while the `<Camera>` below it is remounted every two
seconds, as happens on a screen that only renders while focused and in the
foreground. Every mount creates a fresh `CameraSession` and configures it with
the same output, and the unmount's teardown is not awaited.

This one depends on GC timing, so it can take several remount cycles.

Moving the `createFrameOutput` call below the conditional — into a child
rendered together with the `<Camera>` — makes the crash go away, which is both
our workaround and the proof of the cause.
