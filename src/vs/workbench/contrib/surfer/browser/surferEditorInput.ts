/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EditorInput } from '../../../common/editor/editorInput.js';
import { URI } from '../../../../base/common/uri.js';
import { IFileService } from '../../../../platform/files/common/files.js';
import { isWaveformFile } from '../common/surfer.js';

export class SurferEditorInput extends EditorInput {

	static readonly ID = 'workbench.input.surferWaveform';

	override get typeId(): string {
		return SurferEditorInput.ID;
	}

	override get editorId(): string {
		return 'surfer.waveformEditor';
	}

	constructor(
		public readonly resource: URI,
		@IFileService private readonly fileService: IFileService
	) {
		super();
	}

	override getName(): string {
		return this.resource.path.split('/').pop() || 'waveform';
	}

	override getDescription(): string {
		return this.resource.path;
	}

	override getTitle(): string {
		return this.getName();
	}

	override async resolve(): Promise<null> {
		// Check if file exists and is a valid waveform file
		const exists = await this.fileService.exists(this.resource);
		if (!exists) {
			throw new Error(`Waveform file not found: ${this.resource.toString()}`);
		}

		if (!isWaveformFile(this.resource)) {
			throw new Error(`Invalid waveform file: ${this.resource.toString()}`);
		}

		return null;
	}

	override matches(otherInput: EditorInput): boolean {
		if (!(otherInput instanceof SurferEditorInput)) {
			return false;
		}

		return this.resource.toString() === otherInput.resource.toString();
	}

	override dispose(): void {
		super.dispose();
	}
}
