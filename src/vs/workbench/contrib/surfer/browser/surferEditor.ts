/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dom from '../../../../base/browser/dom.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { Emitter } from '../../../../base/common/event.js';
import { DisposableStore } from '../../../../base/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IStorageService } from '../../../../platform/storage/common/storage.js';
import { ITelemetryService } from '../../../../platform/telemetry/common/telemetry.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { EditorPane } from '../../../browser/parts/editor/editorPane.js';
import { IEditorOpenContext } from '../../../common/editor.js';
import { EditorInput } from '../../../common/editor/editorInput.js';
import { IEditorOptions } from '../../../../platform/editor/common/editor.js';
import { IEditorGroup } from '../../../services/editor/common/editorGroupsService.js';
import { ISurferService, ISurferViewer } from '../common/surfer.js';
import { SurferEditorInput } from './surferEditorInput.js';

export class SurferEditor extends EditorPane {

	static readonly ID = 'surfer.waveformEditor';

	private _container: HTMLElement | undefined;
	private _viewer: ISurferViewer | undefined;
	private readonly _localDisposables = new DisposableStore();

	private readonly _onDidChangeContent = this._register(new Emitter<void>());
	readonly onDidChangeContent = this._onDidChangeContent.event;

	constructor(
		group: IEditorGroup,
		@ISurferService private readonly surferService: ISurferService,
		@ITelemetryService telemetryService: ITelemetryService,
		@IThemeService themeService: IThemeService,
		@IStorageService storageService: IStorageService,
		@IInstantiationService instantiationService: IInstantiationService
	) {
		super(SurferEditor.ID, group, telemetryService, themeService, storageService);
	}

	protected createEditor(parent: HTMLElement): void {
		this._container = dom.append(parent, dom.$('.surfer-editor'));
		this._container.style.width = '100%';
		this._container.style.height = '100%';
	}

	layout(dimension: { width: number; height: number }): void {
		// Layout the viewer to match the container dimensions
		if (this._container) {
			this._container.style.width = `${dimension.width}px`;
			this._container.style.height = `${dimension.height}px`;
		}
	}

	override async setInput(input: EditorInput, options: IEditorOptions | undefined, context: IEditorOpenContext, token: CancellationToken): Promise<void> {
		await super.setInput(input, options, context, token);

		if (!(input instanceof SurferEditorInput)) {
			throw new Error('Invalid input type for SurferEditor');
		}

		this._setInputInternal(input, token);
	}

	private async _setInputInternal(input: SurferEditorInput, token: CancellationToken): Promise<void> {
		if (!this._container) {
			return;
		}

		// Clear any existing viewer
		this._clearViewer();

		// Create new viewer
		this._viewer = this.surferService.createWaveformViewer(this._container, {
			theme: 'auto',
			retainContextWhenHidden: true
		});

		// Set up event handlers
		this._localDisposables.add(this._viewer.onDidLoadFile(() => {
			this._onDidChangeContent.fire();
		}));

		this._localDisposables.add(this._viewer.onDidSelectWaveform((data) => {
			// Handle waveform selection - could be used for debugging integration
			console.log('Waveform selected:', data);
		}));

		// Load the file
		try {
			await this._viewer.loadFile(input.resource);
		} catch (error) {
			console.error('Failed to load waveform file:', error);
			// Show error in the viewer container
			if (this._container) {
				this._container.innerHTML = `
					<div style="display: flex; align-items: center; justify-content: center; height: 100%; color: var(--vscode-errorForeground);">
						<div style="text-align: center;">
							<h3>Failed to load waveform file</h3>
							<p>${error instanceof Error ? error.message : String(error)}</p>
						</div>
					</div>
				`;
			}
		}
	}

	private _clearViewer(): void {
		this._localDisposables.clear();
		if (this._viewer) {
			this._viewer.dispose();
			this._viewer = undefined;
		}
		if (this._container) {
			this._container.innerHTML = '';
		}
	}

	override focus(): void {
		if (this._viewer) {
			this._viewer.focus();
		} else if (this._container) {
			this._container.focus();
		}
	}

	override clearInput(): void {
		this._clearViewer();
		super.clearInput();
	}

	override dispose(): void {
		this._clearViewer();
		super.dispose();
	}
}
