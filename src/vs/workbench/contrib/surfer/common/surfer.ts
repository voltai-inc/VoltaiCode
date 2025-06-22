/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { IDisposable } from '../../../../base/common/lifecycle.js';
import { URI } from '../../../../base/common/uri.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { IWebview } from '../../webview/browser/webview.js';

export const ISurferService = createDecorator<ISurferService>('surferService');

export interface ISurferService {
	readonly _serviceBrand: undefined;

	// Core functionality
	openWaveformFile(resource: URI, options?: ISurferViewOptions): Promise<void>;
	createWaveformViewer(container: HTMLElement, options?: ISurferViewOptions): ISurferViewer;

	// Performance & Threading
	preloadWasm(): Promise<void>;
	parseFileInBackground(resource: URI): Promise<ISurferParseResult>;

	// Configuration
	getConfiguration(): ISurferConfiguration;
	updateConfiguration(config: Partial<ISurferConfiguration>): void;

	// Resource management
	getWasmResourceRoot(): URI;
	getWasmUri(): URI;
	getIntegrationUri(): URI;
	getSurferHtml(wasmUri: URI, integrationUri: URI): string;

	// Events
	readonly onDidChangeConfiguration: Event<void>;
	readonly onDidCreateViewer: Event<ISurferViewer>;
}

export interface ISurferViewer extends IDisposable {
	readonly element: HTMLElement;
	readonly webview: IWebview;

	loadFile(resource: URI): Promise<void>;
	postMessage(message: any): Promise<boolean>;
	focus(): void;

	readonly onDidReceiveMessage: Event<any>;
	readonly onDidLoadFile: Event<URI>;
	readonly onDidLoadSurfer: Event<void>;
	readonly onDidSelectWaveform: Event<any>;
}

export interface ISurferViewOptions {
	theme?: 'dark' | 'light' | 'auto';
	initialZoom?: number;
	showMinimap?: boolean;
	retainContextWhenHidden?: boolean;
}

export interface ISurferConfiguration {
	// Performance settings
	maxFileSize: number;
	enableBackgroundParsing: boolean;
	wasmCacheEnabled: boolean;

	// Display settings
	defaultTheme: 'dark' | 'light' | 'auto';
	initialZoom: number;
	showMinimap: boolean;

	// Integration settings
	openLinkedFiles: boolean;
	syncWithEditor: boolean;
	autoOpen: boolean;
}

export interface ISurferParseResult {
	success: boolean;
	error?: string;
	metadata?: {
		signalCount: number;
		timespan: number;
		fileSize: number;
	};
}

// Supported file extensions for waveform files
export const WAVEFORM_EXTENSIONS = ['.vcd', '.fst', '.ghw'];

// Check if a URI represents a waveform file
export function isWaveformFile(resource: URI): boolean {
	if (!resource?.path) {
		return false;
	}
	const ext = resource.path.toLowerCase().substring(resource.path.lastIndexOf('.'));
	return WAVEFORM_EXTENSIONS.includes(ext);
}

// Surfer integration messages
export interface SurferMessage {
	command: string;
	data?: any;
}

export interface SurferLoadedMessage extends SurferMessage {
	command: 'surfer-loaded';
}

export interface WaveformSelectedMessage extends SurferMessage {
	command: 'waveform-selected';
	data: {
		signalName: string;
		timePosition: number;
	};
}

export interface FileLoadedMessage extends SurferMessage {
	command: 'file-loaded';
	data: {
		filename: string;
		signalCount: number;
		timespan: number;
	};
}
