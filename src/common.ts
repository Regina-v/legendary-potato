export const FRAME_OUTPUT_OPTIONS = {
  targetResolution: { width: 1280, height: 720 },
  enablePreviewSizedOutputBuffers: true,
  allowDeferredStart: false,
  pixelFormat: 'yuv',
  enablePhysicalBufferRotation: false,
  enableCameraMatrixDelivery: false,
  dropFramesWhileBusy: true,
} as const;

export const log = (line: string) => console.log(`[crash-repro] ${line}`);

export const delay = (ms: number) =>
  new Promise<void>(resolve => {
    setTimeout(resolve, ms);
  });

/**
 * Allocates throwaway objects to make the Hermes GC finalize the hybrid objects
 * that were released earlier. The abort happens in the finalizer, not in
 * dispose(), so without this the app usually survives.
 */
export const forceGarbageCollection = async () => {
  for (let index = 0; index < 200; index++) {
    const garbage = new Array(50_000).fill(index);
    if (garbage.length !== 50_000) {
      throw new Error('unreachable');
    }
    if (index % 25 === 0) {
      await delay(50);
    }
  }
};
