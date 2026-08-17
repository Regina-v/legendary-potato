/**
 * Imperative reproduction: one CameraFrameOutput, two CameraSessions, no
 * <Camera> and no React involved.
 *
 * The first session is torn down the way a <Camera> unmount tears it down
 * (stop() + configure([])) before the second session adopts the output, and is
 * only then released. Releasing it destroys the underlying AVCaptureSession on
 * whatever thread dropped the last reference, and its dealloc detaches an
 * output that by then belongs to the second session:
 *
 *   Assertion failed: (figCaptureSession == _outputInternal->figCaptureSession),
 *   function -[AVCaptureOutput detachFromFigCaptureSession:]_block_invoke,
 *   file AVCaptureOutput.m, line 333.
 */
import {
  VisionCamera,
  type CameraFrameOutput,
  type CameraSession,
} from 'react-native-vision-camera';
import {
  delay,
  forceGarbageCollection,
  FRAME_OUTPUT_OPTIONS,
  log,
} from './common';

/**
 * Configures a session with a real AVCaptureOutput and starts it. An output is
 * required: a preview layer alone is not an AVCaptureOutput, so dealloc would
 * have nothing to detach and would not hit the assertion.
 */
const startSession = async (
  output: CameraFrameOutput,
): Promise<CameraSession> => {
  const session = await VisionCamera.createCameraSession(false);
  await session.configure([
    {
      input: 'back',
      outputs: [{ output, mirrorMode: 'auto' }],
      constraints: [],
    },
  ]);
  await session.start();
  // let the capture pipeline actually run before it is torn down again
  await delay(500);

  return session;
};

const runImperativeRepro = async () => {
  if (!(await VisionCamera.requestCameraPermission())) {
    log('camera permission denied — grant it and retry');

    return;
  }

  const output = VisionCamera.createFrameOutput(FRAME_OUTPUT_OPTIONS);

  log('session #1: configure + start');
  const first = await startSession(output);

  log('session #1: stop + configure([])');
  await first.stop();
  await first.configure([]);

  log('session #2: configure + start with the SAME output');
  const second = await startSession(output);

  log('session #1: dispose, then allocate to make the GC finalize it');
  first.dispose();
  await forceGarbageCollection();
  await delay(5_000);

  log('SURVIVED (no crash)');
  await second.stop();
  second.dispose();
};

export default runImperativeRepro;
