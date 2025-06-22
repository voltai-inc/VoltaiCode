/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';
import { ConfigurationScope, Extensions, IConfigurationNode, IConfigurationRegistry } from '../../../../platform/configuration/common/configurationRegistry.js';
import { workbenchConfigurationNodeBase } from '../../../common/configuration.js';
import { Registry } from '../../../../platform/registry/common/platform.js';

export const SURFER_CONFIGURATION_ID = 'surfer';

const configurationRegistry = Registry.as<IConfigurationRegistry>(Extensions.Configuration);

export const surferConfiguration: IConfigurationNode = {
	...workbenchConfigurationNodeBase,
	id: SURFER_CONFIGURATION_ID,
	order: 25,
	title: localize('surferConfigurationTitle', "Surfer Waveform Viewer"),
	type: 'object',
	properties: {
		'surfer.performance.maxFileSize': {
			type: 'number',
			default: 100 * 1024 * 1024, // 100MB
			minimum: 1024 * 1024, // 1MB minimum
			maximum: 1024 * 1024 * 1024, // 1GB maximum
			description: localize('surfer.performance.maxFileSize', "Maximum file size (in bytes) to load directly. Larger files use streaming."),
			scope: ConfigurationScope.MACHINE_OVERRIDABLE
		},
		'surfer.performance.enableBackgroundParsing': {
			type: 'boolean',
			default: true,
			description: localize('surfer.performance.enableBackgroundParsing', "Parse waveform files in background workers for better performance."),
			scope: ConfigurationScope.MACHINE_OVERRIDABLE
		},
		'surfer.performance.wasmCacheEnabled': {
			type: 'boolean',
			default: true,
			description: localize('surfer.performance.wasmCacheEnabled', "Cache compiled WASM modules to improve startup performance."),
			scope: ConfigurationScope.MACHINE_OVERRIDABLE
		},
		'surfer.display.theme': {
			type: 'string',
			enum: ['dark', 'light', 'auto'],
			enumDescriptions: [
				localize('surfer.display.theme.dark', "Use dark theme for waveform viewer"),
				localize('surfer.display.theme.light', "Use light theme for waveform viewer"),
				localize('surfer.display.theme.auto', "Automatically match VSCode theme")
			],
			default: 'auto',
			description: localize('surfer.display.theme', "Theme for the waveform viewer."),
			scope: ConfigurationScope.MACHINE_OVERRIDABLE
		},
		'surfer.display.initialZoom': {
			type: 'number',
			default: 1.0,
			minimum: 0.1,
			maximum: 10.0,
			description: localize('surfer.display.initialZoom', "Initial zoom level when opening waveform files."),
			scope: ConfigurationScope.MACHINE_OVERRIDABLE
		},
		'surfer.display.showMinimap': {
			type: 'boolean',
			default: true,
			description: localize('surfer.display.showMinimap', "Show minimap in waveform viewer for navigation."),
			scope: ConfigurationScope.MACHINE_OVERRIDABLE
		},
		'surfer.integration.autoOpen': {
			type: 'boolean',
			default: true,
			description: localize('surfer.integration.autoOpen', "Automatically open supported waveform files with Surfer when clicked in file explorer."),
			scope: ConfigurationScope.MACHINE_OVERRIDABLE
		},
		'surfer.integration.syncWithEditor': {
			type: 'boolean',
			default: true,
			description: localize('surfer.integration.syncWithEditor', "Synchronize waveform viewer state with text editor for related files."),
			scope: ConfigurationScope.MACHINE_OVERRIDABLE
		},
		'surfer.integration.openLinkedFiles': {
			type: 'boolean',
			default: true,
			description: localize('surfer.integration.openLinkedFiles', "Automatically open linked waveform files when referenced in source code."),
			scope: ConfigurationScope.MACHINE_OVERRIDABLE
		}
	}
};

// Register the configuration
configurationRegistry.registerConfiguration(surferConfiguration);
