# Bundled face models

These weights power the optional, local-only "Privacy" analysis (face detection,
landmarks, and identity matching). They are served same-origin and never fetched
from a third party at runtime, so engaging the feature uploads nothing.

- **Source:** [@vladmandic/face-api](https://github.com/vladmandic/face-api) `model/`
  (a maintained fork of [face-api.js](https://github.com/justadudewhohacks/face-api.js)).
- **License:** MIT — © Vladimir Mandic / Vincent Mühler.
- **Models:** `tiny_face_detector` (detection), `face_landmark_68` (landmarks),
  `face_recognition` (128-d descriptor).

To update, re-download the matching `*-weights_manifest.json` + `*.bin` from the
source repo's `model/` directory.
