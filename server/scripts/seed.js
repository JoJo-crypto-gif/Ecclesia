import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env BEFORE importing db
const dotenvModule = await import('dotenv');
dotenvModule.config({ path: path.resolve(__dirname, '..', '.env') });

const { query, testConnection } = await import('../config/db.js');
const bcrypt = (await import('bcrypt')).default;

async function seed() {
  console.log('🌱 Seeding database...');

  const connected = await testConnection();
  if (!connected) {
    console.error('❌ Database not connected');
    process.exit(1);
  }

  try {
    // 1. Create one more zone: "East Zone" if it doesn't exist
    let eastZone = (await query("SELECT * FROM zones WHERE name = 'East Zone'")).rows[0];
    if (!eastZone) {
      console.log('Creating East Zone...');
      eastZone = (await query(`
        INSERT INTO zones (name, description, meeting_time)
        VALUES ('East Zone', 'Eastern district outreach', 'Tuesday 6pm')
        RETURNING *
      `)).rows[0];
    } else {
      console.log('East Zone already exists.');
    }

    // Get all zones to assign members to
    const zones = (await query('SELECT id FROM zones')).rows;
    if (zones.length === 0) {
      throw new Error('No zones found to assign members to.');
    }

    // 2. Generate 45 dummy members
    const firstNames = ['Kwame', 'Kofi', 'Ama', 'Akosua', 'Yaw', 'Abena', 'Kojo', 'Esi', 'Kwabena', 'Afua', 'Kweku', 'Adjoa', 'Kwesi', 'Yaa', 'Samuel', 'Emmanuel', 'Grace', 'Mercy', 'Joseph', 'Mary'];
    const lastNames = ['Mensah', 'Owusu', 'Appiah', 'Asare', 'Boateng', 'Osei', 'Antwi', 'Darko', 'Frimpong', 'Agyemang', 'Boakye', 'Sarpong', 'Nyarko', 'Opoku', 'Amoah'];
    const roles = ['Member', 'Worker', 'Choir', 'Usher', 'Deacon', 'Elder'];
    
    const membersToInsert = [];
    for (let i = 0; i < 45; i++) {
        const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
        const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
        const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i + 100}@church.org`; // ensure uniqueness
        const phone = `0${Math.floor(Math.random() * 900000000 + 100000000)}`;
        const status = Math.random() > 0.8 ? 'Inactive' : 'Active';
        const role = roles[Math.floor(Math.random() * roles.length)];
        const zoneId = zones[Math.floor(Math.random() * zones.length)].id;
        const gender = Math.random() > 0.5 ? 'Male' : 'Female';

        membersToInsert.push({
            firstName, lastName, email, phone, status, role, zoneId, gender
        });
    }

    console.log(`Preparing to insert ${membersToInsert.length} members...`);

    // 3. Batch insert members
    for (const m of membersToInsert) {
        // Check if email happens to exist (unlikely with i+100 but safe)
        const existing = (await query('SELECT id FROM members WHERE email = $1', [m.email])).rows[0];
        if (!existing) {
            await query(`
                INSERT INTO members (first_name, last_name, email, phone, status, role, zone_id, gender, join_date)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, CURRENT_DATE)
            `, [m.firstName, m.lastName, m.email, m.phone, m.status, m.role, m.zoneId, m.gender]);
        }
    }

    // 4. Assign zone leaders from existing members (one per zone if available)
    const allZones = (await query('SELECT id FROM zones')).rows;
    for (const z of allZones) {
      const leader = (await query(
        'SELECT id FROM members WHERE zone_id = $1 ORDER BY RANDOM() LIMIT 1',
        [z.id]
      )).rows[0];
      if (leader) {
        await query('UPDATE zones SET leader_id = $1 WHERE id = $2', [leader.id, z.id]);
      }
    }

    // 5. Create initial admin user if not exists
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@church.com').toLowerCase();
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin123';
    const existingAdmin = (await query('SELECT id FROM users WHERE email = $1', [adminEmail])).rows[0];
    if (!existingAdmin) {
      const passwordHash = await bcrypt.hash(adminPassword, 10);
      await query(
        `INSERT INTO users (name, email, password_hash, role)
         VALUES ($1, $2, $3, $4)`,
        ['Admin User', adminEmail, passwordHash, 'admin']
      );
      console.log(`Created admin user: ${adminEmail}`);
    } else {
      console.log('Admin user already exists.');
    }

    console.log('✅ Seeding complete!');
    process.exit(0);

  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
}

seed();
