/**
 * Declarative reproduction: the same bug in the shape a real app hits it.
 *
 * The CameraFrameOutput is created by this component, which stays mounted,
 * while the <Camera> below it mounts and unmounts (a screen that is only
 * rendered while focused / in the foreground). Every <Camera> mount creates a
 * fresh CameraSession and configures it with the SAME output, and the unmount's
 * teardown (useCameraSession: `session.stop(); session.configure([])`) is
 * neither awaited nor followed by a `dispose()` — the old session is only
 * released once the JS GC collects the hybrid object.
 *
 * Ordering is what makes this crash, so the timings below are not arbitrary:
 * the unmount gap is short enough that the old session is still alive when the
 * new one adopts the output, and the GC is only forced once the new session is
 * running. Forcing it during the gap instead finalizes the old session while
 * the output still belongs to it, which is a clean teardown and never aborts.
 */
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet } from 'react-native';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  VisionCamera,
} from 'react-native-vision-camera';
import { forceGarbageCollection, FRAME_OUTPUT_OPTIONS, log } from './common';

// long enough for the new session to start and for the GC pass to finish
const MOUNTED_MS = 2000;
// short enough that the previous session has not been collected yet
const UNMOUNTED_MS = 1000;

const DeclarativeRepro: React.FC = () => {
  const device = useCameraDevice('back');
  const { hasPermission, requestPermission } = useCameraPermission();

  // hoisted: created once, outlives every <Camera> mount below
  const output = useMemo(
    () => VisionCamera.createFrameOutput(FRAME_OUTPUT_OPTIONS),
    [],
  );

  const [isCameraMounted, setIsCameraMounted] = useState(true);
  const cycle = useRef(0);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission, requestPermission]);

  useEffect(() => {
    const timeout = setTimeout(
      () => setIsCameraMounted(isMounted => !isMounted),
      isCameraMounted ? MOUNTED_MS : UNMOUNTED_MS,
    );

    return () => clearTimeout(timeout);
  }, [isCameraMounted]);

  // The new session now holds the output. Releasing the previous session at
  // this point is what hits -[AVCaptureOutput detachFromFigCaptureSession:].
  const onStarted = useCallback(() => {
    cycle.current += 1;
    log(`declarative: session #${cycle.current} running — forcing GC`);
    forceGarbageCollection();
  }, []);

  if (!device || !hasPermission) {
    return null;
  }

  return isCameraMounted ? (
    <Camera
      style={StyleSheet.absoluteFill}
      device={device}
      isActive
      outputs={[output]}
      onStarted={onStarted}
    />
  ) : null;
};

export default DeclarativeRepro;
