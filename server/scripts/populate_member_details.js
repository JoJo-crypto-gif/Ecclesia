import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const { Pool } = pg;
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

async function populateDetails() {
  const client = await pool.connect();
  try {
    console.log('--- Populating Member Details ---');
    
    // Fetch all members
    const res = await client.query('SELECT id, first_name, last_name FROM members');
    const members = res.rows;
    console.log(`Found ${members.length} members to update.`);

    const ghanaCities = ['Accra', 'Kumasi', 'Tamale', 'Takoradi', 'Ashiama', 'Cape Coast', 'Obuasi', 'Teshie', 'Tema', 'Koforidua'];
    const ghanaNeighborhoods = ['East Legon', 'Cantonments', 'Osu', 'Airport Residential', 'Labone', 'Dzorwulu', 'Spintex', 'Ridge', 'Roman Ridge', 'West Legon'];
    
    let updatedCount = 0;

    for (const member of members) {
      // Generate random DOB (Age 18 to 75)
      const year = 2026 - (Math.floor(Math.random() * (75 - 18 + 1)) + 18);
      const month = Math.floor(Math.random() * 12);
      const day = Math.floor(Math.random() * 28) + 1;
      const dob = new Date(year, month, day).toISOString().split('T')[0];

      // Generate random Ghana address
      const city = ghanaCities[Math.floor(Math.random() * ghanaCities.length)];
      const neighborhood = ghanaNeighborhoods[Math.floor(Math.random() * ghanaNeighborhoods.length)];
      const houseNum = Math.floor(Math.random() * 500) + 1;
      const address = `No. ${houseNum}, ${neighborhood} Ave, ${city}, Ghana`;

      await client.query(
        'UPDATE members SET dob = $1, address = $2, updated_at = NOW() WHERE id = $3',
        [dob, address, member.id]
      );
      updatedCount++;
    }

    console.log(`Successfully updated ${updatedCount} members.`);
    console.log('---------------------------------');
  } catch (err) {
    console.error('Error populating details:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

populateDetails();
