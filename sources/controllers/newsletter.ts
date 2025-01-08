/**
 * @file newsletter.ts
 * @description Newsletter router controller.
 */

'use strict';
import { RequestHandler } from 'express';

import model from '@sources/models/newsletter';

/**
 * Newsletter router controller.
 */
class NewsletterController {
    // [POST] /newsletter/subscribe
    subscribeNewsletter: RequestHandler = async (request, response, next) => {
        const { email } = request.body;

        const result = await model.subscribeNewsletter(email);

        return response
            .status(result.statusCode)
            .json({ message: result.message, data: result.data });
    };

    // [POST] /newsletter/confirm
    subscribeNewsletterConfirmation: RequestHandler = async (
        request,
        response,
        next
    ) => {
        const { newsletterToken } = request.body;

        const result =
            await model.subscribeNewsletterConfirmation(newsletterToken);

        return response
            .status(result.statusCode)
            .json({ message: result.message, data: result.data });
    };
}

export default new NewsletterController();
