import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [rows] = await db.query(
      'SELECT DATABASE() AS databaseName'
    );

    const [tables] = await db.query(
      'SHOW TABLES'
    );

    return NextResponse.json({
      success: true,
      database: rows[0].databaseName,
      tables: tables.map(
        row => Object.values(row)[0]
      ),
    });
  } catch (error) {
    console.error('MySQL connection failed:', error.message);

    return NextResponse.json(
      {
        success: false,
        message: 'MySQL connection failed',
      },
      { status: 500 }
    );
  }
}