const path = require('node:path');
const { runTests } = require('@vscode/test-electron');

// The agent shell may inherit VS Code's extension-host flag. The test binary
// must run as the normal Electron application.
delete process.env.ELECTRON_RUN_AS_NODE;

(async () => {
  const extensionDevelopmentPath = path.resolve(__dirname, '../..');
  const extensionTestsPath = path.resolve(__dirname, 'suite', 'run.js');
  await runTests({
    extensionDevelopmentPath,
    extensionTestsPath,
    launchArgs: ['--disable-extensions']
  });
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
