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
        'SELECT * FROM monitoring_dashboards WHERE id = $1 AND user_id = $2',
        [id, user.id]
      );

      if (result.rows.length === 0) {
        return NextResponse.json({ error: 'Dashboard not found' }, { status: 404 });
      }

      return NextResponse.json(result.rows[0]);
    }

    const result = await db.query(
      'SELECT * FROM monitoring_dashboards WHERE user_id = $1 ORDER BY created_at DESC',
      [user.id]
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Fetch dashboards error:', error);
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
    const { name, layout, folder_id, project_id, refresh_interval } = body;

    if (!name || !project_id) {
      return NextResponse.json({ error: 'Name and project_id are required' }, { status: 400 });
    }

    const result = await db.query(
      'INSERT INTO monitoring_dashboards (name, user_id, layout, folder_id, project_id, refresh_interval) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *',
      [
        name, 
        user.id, 
        JSON.stringify(layout || []), 
        folder_id || null, 
        project_id, 
        refresh_interval || 30
      ]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Create dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { id, name, layout, folder_id, project_id, refresh_interval } = body;

    if (!id) {
      return NextResponse.json({ error: 'Dashboard ID is required' }, { status: 400 });
    }

    let query = 'UPDATE monitoring_dashboards SET ';
    const params: unknown[] = [];
    const updates: string[] = [];

    if (name !== undefined) {
      params.push(name);
      updates.push(`name = $${params.length}`);
    }

    if (layout !== undefined) {
      params.push(JSON.stringify(layout));
      updates.push(`layout = $${params.length}`);
    }

    if (folder_id !== undefined) {
      params.push(folder_id);
      updates.push(`folder_id = $${params.length}`);
    }

    if (project_id !== undefined) {
      params.push(project_id);
      updates.push(`project_id = $${params.length}`);
    }

    if (refresh_interval !== undefined) {
      params.push(refresh_interval);
      updates.push(`refresh_interval = $${params.length}`);
    }

    if (updates.length === 0) {
      return NextResponse.json({ error: 'No updates provided' }, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    
    params.push(id);
    params.push(user.id);
    query += updates.join(', ') + ` WHERE id = $${params.length - 1} AND user_id = $${params.length} RETURNING *`;

    const result = await db.query(query, params);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Dashboard not found or access denied' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Update dashboard error:', error);
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
      return NextResponse.json({ error: 'Dashboard ID is required' }, { status: 400 });
    }

    const result = await db.query(
      'DELETE FROM monitoring_dashboards WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, user.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Dashboard not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete dashboard error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
