# Golden-File Tests (Arabic Rendering)

Playwright visual-regression suite covering the Arabic shaping edge cases v1 failed on.

## Generate baselines (first time)

Run inside the production Docker image (ARM64) so baselines are captured on the exact Chromium + font set that ships:

```bash
docker build -t nusuk-api:local -f docker/Dockerfile .
docker run --rm -v "$PWD:/work" -w /work nusuk-api:local \
  npx playwright test --update-snapshots
```

Commit the generated `tests/golden/chromium-arm64-parity/*.png` baselines.

## Run against baselines

```bash
npm run test:golden
```

In CI this runs under `docker buildx` ARM64 QEMU to match prod exactly (addresses CV-03).

## Refresh policy

Do **not** bump `maxDiffPixelRatio` to silence a failure. Baselines refresh only when:
- Chromium major/minor version pinned in `docker/Dockerfile` changes (deliberate), or
- A font package version changes

Every refresh commit must link the reason in the message.
