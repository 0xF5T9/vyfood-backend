/**
 * @file database.ts
 * @description Database services used by models.
 */

'use strict';
import mysql from 'mysql2/promise';
import mysqlGlobal from '@sources/global/mysql';

/**
 * Initialize mysql server.
 */
async function initialize() {
    mysqlGlobal.pool = await mysql.createPool({
        host: process.env.DATABASE_HOST,
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        database: process.env.DATABASE_NAME,
        connectTimeout: 60000,
        waitForConnections: true,
        connectionLimit: 100,
        maxIdle: 100,
        idleTimeout: 60000,
        queueLimit: 0,
        enableKeepAlive: true,
        keepAliveInitialDelay: 10000,
    });
}

/**
 * Executes a SQL query with optional parameters.
 * @param sql The SQL query to execute.
 * @param params An optional array of parameters to bind to the query.
 * @returns A promise resolving to an array of query results.
 */
async function query<
    Type extends mysql.RowDataPacket[] | mysql.ResultSetHeader,
>(sql: string, params?: string[]) {
    const [results] = await mysqlGlobal.pool.execute<Type>(sql, params);
    return results;
}

/**
 * Executes an transaction query.
 * @param callback The callback that execute the transaction logic.
 * @returns A promise resolving generic Type.
 */
async function queryTransaction<Type>(
    callback: (connection: mysql.PoolConnection) => Promise<Type>
) {
    const connection = await mysqlGlobal.pool.getConnection();

    try {
        if (!callback) throw new Error('No callback function was provided.');

        await connection.beginTransaction();

        const results = await callback(connection);

        await connection.commit();
        return results;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export { initialize, query, queryTransaction };
