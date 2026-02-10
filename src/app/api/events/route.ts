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
    const projectId = searchParams.get('projectId');
    const limit = parseInt(searchParams.get('limit') || '100');
    const type = searchParams.get('type');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const metric = searchParams.get('metric');
    const period = searchParams.get('period');

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
    }

    // Verify project ownership
    const projectCheck = await db.query(
      'SELECT id FROM projects WHERE id = $1 AND user_id = $2',
      [projectId, user.id]
    );

    if (projectCheck.rows.length === 0) {
      return NextResponse.json({ error: 'Project not found or access denied' }, { status: 404 });
    }

    // Handle special monitoring metrics
    if (metric) {
      let timeFilter = '';
      let groupInterval = 'minute';
      const timeParams: any[] = [projectId];
      
      if (period) {
        let interval = '1 hour';
        if (period === '24h') {
          interval = '24 hours';
          groupInterval = 'hour';
        }
        if (period === '7d') {
          interval = '7 days';
          groupInterval = 'hour';
        }
        if (period === '30d') {
          interval = '30 days';
          groupInterval = 'day';
        }
        
        timeFilter = ` AND created_at >= NOW() - INTERVAL '${interval}'`;
      }

      if (metric === 'visitors') {
        const result = await db.query(
          `SELECT 
             date_trunc('${groupInterval}', created_at) as time,
             count(distinct COALESCE(session_id, id::text)) as value
           FROM events 
           WHERE project_id = $1 ${timeFilter}
           GROUP BY 1 ORDER BY 1 ASC`,
          timeParams
        );
        return NextResponse.json(result.rows);
      }

      if (metric === 'auths') {
        const result = await db.query(
          `SELECT 
             date_trunc('${groupInterval}', created_at) as time,
             count(*) as value
           FROM events 
           WHERE project_id = $1 AND type = 'auth' ${timeFilter}
           GROUP BY 1 ORDER BY 1 ASC`,
          timeParams
        );
        return NextResponse.json(result.rows);
      }

      if (metric === 'errors') {
        const result = await db.query(
          `SELECT 
             date_trunc('${groupInterval}', created_at) as time,
             count(*) as value
           FROM events 
           WHERE project_id = $1 AND status_code >= 400 ${timeFilter}
           GROUP BY 1 ORDER BY 1 ASC`,
          timeParams
        );
        return NextResponse.json(result.rows);
      }

      if (metric === 'avg_duration') {
        const result = await db.query(
          `SELECT 
             date_trunc('${groupInterval}', created_at) as time,
             avg(duration) as value
           FROM events 
           WHERE project_id = $1 ${timeFilter}
           GROUP BY 1 ORDER BY 1 ASC`,
          timeParams
        );
        return NextResponse.json(result.rows);
      }

      if (metric === 'requests') {
        const result = await db.query(
          `SELECT 
             date_trunc('${groupInterval}', created_at) as time,
             count(*) as value
           FROM events 
           WHERE project_id = $1 ${timeFilter}
           GROUP BY 1 ORDER BY 1 ASC`,
          timeParams
        );
        return NextResponse.json(result.rows);
      }
    }

    let query = 'SELECT * FROM events WHERE project_id = $1';
    const params: (string | number)[] = [projectId];

    if (type) {
      params.push(type);
      query += ` AND type = $${params.length}`;
    }

    if (from) {
      params.push(from);
      query += ` AND created_at >= $${params.length}`;
    }

    if (to) {
      params.push(to);
      query += ` AND created_at <= $${params.length}`;
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await db.query(query, params);

    // If fetching for table (raw events), ensure we return metadata correctly
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Fetch events error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
