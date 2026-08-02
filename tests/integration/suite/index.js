const assert = require('node:assert/strict');
const vscode = require('vscode');

suite('Token Guild extension', () => {
  test('activates and registers the reset command', async () => {
    const extension = vscode.extensions.getExtension('evdaimon-games.token-guild');
    assert.ok(extension, 'extension should be discoverable');
    await extension.activate();
    const commands = await vscode.commands.getCommands(true);
    assert.ok(commands.includes('tokenGuild.resetProgress'));
  });

  test('declares and opens the webview with explicit synthetic and opt-in OTLP modes', async () => {
    const extension = vscode.extensions.getExtension('evdaimon-games.token-guild');
    assert.ok(extension);
    const view = extension.packageJSON.contributes.views.tokenGuild.find((entry) => entry.id === 'tokenGuild.guildView');
    assert.equal(view?.type, 'webview', 'Guild must be registered as a webview, not a tree view');
    const settings = extension.packageJSON.contributes.configuration.properties;
    assert.equal(settings['tokenGuild.telemetry.syntheticEnabled'].default, true);
    assert.equal(settings['tokenGuild.telemetry.otlpEnabled'].default, false);
    assert.equal(settings['tokenGuild.telemetry.otlpPort'].default, 4318);
    await vscode.commands.executeCommand('workbench.view.extension.tokenGuild');
  });
});
