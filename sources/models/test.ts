/**
 * @file test.ts
 * @description Test router models.
 */

'use strict';

import { ModelResponse } from '@sources/utility/model';
import staticTexts from '@sources/apis/emart/static-texts';

/**
 * Hello world.
 * @returns Returns the response object.
 */
async function hello() {
    try {
        return new ModelResponse('Hello world.', true, null);
    } catch (error) {
        console.error(error);
        if (error.isServerError === undefined) error.isServerError = true;

        return new ModelResponse(
            error.isServerError === false
                ? error.message
                : staticTexts.unknownError,
            false,
            null,
            error.isServerError,
            error.statusCode
        );
    }
}

export default { hello };
