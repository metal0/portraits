import type { FaceLandmarks, FacePoint } from "@/core/types";

type FaceApi = typeof import("@vladmandic/face-api");
type Point = { x: number; y: number };

let apiPromise: Promise<FaceApi> | null = null;
let modelsPromise: Promise<void> | null = null;

/** Lazily import the (tfjs-bundled) library. tfjs inits its backend on first op. */
async function getApi(): Promise<FaceApi> {
  if (!apiPromise) {
    apiPromise = import("@vladmandic/face-api");
  }
  return apiPromise;
}

/** Load the three MIT-licensed models from the same-origin /models directory. */
export function loadFaceModels(): Promise<void> {
  if (!modelsPromise) {
    modelsPromise = (async () => {
      const faceapi = await getApi();
      const url = import.meta.env.BASE_URL.replace(/\/$/, "") + "/models";
      await Promise.all([
        faceapi.nets.tinyFaceDetector.loadFromUri(url),
        faceapi.nets.faceLandmark68Net.loadFromUri(url),
        faceapi.nets.faceRecognitionNet.loadFromUri(url),
      ]);
    })();
  }
  return modelsPromise;
}

export interface FaceMeasurement {
  /** 128-d face descriptor. */
  descriptor: Float32Array;
  /** Five key points, normalized to the input square. */
  landmarks: FaceLandmarks;
  /** Detector confidence in [0, 1]. */
  detectionScore: number;
}

function centroid(points: Point[], w: number, h: number): FacePoint {
  let sx = 0;
  let sy = 0;
  for (const p of points) {
    sx += p.x;
    sy += p.y;
  }
  return { x: sx / points.length / w, y: sy / points.length / h };
}

function extremeX(points: Point[], w: number, h: number, side: "min" | "max"): FacePoint {
  let chosen = points[0];
  for (const p of points) {
    if (side === "min" ? p.x < chosen.x : p.x > chosen.x) chosen = p;
  }
  return { x: chosen.x / w, y: chosen.y / h };
}

const DETECT_INPUT = 320;
const SCORE_THRESHOLD = 0.3;

/**
 * Detect the most prominent face in a square canvas and return its descriptor
 * plus 5-point landmarks (normalized to the square). Null when no face is
 * found — which, for a mosaic, is itself the strongest privacy signal.
 */
export async function analyzeFace(input: HTMLCanvasElement): Promise<FaceMeasurement | null> {
  const faceapi = await getApi();
  const options = new faceapi.TinyFaceDetectorOptions({
    inputSize: DETECT_INPUT,
    scoreThreshold: SCORE_THRESHOLD,
  });
  const result = await faceapi
    .detectSingleFace(input, options)
    .withFaceLandmarks()
    .withFaceDescriptor();
  if (!result) return null;

  const w = input.width;
  const h = input.height;
  const lm = result.landmarks;
  const mouth = lm.getMouth();
  return {
    descriptor: result.descriptor,
    detectionScore: result.detection.score,
    landmarks: {
      leftEye: centroid(lm.getLeftEye(), w, h),
      rightEye: centroid(lm.getRightEye(), w, h),
      nose: centroid(lm.getNose(), w, h),
      mouthLeft: extremeX(mouth, w, h, "min"),
      mouthRight: extremeX(mouth, w, h, "max"),
    },
  };
}

/** L2 distance between descriptors — matches face-api's euclideanDistance. */
export function faceDistance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i];
    sum += d * d;
  }
  return Math.sqrt(sum);
}

/** face-api's canonical same-person cutoff for these descriptors. */
export const SAME_PERSON_DISTANCE = 0.6;
