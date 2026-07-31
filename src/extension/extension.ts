import * as vscode from 'vscode';
import { readFile } from 'node:fs/promises';
import { randomBytes } from 'node:crypto';
import { join } from 'node:path';
import { renderWebviewHtml } from './webviewHtml';
import { StateManager } from './stateManager';
import { validateWebviewMessage } from '../shared/validation';
import type { WebviewToHostMessage } from '../shared/types';

class GuildViewProvider implements vscode.WebviewViewProvider {
  public static readonly viewId = 'tokenGuild.guildView';

  public constructor(private readonly extensionUri: vscode.Uri, private readonly state: StateManager) {}

  public async resolveWebviewView(webviewView: vscode.WebviewView): Promise<void> {
    webviewView.webview.options = {
      enableScripts: true,
      localResourceRoots: [vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview')]
    };

    webviewView.webview.onDidReceiveMessage(async (rawMessage: unknown) => {
      try {
        const message = validateWebviewMessage(rawMessage);
        await this.handleMessage(webviewView, message);
      } catch (error) {
        const detail = error instanceof Error ? error.message : 'Unknown message error';
        void vscode.window.showErrorMessage(`Token Guild message rejected: ${detail}`);
      }
    }, undefined, []);

    const templatePath = join(this.extensionUri.fsPath, 'dist', 'webview', 'index.html');
    const template = await readFile(templatePath, 'utf8');
    const nonce = randomBytes(18).toString('base64url');
    webviewView.webview.html = renderWebviewHtml(
      template,
      webviewView.webview.cspSource,
      (path) => webviewView.webview.asWebviewUri(vscode.Uri.joinPath(this.extensionUri, 'dist', 'webview', path)).toString(),
      nonce
    );
  }

  private async handleMessage(webviewView: vscode.WebviewView, message: WebviewToHostMessage): Promise<void> {
    if (message.type === 'READY') {
      await webviewView.webview.postMessage({ version: 1, type: 'LOAD_PROGRESS', payload: await this.state.load() });
    } else if (message.type === 'SAVE_PROGRESS') {
      await this.state.save(message.payload);
    } else if (message.type === 'RECORD_RUN_REWARD') {
      await this.state.applyRunReward(await this.state.load(), message.payload.runId, message.payload.gold, message.payload.tokens);
      await webviewView.webview.postMessage({ version: 1, type: 'LOAD_PROGRESS', payload: await this.state.load() });
    } else if (message.type === 'RESET_PROGRESS') {
      await this.state.reset();
      await webviewView.webview.postMessage({ version: 1, type: 'LOAD_PROGRESS', payload: await this.state.load() });
    }
  }
}

export function activate(context: vscode.ExtensionContext): void {
  const state = new StateManager(context.globalState);
  context.subscriptions.push(
    vscode.window.registerWebviewViewProvider(
      GuildViewProvider.viewId,
      new GuildViewProvider(context.extensionUri, state),
      { webviewOptions: { retainContextWhenHidden: false } }
    ),
    vscode.commands.registerCommand('tokenGuild.toggleStealth', () => {
      vscode.window.showInformationMessage('Token Guild stealth view will be available in the MVP shell.');
    }),
    vscode.commands.registerCommand('tokenGuild.resetProgress', async () => {
      const confirmation = await vscode.window.showWarningMessage('Reset all Token Guild progress?', { modal: true }, 'Reset');
      if (confirmation === 'Reset') await state.reset();
    })
  );
}

export function deactivate(): void {
  // All extension resources are owned by subscriptions and are disposed by VS Code.
}
