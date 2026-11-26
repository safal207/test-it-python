#!/usr/bin/env bash
set -euo pipefail
# Export only a public, isolated presentation of pinned open-source revisions.
# Do not publish the 2.0 application, service worker, backend or user storage.
root="$(pwd)"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
v1=2d44c25b170952e09e519f7e4b9d2563e368e24e
v2=698adb1f39829f99fe72a340e04c094de6de542e
checkout() {
  local name="$1" revision="$2" dir="$3"
  git init -q "$dir"
  git -C "$dir" fetch -q --depth=1 "https://github.com/safal207/$name.git" "$revision"
  git -C "$dir" checkout -q --detach FETCH_HEAD
  test "$(git -C "$dir" rev-parse HEAD)" = "$revision"
}
checkout todo-list "$v1" "$work/v1"
checkout sdelano-2 "$v2" "$work/v2"
npm install --prefix "$work" --no-save --no-package-lock playwright@1.62.1
"$work/node_modules/.bin/playwright" install --with-deps chromium
export SDELANO_QA_ENGINE=chromium
run_tests() (
  cd "$1"; shift
  python3 -m http.server 8765 --bind 127.0.0.1 > "$work/server.log" 2>&1 &
  pid=$!
  trap 'kill "$pid" 2>/dev/null || true' EXIT
  curl -fsS --retry 15 --retry-connrefused --retry-delay 1 http://127.0.0.1:8765/ >/dev/null
  for spec in "$@"; do node "tests/$spec"; done
)
run_tests "$work/v1" qa-smoke.mjs
run_tests "$work/v2" fox-phone-preview.mjs fox-ceremony.mjs game-shop.mjs
out="$root/dist/sdelano-preview"
mkdir -p "$out/screens" "$out/demo/assets"
cp "$work/v1/artifacts/first-win-390.png" "$out/screens/v1-first-win.png"
cp "$work/v1/artifacts/milestone-5-390.png" "$out/screens/v1-achievements.png"
cp "$work/v2/artifacts/fox-ceremony-chromium-390.png" "$out/screens/v2-fox-ceremony.png"
cp "$work/v2/artifacts/fox-phone-preview-chromium-390-master.png" "$out/screens/v2-fox-preview.png"
cp "$work/v2/artifacts/fox-shop-chromium-390.png" "$out/screens/v2-shop.png"
for name in styles.css game-preview.css game-juice.css brand-flavor.css fox-evolution.css fox-evolution-art-v2.css fox-ceremony.css fox-microreactions.css game-preview.js game-juice.js fox-evolution.js fox-evolution-art-v2.js fox-ceremony.js fox-microreactions.js fox-phone-preview.js fox-micro-phone-preview.js fox-phone-feedback.js; do
  cp "$work/v2/$name" "$out/demo/$name"
done
for name in fox-mascot.webp fox-evolution-stages.webp; do
  cp "$work/v2/assets/$name" "$out/demo/assets/$name"
done
python3 - "$work/v2/fox-phone-preview.html" "$out" <<'PY'
import sys, pathlib, hashlib, json, struct
src, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
html = src.read_text()
assert html.count('<head>') == 1
csp = "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'none'; worker-src 'none'; object-src 'none'; form-action 'none'; base-uri 'none'"
(out/'demo/index.html').write_text(html.replace('<head>', '<head><meta http-equiv="Content-Security-Policy" content="' + csp + '">', 1))
records = []
for p in sorted((out/'screens').glob('*.png')):
    data = p.read_bytes()
    assert data[:8] == b'\x89PNG\r\n\x1a\n'
    w,h = struct.unpack('>II', data[16:24])
    assert w == 390 and h >= 844
    records.append({'file':p.name,'width':w,'height':h,'sha256':hashlib.sha256(data).hexdigest()})
assert len(records) == 5
(out/'sources.json').write_text(json.dumps({'v1':'2d44c25b170952e09e519f7e4b9d2563e368e24e','v2':'698adb1f39829f99fe72a340e04c094de6de542e','capture':'Chromium QA tests, synthetic task/reward data, full-page screenshots','images':records},indent=2)+'\n')
PY
cp "$root/scripts/sdelano-portfolio.html" "$out/index.html"
# Acceptance test for the exported folder, not merely the source project.
cp "$root/scripts/test-sdelano-portfolio.mjs" "$work/test-export.mjs"
python3 -m http.server 8766 --bind 127.0.0.1 --directory "$out" > "$work/export.log" 2>&1 &
pid=$!
trap 'kill "$pid" 2>/dev/null || true; rm -rf "$work"' EXIT
curl -fsS --retry 15 --retry-connrefused --retry-delay 1 http://127.0.0.1:8766/ >/dev/null
node "$work/test-export.mjs"
