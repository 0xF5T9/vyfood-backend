/**
 * @file mysql.ts
 * @description MySQL server global variables.
 */

'use strict';
import mysql from 'mysql2/promise';

const mysqlGlobal: { pool: mysql.Pool } = {
    pool: null,
} as const;

export default mysqlGlobal;
