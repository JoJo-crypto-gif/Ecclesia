import 'dotenv/config';
import { query } from '../config/db.js';

async function assignAvatars() {
  try {
    const membersResult = await query('SELECT id FROM members ORDER BY created_at DESC LIMIT 50');
    const members = membersResult.rows;

    if (members.length === 0) {
      console.log('No members found to update.');
      process.exit(0);
    }

    console.log(`Found ${members.length} members. Assigning avatars...`);

    for (let i = 0; i < members.length; i++) {
      const avatarIndex = (i % 10) + 1;
      const avatarUrl = `/uploads/avatars/member_${avatarIndex}.png`;
      
      await query(
        'UPDATE members SET avatar_url = $1, updated_at = NOW() WHERE id = $2',
        [avatarUrl, members[i].id]
      );
      
      console.log(`Updated member ${members[i].id} with avatar ${avatarUrl}`);
    }

    console.log('Successfully assigned avatars to all members!');
    process.exit(0);
  } catch (error) {
    console.error('Error assigning avatars:', error);
    process.exit(1);
  }
}

assignAvatars();
