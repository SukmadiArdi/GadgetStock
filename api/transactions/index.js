// api/transactions/index.js - GET /api/transactions, POST /api/transactions
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function generateTxnNumber() {
  const rand = Math.floor(100 + Math.random() * 900);
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  return `TXN-${rand}-${letter}`;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    // ── GET: list transactions ───────────────────────────────────
    if (req.method === 'GET') {
      const { date, start_date, end_date, method, status, page = 1, limit = 20, search = '' } = req.query;
      const offset = (parseInt(page) - 1) * parseInt(limit);

      let query = supabase
        .from('transactions')
        .select(`*, transaction_items(product_name, quantity, unit_price, subtotal)`, { count: 'exact' })
        .order('created_at', { ascending: false })
        .range(offset, offset + parseInt(limit) - 1);

      if (date) {
        query = query.gte('created_at', `${date}T00:00:00`).lte('created_at', `${date}T23:59:59`);
      } else if (start_date && end_date) {
        query = query.gte('created_at', `${start_date}T00:00:00`).lte('created_at', `${end_date}T23:59:59`);
      }
      if (method) query = query.eq('payment_method', method);
      if (status) query = query.eq('status', status);
      if (search) query = query.or(`txn_number.ilike.%${search}%,customer_name.ilike.%${search}%`);

      const { data, error, count } = await query;
      if (error) throw error;

      return res.status(200).json({
        transactions: data,
        pagination: { total: count, page: parseInt(page), limit: parseInt(limit), pages: Math.ceil(count / parseInt(limit)) }
      });
    }

    // ── POST: create transaction ─────────────────────────────────
    if (req.method === 'POST') {
      const { items, customer_name, payment_method, cash_received, cashier_id, terminal, notes } = req.body;

      if (!items || !items.length) return res.status(400).json({ error: 'items are required' });
      if (!payment_method) return res.status(400).json({ error: 'payment_method is required' });

      // Calculate totals
      const taxRate = parseFloat(process.env.TAX_RATE || 0.085);
      const subtotal   = items.reduce((s, i) => s + (i.unit_price * i.quantity), 0);
      const tax_amount = Math.round(subtotal * taxRate);
      const total      = subtotal + tax_amount;
      const change_amount = payment_method === 'cash' && cash_received
        ? Math.max(0, parseInt(cash_received) - total) : 0;

      // Verify stock availability
      for (const item of items) {
        const { data: product } = await supabase.from('products').select('stock, name').eq('id', item.product_id).single();
        if (!product) return res.status(400).json({ error: `Product ${item.product_id} not found` });
        if (product.stock < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for ${product.name} (available: ${product.stock})` });
        }
      }

      // Create transaction header
      const txnNumber = generateTxnNumber();
      const { data: txn, error: txnErr } = await supabase.from('transactions').insert({
        txn_number: txnNumber,
        cashier_id: cashier_id || null,
        customer_name: customer_name || 'Walk-in Customer',
        subtotal, tax_amount, total,
        payment_method,
        cash_received: cash_received ? parseInt(cash_received) : null,
        change_amount,
        terminal: terminal || 'Terminal 01',
        notes,
        status: 'completed'
      }).select().single();
      if (txnErr) throw txnErr;

      // Insert transaction items & update stock
      for (const item of items) {
        const itemSubtotal = item.unit_price * item.quantity;

        await supabase.from('transaction_items').insert({
          transaction_id: txn.id,
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          quantity: item.quantity,
          unit_price: item.unit_price,
          subtotal: itemSubtotal
        });

        // Decrement stock
        const { data: prod } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
        const newStock = (prod?.stock || 0) - item.quantity;
        await supabase.from('products').update({ stock: Math.max(0, newStock) }).eq('id', item.product_id);

        // Stock log
        await supabase.from('stock_logs').insert({
          product_id: item.product_id,
          change_type: 'sale',
          qty_before: prod?.stock || 0,
          qty_change: -item.quantity,
          qty_after: Math.max(0, newStock),
          note: `Sale: ${txnNumber}`,
          transaction_id: txn.id,
          created_by: cashier_id || null
        });
      }

      // Return full transaction with items
      const { data: fullTxn } = await supabase
        .from('transactions')
        .select(`*, transaction_items(*)`)
        .eq('id', txn.id)
        .single();

      return res.status(201).json(fullTxn);
    }

    res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('Transactions error:', err);
    res.status(500).json({ error: err.message });
  }
};
