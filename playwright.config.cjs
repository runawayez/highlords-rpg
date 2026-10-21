module.exports = {
  testDir: './browser-tests',
  use: { browserName: 'chromium', headless: true, acceptDownloads: true, viewport: {width: 1440, height: 900} },
  projects: [{ name: 'chromium', use: { browserName: 'chromium' } }],
  retries: process.env.CI ? 1 : 0,
  workers: 1
};
