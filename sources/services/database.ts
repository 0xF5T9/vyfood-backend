/**
 * @file database.ts
 * @description Database services used by models.
 */

'use strict';
import mysql from 'mysql2/promise';
import mysqlConfig from '@root/configs/mysql.json';
import mysqlGlobal from '@sources/global/mysql';

/**
 * Initialize mysql server.
 */
async function initialize() {
    mysqlGlobal.pool = await mysql.createPool(mysqlConfig.poolOptions);
}

/**
 * Executes a SQL query with optional parameters.
 * @param sql The SQL query to execute.
 * @param params An optional array of parameters to bind to the query.
 * @returns A promise resolving to an array of query results.
 */
async function query(sql: string, params?: string[]) {
    const [results] = await mysqlGlobal.pool.execute(sql, params);
    return results;
}

/**
 * Executes an transaction query.
 * @param callback The callback that execute the transaction logic.
 * @returns A promise resolving to an array of query results.
 */
async function queryTransaction(
    callback: (connection: mysql.PoolConnection) => Promise<mysql.QueryResult>
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
