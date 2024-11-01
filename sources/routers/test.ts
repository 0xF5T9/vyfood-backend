/**
 * @file test.ts
 * @description Test router.
 */

'use strict';
import express from 'express';

import controller from '@sources/controllers/test';

const router = express.Router();

router.post('/sendMail', controller.sendMail); // Send email using nodemailer.

export default router;
