import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';

export async function GET(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (id) {
      const result = await db.query(
        'SELECT * FROM projects WHERE id = $1 AND user_id = $2',
        [id, user.id]
      );
      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 });
      }
      return NextResponse.json(result.rows[0]);
    }

    const result = await db.query(
      'SELECT * FROM projects WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Fetch projects error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, url } = await request.json();

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await db.query(
      'INSERT INTO projects (name, url, user_id) VALUES ($1, $2, $3) RETURNING *',
      [name, url, user.id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Create project error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
