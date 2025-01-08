/**
 * @file index.ts
 * @description Server routers.
 */

import { Express, Request, Response } from 'express';
import authorizeRouter from './authorize';
import registerRouter from './register';
import userRouter from './user';
import recoveryRouter from './recovery';
import productRouter from './product';
import categoryRouter from './category';
import orderRouter from './order';
import newsletterRouter from './newsletter';
import testRouter from './test';

/**
 * Initialize the server routers.
 * @param Express instance.
 */
function routers(app: Express) {
    app.use('/authorize', authorizeRouter);
    app.use('/register', registerRouter);
    app.use('/user', userRouter);
    app.use('/recovery', recoveryRouter);
    app.use('/product', productRouter);
    app.use('/category', categoryRouter);
    app.use('/order', orderRouter);
    app.use('/newsletter', newsletterRouter);
    app.use('/test', testRouter);
    app.get('/', (request: Request, response: Response) => {
        return response.status(200).json({ message: 'Ok.' });
    });
}

export default routers;
