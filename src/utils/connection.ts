import pkg from 'pg';
import type { Pool as PoolType, PoolClient as PoolClientType, PoolConfig, QueryResultRow, PoolClient } from 'pg';
const { Pool } = pkg;

export class DatabaseConnection {
  private static instance: DatabaseConnection;
  private pool: PoolType | null = null;
  private client: PoolClientType | null = null;

  private constructor() {}

  public static getInstance(): DatabaseConnection {
    if (!DatabaseConnection.instance) {
      DatabaseConnection.instance = new DatabaseConnection();
    }
    return DatabaseConnection.instance;
  }

  public async connect(connectionString: string): Promise<void> {
    try {
      if (this.pool) {
        await this.disconnect();
      }

      const config: PoolConfig = {
        connectionString,
        max: 20, // maximum number of clients in the pool
        idleTimeoutMillis: 30000, // how long a client is allowed to remain idle before being closed
        connectionTimeoutMillis: 2000, // how long to wait when connecting
        allowExitOnIdle: true
      };

      this.pool = new Pool(config);

      // Test connection
      this.client = await this.pool.connect();
      await this.client.query('SELECT 1');

    } catch (error) {
      if (this.client) {
        this.client.release();
        this.client = null;
      }
      if (this.pool) {
        await this.pool.end();
        this.pool = null;
      }
      throw new Error(`Failed to connect to database: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async disconnect(): Promise<void> {
    if (this.client) {
      this.client.release();
      this.client = null;
    }
    if (this.pool) {
      await this.pool.end();
      this.pool = null;
    }
  }

  public async query<T extends QueryResultRow>(text: string, values: any[] = []): Promise<T[]> {
    if (!this.client || !this.pool) {
      throw new Error('Not connected to database');
    }

    try {
      const result = await this.client.query<T>(text, values);
      return result.rows;
    } catch (error) {
      throw new Error(`Query failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public async transaction<T>(callback: (client: PoolClientType) => Promise<T>): Promise<T> {
    if (!this.client || !this.pool) {
      throw new Error('Not connected to database');
    }

    try {
      await this.client.query('BEGIN');
      const result = await callback(this.client);
      await this.client.query('COMMIT');
      return result;
    } catch (error) {
      await this.client.query('ROLLBACK');
      throw new Error(`Transaction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  public getPool(): PoolType | null {
    return this.pool;
  }

  public getClient(): PoolClientType | null {
    return this.client;
  }
}