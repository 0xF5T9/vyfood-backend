/**
 * @file path.ts
 * @description Path variables.
 */

'use strict';

const pathGlobal: { root: string; upload: string } = {
    root: null,
    upload: null,
} as const;

export default pathGlobal;
