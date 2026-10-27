module.exports = {
  ci: {
    collect: {
      staticDistDir: "./dist",
      url: [
        "http://localhost/ai-path/",
        "http://localhost/ai-path/game-lab.html",
        "http://localhost/ai-path/vibe-coding/",
        "http://localhost/ai-path/neural-networks.html",
        "http://localhost/ai-path/neural-courses.html",
        "http://localhost/ai-path/career-research.html",
        "http://localhost/ai-path/3d-academy.html",
        "http://localhost/ai-path/3d-academy-practice.html",
        "http://localhost/ai-path/studio.html",
        "http://localhost/ai-path/examples/pocitel.html",
        "http://localhost/ai-path/examples/plan-to-space.html",
        "http://localhost/ai-path/examples/ai-desk.html"
      ],
      numberOfRuns: 2,
      settings: {
        chromeFlags: "--headless --no-sandbox --disable-dev-shm-usage",
        maxWaitForLoad: 60000,
        // A repeatable desktop baseline. Mobile behavior has its own Playwright suite.
        preset: "desktop"
      }
    },
    assert: {
      assertions: {
        "categories:accessibility": ["error", { minScore: 0.95 }],
        "label-content-name-mismatch": ["error", { minScore: 1 }],
        "errors-in-console": ["error", { minScore: 1 }],
        "cumulative-layout-shift": ["error", { maxNumericValue: 0.1 }],
        "categories:seo": ["warn", { minScore: 0.75 }],
        "categories:performance": ["warn", { minScore: 0.55 }],
        "categories:best-practices": ["warn", { minScore: 0.75 }]
      }
    },
    upload: {
      target: "filesystem",
      outputDir: "./artifacts/lighthouse"
    }
  }
};
