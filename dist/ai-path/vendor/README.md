# PDF export assets

Loaded only when the visitor requests a PDF. Both files are hosted with the site; runtime export sends no plan or idea to an external service.

- `jspdf.umd.min.js`: jsPDF 4.2.1, fetched unchanged from https://raw.githubusercontent.com/parallax/jsPDF/v4.2.1/dist/jspdf.umd.min.js . SHA-256: `e6551fcdc32f09d6853b2c5126d18d01d9447e0da618a41a11ebeee0f6c20d54`. MIT license in `jspdf-LICENSE.txt`.
- `plan-fonts.js`: DejaVu Sans 2.37 regular/bold from the Debian `fonts-dejavu-core` distribution. Upstream https://dejavu-fonts.github.io/ . Redistribution notice in `DejaVu-LICENSE.txt`. Contains base64 TrueType subsets for readable, searchable Cyrillic/Latin PDF text. Generated using fontTools.subset with hinting disabled and default other options. Unicode ranges: U+0020-052F, U+1E00-1EFF, U+2000-206F, U+20A0-20CF, U+2190-22FF, U+2500-27BF, U+1F600-1F64F (only glyphs present in the source font).

- `DejaVuSans.ttf` source SHA-256: `ae7b7855e115a5966d8b1b3f80f254ccc117ec86f9965e202ee2940453837280`; embedded subset: `1cd018d7a7e8c4c8d534581b6eec99cbc1f7aa049a3b27568891b46563858f23`.
- `DejaVuSans-Bold.ttf` source SHA-256: `5c1247acef7f2b8522a31742c76d6adcb5569bacc0be7ceaa4dc39dd252ce895`; embedded subset: `7284c8e0b550ee9b72dd8ad245103f43f5d4ab9b5507c2ec24ab8b1c033c16a8`.
