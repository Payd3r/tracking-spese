import { getSupportedCurrencies, convertCurrency } from '../services/currencyService.js';
import { ValidationError } from '../middleware/errorHandler.js';

export const getCurrencies = async (req, res, next) => {
  try {
    const currencies = await getSupportedCurrencies();
    res.json({ currencies });
  } catch (error) {
    next(error);
  }
};

export const convert = async (req, res, next) => {
  try {
    const { amount, from, to } = req.query;
    
    if (!amount || !from || !to) {
      throw new ValidationError('Parametri richiesti: amount, from, to');
    }
    
    const amountNum = parseFloat(amount);
    
    if (isNaN(amountNum) || amountNum < 0) {
      throw new ValidationError('Importo non valido');
    }
    
    const converted = await convertCurrency(amountNum, from, to);
    
    res.json({
      amount: amountNum,
      from,
      to,
      converted
    });
  } catch (error) {
    next(error);
  }
};


