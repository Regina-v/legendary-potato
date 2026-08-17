/**
 * Two reproductions for the AVFoundation abort
 *
 *   Assertion failed: (figCaptureSession == _outputInternal->figCaptureSession),
 *   function -[AVCaptureOutput detachFromFigCaptureSession:]_block_invoke,
 *   file AVCaptureOutput.m, line 333.
 *
 * Both share one CameraFrameOutput between two CameraSessions; see
 * runImperativeRepro.ts and DeclarativeRepro.tsx.
 *
 * Progress is logged to the console with a [crash-repro] prefix.
 */
import React, { useCallback, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { log } from './common';
import DeclarativeRepro from './DeclarativeRepro';
import runImperativeRepro from './runImperativeRepro';

const CameraCrashRepro: React.FC = () => {
  const [isBusy, setIsBusy] = useState(false);
  const [isDeclarativeRunning, setIsDeclarativeRunning] = useState(false);

  const onImperativePress = useCallback(async () => {
    setIsBusy(true);
    try {
      await runImperativeRepro();
    } catch (error) {
      // a JS rejection is not the native abort we are after
      log(`threw ${String(error)}`);
    } finally {
      setIsBusy(false);
    }
  }, []);

  const onDeclarativePress = useCallback(() => {
    setIsDeclarativeRunning(isRunning => !isRunning);
  }, []);

  return (
    <View style={styles.container}>
      {isDeclarativeRunning && <DeclarativeRepro />}
      <Text style={styles.title}>
        react-native-vision-camera: shared output, two sessions
      </Text>
      <Pressable
        style={[styles.button, isBusy && styles.buttonDisabled]}
        disabled={isBusy || isDeclarativeRunning}
        onPress={onImperativePress}
      >
        <Text style={styles.buttonText}>1. Imperative: two sessions</Text>
      </Pressable>
      <Pressable
        style={[styles.button, isBusy && styles.buttonDisabled]}
        disabled={isBusy}
        onPress={onDeclarativePress}
      >
        <Text style={styles.buttonText}>
          {isDeclarativeRunning
            ? '2. Declarative: stop remounting'
            : '2. Declarative: remount <Camera>'}
        </Text>
      </Pressable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 8 },
  title: { color: 'white', fontSize: 16, fontWeight: '600' },
  button: { backgroundColor: '#8b1e1e', borderRadius: 6, padding: 12 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: 'white', fontSize: 14, textAlign: 'center' },
});

export default CameraCrashRepro;
