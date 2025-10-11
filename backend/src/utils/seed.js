import pool from '../config/database.js';

const defaultCategories = [
  // Expense categories
  { name: 'Fast Food', icon: '🍔', color: 'gradient-green', type: 'expense' },
  { name: 'Grocerie', icon: '🛒', color: 'gradient-purple', type: 'expense' },
  { name: 'Taxi', icon: '🚕', color: 'gradient-pink', type: 'expense' },
  { name: 'Shopping', icon: '🛍️', color: 'gradient-teal', type: 'expense' },
  { name: 'Food', icon: '🍔', color: 'gradient-green', type: 'expense' },
  { name: 'Transport', icon: '🚕', color: 'gradient-pink', type: 'expense' },
  { name: 'Bills', icon: '📄', color: 'gradient-blue', type: 'expense' },
  { name: 'Entertainment', icon: '🎮', color: 'gradient-teal', type: 'expense' },
  
  // Income categories
  { name: 'Stipendio', icon: '💰', color: 'gradient-blue', type: 'income' },
  { name: 'Salary', icon: '💰', color: 'gradient-blue', type: 'income' },
  { name: 'Freelance', icon: '💼', color: 'gradient-green', type: 'income' },
  { name: 'Investimenti', icon: '📈', color: 'gradient-purple', type: 'income' },
];

async function seed() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    // Check if categories already exist
    const { rows } = await client.query(
      'SELECT COUNT(*) as count FROM categories WHERE is_system = true'
    );
    
    if (parseInt(rows[0].count) > 0) {
      console.log('⚠️  System categories already exist, skipping seed...');
      await client.query('ROLLBACK');
      return;
    }
    
    // Insert default categories
    for (const category of defaultCategories) {
      await client.query(
        `INSERT INTO categories (name, icon, color, type, is_system, user_id)
         VALUES ($1, $2, $3, $4, true, NULL)`,
        [category.name, category.icon, category.color, category.type]
      );
    }
    
    await client.query('COMMIT');
    console.log('✅ Seed completed successfully!');
    console.log(`   Created ${defaultCategories.length} default categories`);
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(console.error);


