import pool from '../config/database.js';
import { convertCurrency } from '../services/currencyService.js';

export const getCategoryStats = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const defaultCurrency = req.user.default_currency;
    const { type = 'expense' } = req.query; // 'income' or 'expense'

    const categoryStatsResult = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.icon,
        c.color,
        c.type,
        COALESCE(SUM(t.amount), 0) as total,
        COALESCE(a.currency, $3) as currency
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id 
         AND t.user_id = $1 
         AND t.type = $2
       LEFT JOIN accounts a ON t.account_id = a.id
       WHERE (c.user_id = $1 OR c.is_system = true)
         AND c.type = $2
         AND COALESCE(c.exclude_from_totals, false) = false
         AND c.name NOT IN ('Trasferimento', 'Prestito', 'Restituzione prestito')
       GROUP BY c.id, c.name, c.icon, c.color, c.type, a.currency
       ORDER BY total DESC, c.name ASC`,
      [userId, type, defaultCurrency]
    );

    const categoryMap = new Map();

    for (const cat of categoryStatsResult.rows) {
      const amountInDefault = parseFloat(cat.total) > 0
        ? await convertCurrency(
            parseFloat(cat.total),
            cat.currency,
            defaultCurrency
          )
        : 0;

      if (categoryMap.has(cat.id)) {
        categoryMap.get(cat.id).amount += amountInDefault;
        categoryMap.get(cat.id).total += amountInDefault;
      } else {
        categoryMap.set(cat.id, {
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          type: cat.type,
          amount: amountInDefault,
          total: amountInDefault
        });
      }
    }

    const allTimeCategoryTotal = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0);

    const categoryStats = Array.from(categoryMap.values())
      .map(cat => ({
        ...cat,
        percentage: allTimeCategoryTotal > 0
          ? Math.round((cat.amount / allTimeCategoryTotal) * 100)
          : 0
      }))
      .sort((a, b) => {
        if (b.amount !== a.amount) {
          return b.amount - a.amount;
        }
        return a.name.localeCompare(b.name);
      });

    res.json({
      categories: categoryStats,
      total: allTimeCategoryTotal
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

    // Calculate date range matching frontend logic exactly
    const now = new Date(); // This matches 'now' in frontend
    let startDate = new Date(now);
    let endDate = new Date(now);

    switch (period) {
      case 'day':
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case 'week':
        startDate.setDate(now.getDate() - 7);
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
        break;
      case 'month':
      default:
        // Frontend uses 28 days for 'month' view (4 weeks)
        startDate.setDate(now.getDate() - 28);
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
        t.type,
        SUM(t.amount) as total,
        a.currency
       FROM transactions t
       JOIN accounts a ON t.account_id = a.id
       JOIN categories c ON t.category_id = c.id
       WHERE t.user_id = $1 AND t.transaction_date >= $2 AND t.transaction_date <= $3
         AND COALESCE(c.exclude_from_totals, false) = false
         AND c.name NOT IN ('Trasferimento', 'Prestito', 'Restituzione prestito')
       GROUP BY t.type, a.currency`,
      [userId, startDate, endDate]
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

    // Get all-time spending/income by category across the whole database
    const categoryStatsResult = await pool.query(
      `SELECT 
        c.id,
        c.name,
        c.icon,
        c.color,
        c.type,
        COALESCE(SUM(t.amount), 0) as total,
        COALESCE(a.currency, $3) as currency
       FROM categories c
       LEFT JOIN transactions t ON t.category_id = c.id 
         AND t.user_id = $1 
         AND t.type = $2
       LEFT JOIN accounts a ON t.account_id = a.id
       WHERE (c.user_id = $1 OR c.is_system = true)
         AND c.type = $2
         AND COALESCE(c.exclude_from_totals, false) = false
         AND c.name NOT IN ('Trasferimento', 'Prestito', 'Restituzione prestito')
       GROUP BY c.id, c.name, c.icon, c.color, c.type, a.currency
       ORDER BY total DESC, c.name ASC`,
      [userId, type, defaultCurrency]
    );

    // Aggregate categories and convert to default currency
    const categoryMap = new Map();

    for (const cat of categoryStatsResult.rows) {
      const amountInDefault = parseFloat(cat.total) > 0
        ? await convertCurrency(
            parseFloat(cat.total),
            cat.currency,
            defaultCurrency
          )
        : 0;

      if (categoryMap.has(cat.id)) {
        categoryMap.get(cat.id).amount += amountInDefault;
        categoryMap.get(cat.id).total += amountInDefault;
      } else {
        categoryMap.set(cat.id, {
          id: cat.id,
          name: cat.name,
          icon: cat.icon,
          color: cat.color,
          type: cat.type,
          amount: amountInDefault,
          total: amountInDefault
        });
      }
    }

    const allTimeCategoryTotal = Array.from(categoryMap.values()).reduce((sum, cat) => sum + cat.amount, 0);

    const categoryStats = Array.from(categoryMap.values())
      .map(cat => ({
        ...cat,
        percentage: allTimeCategoryTotal > 0
          ? Math.round((cat.amount / allTimeCategoryTotal) * 100)
          : 0
      }))
      .sort((a, b) => {
        if (b.amount !== a.amount) {
          return b.amount - a.amount;
        }
        return a.name.localeCompare(b.name);
      });

    // NEW TREND CALCULATION LOGIC TO MATCH FRONTEND EXACTLY
    // We fetch raw data points and aggregate them in JS to ensure perfect alignment

    // Note: We use the same date range as the "Total" calculation above
    const trendQuery = `
      SELECT 
        t.transaction_date,
        t.amount,
        a.currency
      FROM transactions t
      JOIN accounts a ON t.account_id = a.id
      JOIN categories c ON t.category_id = c.id
      WHERE t.user_id = $1 
        AND t.type = $2 
        AND t.transaction_date >= $3 
        AND t.transaction_date <= $4
        AND COALESCE(c.exclude_from_totals, false) = false
        AND c.name NOT IN ('Trasferimento', 'Prestito', 'Restituzione prestito')
      ORDER BY t.transaction_date ASC`;

    const trendResult = await pool.query(trendQuery, [userId, type, startDate, endDate]);

    // Initialize data points based on period (matching frontend logic)
    let dataPoints = [];

    if (period === 'day') {
      for (let i = 0; i < 6; i++) {
        // HH:MM format for 4-hour intervals
        const hour = i * 4;
        const timeLabel = `${String(hour).padStart(2, '0')}:00`;
        dataPoints.push({ date: timeLabel, amount: 0, index: i });
      }
    } else if (period === 'week') {
      for (let i = 0; i < 7; i++) {
        dataPoints.push({ date: `Day ${i}`, amount: 0, index: i });
      }
    } else if (period === 'month') {
      for (let i = 1; i <= 4; i++) {
        dataPoints.push({ date: `W${i}`, amount: 0, index: i - 1 });
      }
    } else if (period === 'year') {
      for (let i = 0; i < 12; i++) {
        dataPoints.push({ date: `Month ${i}`, amount: 0, index: i });
      }
    }

    // Aggregate data into points
    for (const tx of trendResult.rows) {
      const amountInDefault = await convertCurrency(
        parseFloat(tx.amount),
        tx.currency,
        defaultCurrency
      );

      const txDate = new Date(tx.transaction_date);
      let index = -1;

      if (period === 'day') {
        // Match frontend: index = floor(hour / 4)
        index = Math.min(Math.max(Math.floor(txDate.getHours() / 4), 0), 5);
      } else if (period === 'week') {
        // Match frontend: day of week index (Mon=0...Sun=6)
        const day = txDate.getDay();
        index = day === 0 ? 6 : day - 1;
      } else if (period === 'month') {
        // Match frontend: 4 buckets of 7 days relative to startDate
        const diffTime = txDate.getTime() - startDate.getTime();
        const diffDays = Math.floor(diffTime / (24 * 60 * 60 * 1000));
        index = Math.min(Math.max(Math.floor(diffDays / 7), 0), 3);
      } else if (period === 'year') {
        // Match frontend: Month index (0-11)
        index = txDate.getMonth();
      }

      if (index !== -1 && index < dataPoints.length) {
        dataPoints[index].amount += amountInDefault;
      }
    }

    // Format for response 
    const trend = dataPoints.map(dp => ({
      date: dp.date,
      amount: dp.amount
    }));

    res.json({
      currency: defaultCurrency,
      totalBalance: parseFloat(totalBalance.toFixed(2)),
      period: {
        name: period,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
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
