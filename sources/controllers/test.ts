/**
 * @file test.ts
 * @description Test router controller.
 */

'use strict';
import { RequestHandler } from 'express';

import type { TypedResponse } from '@root/global';
import { RawAPIResponse } from '@sources/apis/emart/types';
import model from '@sources/models/test';

/**
 * Test router controller.
 */
class TestController {
    // [POST] /test
    hello: RequestHandler = async (
        request,
        response: TypedResponse<RawAPIResponse<null>>,
        next
    ) => {
        const result = await model.hello();
        return response
            .status(result.statusCode)
            .json(
                new RawAPIResponse<null>(
                    result.message,
                    result.success,
                    result.data
                )
            );
    };
}

export default new TestController();
