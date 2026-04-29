import { query } from './server/config/db.js';

async function run() {
  const zoneId = '5dc15751-2c93-4673-8a85-00b396e1188d';
  const result = await query(`
    SELECT
      COUNT(*) as total,
      COUNT(*) FILTER (WHERE status = 'Active') as active,
      COUNT(*) FILTER (WHERE status = 'Inactive') as inactive,
      COUNT(*) FILTER (WHERE status = 'Visitor') as visitor
    FROM members WHERE zone_id = $1
  `, [zoneId]);
  console.log(result.rows);
  process.exit();
}
run();
