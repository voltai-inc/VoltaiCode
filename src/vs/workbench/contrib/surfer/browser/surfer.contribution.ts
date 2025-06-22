/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as WorkbenchExtensions, IWorkbenchContributionsRegistry } from '../../../common/contributions.js';
import { LifecyclePhase } from '../../../services/lifecycle/common/lifecycle.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { ISurferService, WAVEFORM_EXTENSIONS } from '../common/surfer.js';
import { SurferService } from './surferService.js';
import '../common/surferConfiguration.js';
import { IEditorResolverService, RegisteredEditorPriority } from '../../../services/editor/common/editorResolverService.js';
import { URI } from '../../../../base/common/uri.js';
import { localize } from '../../../../nls.js';
import { EditorExtensions } from '../../../common/editor.js';
import { EditorPaneDescriptor, IEditorPaneRegistry } from '../../../browser/editor.js';
import { SurferEditor } from './surferEditor.js';
import { SurferEditorInput } from './surferEditorInput.js';

// Register the Surfer service as singleton
registerSingleton(ISurferService, new SyncDescriptor(SurferService));

// Register the editor pane
Registry.as<IEditorPaneRegistry>(EditorExtensions.EditorPane).registerEditorPane(
	EditorPaneDescriptor.create(
		SurferEditor,
		SurferEditor.ID,
		localize('surfer.waveformEditor.name', 'Surfer Waveform Editor')
	),
	[
		new SyncDescriptor(SurferEditorInput)
	]
);

class SurferContribution extends Disposable {

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@IEditorResolverService private readonly editorResolverService: IEditorResolverService,
		@ISurferService surferService: ISurferService
	) {
		super();

		// Register editor for waveform files
		this.registerWaveformEditor();

		// Initialize the Surfer integration
		this.initialize(surferService);
	}

	private registerWaveformEditor(): void {
		// Register editor resolver for each waveform file extension
		for (const extension of WAVEFORM_EXTENSIONS) {
			this._register(
				this.editorResolverService.registerEditor(
					`*${extension}`,
					{
						id: SurferEditor.ID,
						label: localize('surfer.waveformEditor.label', 'Surfer Waveform Viewer'),
						detail: localize('surfer.waveformEditor.detail', 'View waveform files with Surfer'),
						priority: RegisteredEditorPriority.default
					},
					{
						canSupportResource: (resource: URI) => {
							const path = resource.path.toLowerCase();
							return WAVEFORM_EXTENSIONS.some(ext => path.endsWith(ext));
						}
					},
					{
						createEditorInput: ({ resource }) => {
							// Create the SurferEditorInput for the waveform file
							const input = this.instantiationService.createInstance(SurferEditorInput, resource);
							return { editor: input };
						}
					}
				)
			);
		}
	}

	private async initialize(surferService: ISurferService): Promise<void> {
		try {
			// Preload WASM modules for better performance
			await surferService.preloadWasm();
			console.log('Surfer integration initialized successfully');
		} catch (error) {
			// Silent failure - WASM will be loaded on-demand
			console.warn('Failed to initialize Surfer integration:', error);
		}
	}
}

// Register the contribution
const workbenchRegistry = Registry.as<IWorkbenchContributionsRegistry>(WorkbenchExtensions.Workbench);
workbenchRegistry.registerWorkbenchContribution(SurferContribution, LifecyclePhase.Restored);
