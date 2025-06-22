/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { IWebviewService, IOverlayWebview } from '../../webview/browser/webview.js';
import { IWebview, WebviewMessageReceivedEvent } from '../../webview/browser/webview.js';
import { ISurferService, ISurferViewer, ISurferViewOptions, SurferMessage } from '../common/surfer.js';

export class SurferWebview extends Disposable implements ISurferViewer {

	private readonly _webview: IOverlayWebview;
	private _surferLoaded = false;
	private _currentFile: URI | undefined;

	private readonly _onDidReceiveMessage = this._register(new Emitter<any>());
	readonly onDidReceiveMessage = this._onDidReceiveMessage.event;

	private readonly _onDidLoadFile = this._register(new Emitter<URI>());
	readonly onDidLoadFile = this._onDidLoadFile.event;

	private readonly _onDidLoadSurfer = this._register(new Emitter<void>());
	readonly onDidLoadSurfer = this._onDidLoadSurfer.event;

	private readonly _onDidSelectWaveform = this._register(new Emitter<any>());
	readonly onDidSelectWaveform = this._onDidSelectWaveform.event;

	constructor(
		public readonly element: HTMLElement,
		private readonly options: ISurferViewOptions,
		@IWebviewService private readonly webviewService: IWebviewService,
		@ISurferService private readonly surferService: ISurferService
	) {
		super();
		this._webview = this._createWebview();
		this._setupWebview();
	}

	get webview(): IWebview {
		return this._webview;
	}

	private _createWebview(): IOverlayWebview {
		return this._register(this.webviewService.createWebviewOverlay({
			title: 'Surfer Waveform Viewer',
			providedViewType: 'surfer.waveformViewer',
			origin: 'surfer',
			options: {
				retainContextWhenHidden: this.options.retainContextWhenHidden ?? true,
				enableFindWidget: false,
			},
			contentOptions: {
				allowScripts: true,
				localResourceRoots: [this.surferService.getWasmResourceRoot()],
			},
			extension: undefined // Built-in, no extension
		}));
	}

	private _setupWebview(): void {
		// Set up webview in container
		this._webview.claim(this, (globalThis as any).window, undefined);
		this._webview.layoutWebviewOverElement(this.element);

		this._webview.setHtml(this._getSurferHtml());
		this._setupMessageHandling();
	}

	private _getSurferHtml(): string {
		// For now, return a simple HTML that will load Surfer
		// In a real implementation, you would fetch this from the Surfer build
		const config = this.surferService.getConfiguration();
		const theme = this.options.theme ?? config.defaultTheme;

		return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Surfer Waveform Viewer</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            height: 100vh;
            overflow: hidden;
            background: var(--vscode-editor-background);
            color: var(--vscode-editor-foreground);
            font-family: var(--vscode-font-family);
        }

        .surfer-container {
            width: 100%;
            height: 100%;
            display: flex;
            align-items: center;
            justify-content: center;
        }

        .loading {
            text-align: center;
        }

        iframe {
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body data-vscode-context='{"preventDefaultContextMenuItems": true}' data-theme="${theme}">
    <div class="surfer-container">
        <div class="loading">
            <h3>Loading Surfer Waveform Viewer...</h3>
            <p>Initializing WASM modules...</p>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();

        // Initialize Surfer integration
        function initializeSurfer() {
            // This would load the actual Surfer WASM build
            // For now, just simulate loading
            setTimeout(() => {
                document.querySelector('.loading').innerHTML = '<h3>Surfer Ready</h3><p>Drop a waveform file to begin viewing</p>';

                // Notify VSCode that Surfer has loaded
                vscode.postMessage({ command: 'surfer-loaded' });
            }, 1000);
        }

        // Handle messages from VSCode
        window.addEventListener('message', event => {
            const message = event.data;

            switch (message.type) {
                case 'loadFile':
                    // Handle file loading
                    document.querySelector('.loading').innerHTML = '<h3>Loading file...</h3><p>' + message.fileUrl + '</p>';
                    // Simulate file loading
                    setTimeout(() => {
                        vscode.postMessage({
                            command: 'file-loaded',
                            data: {
                                filename: message.fileUrl.split('/').pop(),
                                signalCount: 42,
                                timespan: 1000
                            }
                        });
                    }, 500);
                    break;

                case 'configure':
                    // Handle configuration updates
                    console.log('Surfer configuration updated:', message.config);
                    break;
            }
        });

        // Start initialization
        initializeSurfer();

        /*SURFER_SETUP_HOOKS*/
    </script>
</body>
</html>`;
	}

	private _setupMessageHandling(): void {
		this._register(this._webview.onMessage((e: WebviewMessageReceivedEvent) => {
			const message = e.message as SurferMessage;
			this._onDidReceiveMessage.fire(message);

			switch (message.command) {
				case 'surfer-loaded':
					this._surferLoaded = true;
					this._onDidLoadSurfer.fire();
					this._applySurferConfiguration();
					break;

				case 'waveform-selected':
					this._onDidSelectWaveform.fire(message.data);
					break;

				case 'file-loaded':
					if (this._currentFile) {
						this._onDidLoadFile.fire(this._currentFile);
					}
					break;
			}
		}));
	}

	private _applySurferConfiguration(): void {
		if (!this._surferLoaded) {
			return;
		}

		const config = this.surferService.getConfiguration();

		// Apply configuration through postMessage to Surfer
		this.postMessage({
			type: 'configure',
			config: {
				initialZoom: this.options.initialZoom ?? config.initialZoom,
				showMinimap: this.options.showMinimap ?? config.showMinimap,
				theme: this.options.theme ?? config.defaultTheme
			}
		});
	}

	async loadFile(resource: URI): Promise<void> {
		this._currentFile = resource;

		if (!this._surferLoaded) {
			// Wait for Surfer to load first
			await new Promise<void>(resolve => {
				const listener = this.onDidLoadSurfer(() => {
					listener.dispose();
					resolve();
				});
			});
		}

		// For now, just send the file path
		// In a real implementation, you would convert to webview URI
		await this.postMessage({
			type: 'loadFile',
			fileUrl: resource.toString()
		});
	}

	async postMessage(message: any): Promise<boolean> {
		return this._webview.postMessage(message);
	}

	focus(): void {
		this._webview.focus();
	}

	override dispose(): void {
		super.dispose();
	}
}

