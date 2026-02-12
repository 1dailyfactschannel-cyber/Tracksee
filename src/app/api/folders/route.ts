import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getUser } from '@/lib/auth';

export async function GET() {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const result = await db.query(
      'SELECT * FROM monitoring_folders WHERE user_id = $1 ORDER BY name',
      [user.id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Fetch folders error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await db.query(
      'INSERT INTO monitoring_folders (name, user_id) VALUES ($1, $2) RETURNING *',
      [name, user.id]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Create folder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    const body = await request.json();
    const { name } = body;

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const result = await db.query(
      'UPDATE monitoring_folders SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
      [name, id, user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Update folder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Folder ID is required' }, { status: 400 });
    }

    // Dashboards with this folder_id will be automatically set to NULL by DB constraint ON DELETE SET NULL
    const result = await db.query(
      'DELETE FROM monitoring_folders WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Folder not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete folder error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
