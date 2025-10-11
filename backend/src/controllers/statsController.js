import pool from '../config/database.js';
import { convertCurrency } from '../services/currencyService.js';

export const getCategoryStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const defaultCurrency = req.user.default_currency;
    const { type } = req.query; // 'income' or 'expense'
    
    // Get all categories of the specified type
    let categoryQuery = `
      SELECT id, name, icon, color, type
      FROM categories
      WHERE (user_id = $1 OR is_system = true)
    `;
    
    const categoryParams = [userId];
    
    if (type) {
      categoryQuery += ' AND type = $2';
      categoryParams.push(type);
    }
    
    categoryQuery += ' ORDER BY is_system DESC, name ASC';
    
    const categoriesResult = await pool.query(categoryQuery, categoryParams);
    
    // Get totals for each category
    const categoryStats = await Promise.all(
      categoriesResult.rows.map(async (category) => {
        const statsResult = await pool.query(
          `SELECT 
            SUM(t.amount) as total,
            a.currency
           FROM transactions t
           JOIN accounts a ON t.account_id = a.id
           WHERE t.user_id = $1 AND t.category_id = $2
           GROUP BY a.currency`,
          [userId, category.id]
        );
        
        let totalAmount = 0;
        
        // Convert all amounts to default currency
        for (const stat of statsResult.rows) {
          const amountInDefault = await convertCurrency(
            parseFloat(stat.total),
            stat.currency,
            defaultCurrency
          );
          totalAmount += amountInDefault;
        }
        
        return {
          id: category.id,
          name: category.name,
          icon: category.icon,
          color: category.color,
          type: category.type,
          total: totalAmount
        };
      })
    );
    
    // Calculate total for all categories of this type
    const totalForType = categoryStats.reduce((sum, cat) => sum + cat.total, 0);
    
    // Calculate percentage for each category
    const categoryStatsWithPercentage = categoryStats.map(cat => ({
      ...cat,
      percentage: totalForType > 0 ? Math.round((cat.total / totalForType) * 100) : 0
    }));
    
    res.json({
      categories: categoryStatsWithPercentage,
      total: totalForType
    });
  } catch (error) {
    next(error);
  }
};

export const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const defaultCurrency = req.user.default_currency;
    const { period = 'month', type = 'expense' } = req.query; // day, week, month, year and income/expense
    
    // Calculate date range
    const now = new Date();
    let startDate;
    
    switch (period) {
      case 'day':
        startDate = new Date(now);
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'week':
        startDate = new Date(now);
        startDate.setDate(now.getDate() - 7);
        break;
      case 'year':
        startDate = new Date(now);
        startDate.setFullYear(now.getFullYear() - 1);
        break;
      case 'month':
      default:
        startDate = new Date(now);
        startDate.setMonth(now.getMonth() - 1);
        break;
    }
    
    // Get all accounts with their balances
    const accountsResult = await pool.query(
      `SELECT 
        a.id, 
        a.name, 
        a.icon, 
        a.currency,
        COALESCE(
          (SELECT SUM(CASE WHEN type = 'income' THEN amount ELSE -amount END)
           FROM transactions WHERE account_id = a.id), 0
        ) +
        COALESCE(
          (SELECT SUM(to_amount) FROM transfers WHERE to_account_id = a.id), 0
        ) -
        COALESCE(
          (SELECT SUM(from_amount) FROM transfers WHERE from_account_id = a.id), 0
        ) as balance
       FROM accounts a
       WHERE a.user_id = $1
       ORDER BY a.created_at ASC`,
      [userId]
    );
    
    // Convert all balances to default currency
    let totalBalance = 0;
    for (const account of accountsResult.rows) {
      const balanceInDefault = await convertCurrency(
        parseFloat(account.balance),
        account.currency,
        defaultCurrency
      );
      totalBalance += balanceInDefault;
    }
    
    // Get income and expense for period
    const periodStatsResult = await pool.query(
      `SELECT 
        type,
        SUM(amount) as total,
        a.currency
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE t.user_id = $1 AND t.transaction_date >= $2
       GROUP BY type, a.currency`,
      [userId, startDate]
    );
    
    // Convert and aggregate by type
    let totalIncome = 0;
    let totalExpense = 0;
    
    for (const stat of periodStatsResult.rows) {
      const amountInDefault = await convertCurrency(
        parseFloat(stat.total),
        stat.currency,
        defaultCurrency
      );
      
      if (stat.type === 'income') {
        totalIncome += amountInDefault;
      } else {
        totalExpense += amountInDefault;
      }
    }
    
    // Get recent transactions (last 10)
    const recentTransactionsResult = await pool.query(
      `SELECT 
        t.id, 
        t.amount,
        t.type,
        t.title,
        t.transaction_date,
        a.currency,
        c.name as category_name,
        c.icon as category_icon
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1
       ORDER BY t.transaction_date DESC, t.created_at DESC
       LIMIT 10`,
      [userId]
    );
    
    // Convert recent transactions to default currency
    const recentTransactions = await Promise.all(
      recentTransactionsResult.rows.map(async (t) => {
        const amountInDefault = await convertCurrency(
          parseFloat(t.amount),
          t.currency,
          defaultCurrency
        );
        
        return {
          id: t.id,
          title: t.title,
          amount: amountInDefault,
          type: t.type,
          categoryName: t.category_name,
          categoryIcon: t.category_icon,
          transactionDate: t.transaction_date
        };
      })
    );
    
    // Get spending by category for period
    const categoryStatsResult = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.icon,
        c.color,
        SUM(t.amount) as total,
        a.currency
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1 AND t.type = 'expense' AND t.transaction_date >= $2
       GROUP BY c.id, c.name, c.icon, c.color, a.currency
       ORDER BY total DESC`,
      [userId, startDate]
    );
    
    // Aggregate categories and convert to default currency
    const categoryMap = new Map();
    
    for (const cat of categoryStatsResult.rows) {
      const amountInDefault = await convertCurrency(
        parseFloat(cat.total),
        cat.currency,
        defaultCurrency
      );
      
      if (categoryMap.has(cat.id)) {
        categoryMap.get(cat.id).amount += amountInDefault;
      } else {
        categoryMap.set(cat.id, {
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          amount: amountInDefault
        });
      }
    }
    
    const categoryStats = Array.from(categoryMap.values())
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10); // Top 10 categories
    
    // Calculate percentage for each category
    const totalCategorySpending = categoryStats.reduce((sum, cat) => sum + cat.amount, 0);
    categoryStats.forEach(cat => {
      cat.percentage = totalCategorySpending > 0 
        ? Math.round((cat.amount / totalCategorySpending) * 100) 
        : 0;
    });
    
    // Get trend data based on period
    let trendQuery;
    let trendInterval;
    
    switch (period) {
      case 'day':
        // Get hourly data for the current day
        trendQuery = `
          SELECT 
            DATE_TRUNC('hour', t.transaction_date) as date,
            SUM(t.amount) as amount,
            a.currency
           FROM transactions t
           JOIN accounts a ON t.account_id = a.id
           WHERE t.user_id = $1 AND DATE(t.transaction_date) = CURRENT_DATE AND t.type = $2
           GROUP BY DATE_TRUNC('hour', t.transaction_date), a.currency
           ORDER BY date ASC`;
        break;
      case 'week':
        // Get daily data for the last 7 days
        trendQuery = `
          SELECT 
            DATE(t.transaction_date) as date,
            SUM(t.amount) as amount,
            a.currency
           FROM transactions t
           JOIN accounts a ON t.account_id = a.id
           WHERE t.user_id = $1 AND t.transaction_date >= NOW() - INTERVAL '7 days' AND t.type = $2
           GROUP BY DATE(t.transaction_date), a.currency
           ORDER BY date ASC`;
        break;
      case 'month':
        // Get weekly data for the last 4 weeks
        trendQuery = `
          SELECT 
            DATE_TRUNC('week', t.transaction_date) as date,
            SUM(t.amount) as amount,
            a.currency
           FROM transactions t
           JOIN accounts a ON t.account_id = a.id
           WHERE t.user_id = $1 AND t.transaction_date >= NOW() - INTERVAL '4 weeks' AND t.type = $2
           GROUP BY DATE_TRUNC('week', t.transaction_date), a.currency
           ORDER BY date ASC`;
        break;
      case 'year':
        // Get monthly data for the current year
        const currentYear = new Date().getFullYear();
        trendQuery = `
          SELECT 
            DATE_TRUNC('month', t.transaction_date) as date,
            SUM(t.amount) as amount,
            a.currency
           FROM transactions t
           JOIN accounts a ON t.account_id = a.id
           WHERE t.user_id = $1 AND EXTRACT(YEAR FROM t.transaction_date) = $2 AND t.type = $3
           GROUP BY DATE_TRUNC('month', t.transaction_date), a.currency
           ORDER BY date ASC`;
        break;
      default:
        // Default to daily data for the last 7 days
        trendQuery = `
          SELECT 
            DATE(t.transaction_date) as date,
            SUM(t.amount) as amount,
            a.currency
           FROM transactions t
           JOIN accounts a ON t.account_id = a.id
           WHERE t.user_id = $1 AND t.transaction_date >= NOW() - INTERVAL '7 days' AND t.type = $2
           GROUP BY DATE(t.transaction_date), a.currency
           ORDER BY date ASC`;
    }
    
    // Execute trend query with appropriate parameters
    let trendParams = [userId];
    if (period === 'year') {
      const currentYear = new Date().getFullYear();
      trendParams.push(currentYear, type);
    } else {
      trendParams.push(type);
    }
    
    const trendResult = await pool.query(trendQuery, trendParams);
    
    // Aggregate by date and convert to default currency
    const trendMap = new Map();
    
    for (const trend of trendResult.rows) {
      let dateKey;
      
      // Format date key based on period
      switch (period) {
        case 'day':
          dateKey = trend.date.toISOString().split('T')[1].substring(0, 5); // HH:MM
          break;
        case 'week':
          dateKey = trend.date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'month':
          dateKey = trend.date.toISOString().split('T')[0]; // YYYY-MM-DD
          break;
        case 'year':
          dateKey = trend.date.toISOString().split('T')[0].substring(0, 7); // YYYY-MM
          break;
        default:
          dateKey = trend.date.toISOString().split('T')[0];
      }
      
      const amountInDefault = await convertCurrency(
        parseFloat(trend.amount),
        trend.currency,
        defaultCurrency
      );
      
      if (trendMap.has(dateKey)) {
        trendMap.get(dateKey).amount += amountInDefault;
      } else {
        trendMap.set(dateKey, {
          date: trend.date.toISOString(),
          displayDate: dateKey,
          amount: amountInDefault
        });
      }
    }
    
    // Fill missing data points based on period
    const filledTrend = [];
    const currentTime = new Date();
    let maxPoints;
    
    switch (period) {
      case 'day':
        maxPoints = 6; // Show 6 time slots (4-hour intervals)
        for (let i = 0; i < maxPoints; i++) {
          const hour = i * 4;
          const date = new Date(currentTime);
          date.setHours(hour, 0, 0, 0);
          const dateKey = date.toISOString().split('T')[1].substring(0, 5);
          const amount = trendMap.get(dateKey)?.amount || 0;
          
          filledTrend.push({
            date: date.toISOString(),
            displayDate: dateKey,
            amount: amount
          });
        }
        break;
      case 'week':
        maxPoints = 7; // Show 7 days
        for (let i = 6; i >= 0; i--) {
          const date = new Date(currentTime);
          date.setDate(date.getDate() - i);
          const dateKey = date.toISOString().split('T')[0];
          const amount = trendMap.get(dateKey)?.amount || 0;
          
          filledTrend.push({
            date: date.toISOString(),
            displayDate: dateKey,
            amount: amount
          });
        }
        break;
      case 'month':
        maxPoints = 4; // Show 4 weeks
        for (let i = 3; i >= 0; i--) {
          const date = new Date(currentTime);
          date.setDate(date.getDate() - (i * 7));
          const dateKey = date.toISOString().split('T')[0];
          const amount = trendMap.get(dateKey)?.amount || 0;
          
          filledTrend.push({
            date: date.toISOString(),
            displayDate: dateKey,
            amount: amount
          });
        }
        break;
      case 'year':
        maxPoints = 12; // Show all 12 months of current year
        for (let i = 0; i < 12; i++) {
          const date = new Date(currentTime.getFullYear(), i, 1); // Current year, month i+1, day 1
          const dateKey = date.toISOString().split('T')[0].substring(0, 7);
          
          // Get actual data or 0
          const amount = trendMap.get(dateKey)?.amount || 0;
          
          filledTrend.push({
            date: date.toISOString(),
            displayDate: dateKey,
            amount: amount
          });
        }
        break;
      default:
        filledTrend.push(...Array.from(trendMap.values()));
    }
    
    const trend = filledTrend.sort((a, b) => 
      new Date(a.date) - new Date(b.date)
    );
    
    res.json({
      currency: defaultCurrency,
      totalBalance: parseFloat(totalBalance.toFixed(2)),
      period: {
        name: period,
        startDate,
        endDate: now,
        totalIncome: parseFloat(totalIncome.toFixed(2)),
        totalExpense: parseFloat(totalExpense.toFixed(2)),
        netIncome: parseFloat((totalIncome - totalExpense).toFixed(2))
      },
      recentTransactions,
      categoryStats,
      trend
    });
  } catch (error) {
    next(error);
  }
};


