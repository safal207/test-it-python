const desktop = require('./lighthouserc.cjs');

module.exports = {
  ci: {
    ...desktop.ci,
    collect: {
      ...desktop.ci.collect,
      // A separate throttled mobile baseline, not a physical-device claim.
      url: [
        'http://localhost/ai-path/',
        'http://localhost/ai-path/journeys.html',
        'http://localhost/ai-path/studio.html',
        'http://localhost/ai-path/game-lab.html',
        'http://localhost/ai-path/3d-academy-practice.html'
      ],
      settings: {
        chromeFlags: '--headless --no-sandbox --disable-dev-shm-usage',
        maxWaitForLoad: 60000,
        formFactor: 'mobile',
        screenEmulation: { mobile: true, width: 390, height: 844, deviceScaleFactor: 1, disabled: false }
      }
    },
    upload: { target: 'filesystem', outputDir: './artifacts/lighthouse-mobile' }
  }
};
