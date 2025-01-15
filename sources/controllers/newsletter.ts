/**
 * @file newsletter.ts
 * @description Newsletter router controller.
 */

'use strict';
import { RequestHandler } from 'express';

import type { TypedResponse } from '@root/global';
import { RawAPIResponse } from '@sources/apis/emart/types';
import * as APITypes from '@sources/apis/emart/types';
import model from '@sources/models/newsletter';

/**
 * Newsletter router controller.
 */
class NewsletterController {
    // [POST] /newsletter/subscribe
    subscribeNewsletter: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.SubscribeNewsletterResponseData>
        >,
        next
    ) => {
        const { email } = request.body;

        const result = await model.subscribeNewsletter(email);

        return response
            .status(result.statusCode)
            .json(
                new RawAPIResponse<APITypes.SubscribeNewsletterResponseData>(
                    result.message,
                    result.success,
                    result.data
                )
            );
    };

    // [POST] /newsletter/confirm
    subscribeNewsletterConfirmation: RequestHandler = async (
        request,
        response: TypedResponse<
            RawAPIResponse<APITypes.SubscribeNewsletterConfirmationResponseData>
        >,
        next
    ) => {
        const { newsletterToken } = request.body;

        const result =
            await model.subscribeNewsletterConfirmation(newsletterToken);

        return response
            .status(result.statusCode)
            .json(
                new RawAPIResponse<APITypes.SubscribeNewsletterConfirmationResponseData>(
                    result.message,
                    result.success,
                    result.data
                )
            );
    };
}

export default new NewsletterController();
