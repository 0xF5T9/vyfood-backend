import Express from 'express';
import type { Send, Query } from 'express-serve-static-core';

// Typed 'Request' and 'Response'.
// https://github.com/tomnil/typedexpress

// Request example:
// app.put(
//     "/article/:id",
//     function (
//       req: TypedRequest<{ id: string }, { name: string }>,
//       res: Express.Response
//     ) {
//       console.log(`Updating article ${req.query.id}`);
//       console.log(`setting name to ${req.body.name}`);
//       res.status(200).json({ Success: true });
//     }
//   );

// Response example:
// app.get(
//     "/ping",
//     function (_req: Express.Request, res: TypedResponse<{ Pong: string }>) {
//       res.status(200).json({ Pong: new Date().toISOString() });
//     }
//   );

export interface TypedRequestBody<T> extends Express.Request {
    body: T;
}

export interface TypedRequestQuery<T extends Query> extends Express.Request {
    query: T;
}

export interface TypedRequest<T extends Query, U> extends Express.Request {
    body: U;
    query: T;
}

export interface TypedResponse<ResBody> extends Express.Response {
    json: Send<ResBody, this>;
}
