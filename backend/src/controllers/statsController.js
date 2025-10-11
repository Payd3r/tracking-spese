import pool from '../config/database.js';
import { convertCurrency } from '../services/currencyService.js';

export const getDashboardStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const defaultCurrency = req.user.default_currency;
    const { period = 'month' } = req.query; // day, week, month, year
    
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
    
    // Get daily spending trend for chart (last 7 days)
    const trendResult = await pool.query(
      `SELECT 
        DATE(t.transaction_date) as date,
        SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END) as expense,
        SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END) as income,
        a.currency
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       WHERE t.user_id = $1 AND t.transaction_date >= NOW() - INTERVAL '7 days'
       GROUP BY DATE(t.transaction_date), a.currency
       ORDER BY date ASC`,
      [userId]
    );
    
    // Aggregate by date and convert to default currency
    const trendMap = new Map();
    
    for (const trend of trendResult.rows) {
      const dateKey = trend.date.toISOString().split('T')[0];
      
      const expenseInDefault = await convertCurrency(
        parseFloat(trend.expense),
        trend.currency,
        defaultCurrency
      );
      
      const incomeInDefault = await convertCurrency(
        parseFloat(trend.income),
        trend.currency,
        defaultCurrency
      );
      
      if (trendMap.has(dateKey)) {
        trendMap.get(dateKey).expense += expenseInDefault;
        trendMap.get(dateKey).income += incomeInDefault;
      } else {
        trendMap.set(dateKey, {
          date: dateKey,
          expense: expenseInDefault,
          income: incomeInDefault
        });
      }
    }
    
    const trend = Array.from(trendMap.values()).sort((a, b) => 
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


