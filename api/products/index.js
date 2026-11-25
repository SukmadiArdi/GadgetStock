// api/products/index.js - GET /api/products, POST /api/products
const { createClient } = require('@supabase/supabase-js');
const { resolveGadgetImage } = require('../../lib/image-helper');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

function applyStatusFilter(query, status) {
  if (status === 'low_stock') return query.lte('stock', 10).gt('stock', 0);
  if (status === 'out_of_stock') return query.eq('stock', 0);
  if (status === 'in_stock') return query.gt('stock', 10);
  return query;
}

async function handleGetProducts(req, res) {
  const { search = '', category = '', status = '', page = 1, limit = 20 } = req.query;
  const pageNum = Number.parseInt(page, 10) || 1;
  const limitNum = Number.parseInt(limit, 10) || 20;
  const offset = (pageNum - 1) * limitNum;

  let query = supabase
    .from('products')
    .select('*', { count: 'exact' })
    .eq('is_active', true)
    .order('name', { ascending: true })
    .range(offset, offset + limitNum - 1);

  if (search) query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,brand.ilike.%${search}%`);
  if (category) query = query.eq('category', category);
  query = applyStatusFilter(query, status);

  const { data, error, count } = await query;
  if (error) {
    if (error.code === 'PGRST103') {
      return res.status(200).json({
        products: [],
        pagination: { total: count || 0, page: 1, limit: limitNum, pages: 1 }
      });
    }
    throw error;
  }

  const totalCount = count || 0;
  return res.status(200).json({
    products: data || [],
    pagination: {
      total: totalCount,
      page: pageNum,
      limit: limitNum,
      pages: Math.ceil(totalCount / limitNum) || 1
    }
  });
}

async function handleCreateProduct(req, res) {
  const { sku, name, brand, category, description, price_sell, price_buy, stock, stock_min, image_url } = req.body;
  if (!sku || !name || !price_sell) {
    return res.status(400).json({ error: 'sku, name, price_sell are required' });
  }

  const parsedStock = Number.parseInt(stock, 10) || 0;
  const finalImageUrl = image_url || resolveGadgetImage(name, brand, category);

  const { data, error } = await supabase.from('products').insert({
    sku,
    name,
    brand,
    category,
    description,
    price_sell: Number.parseInt(price_sell, 10),
    price_buy: Number.parseInt(price_buy, 10) || 0,
    stock: parsedStock,
    stock_min: Number.parseInt(stock_min, 10) || 5,
    image_url: finalImageUrl
  }).select().single();
  if (error) throw error;

  if (parsedStock > 0) {
    await supabase.from('stock_logs').insert({
      product_id: data.id,
      change_type: 'initial',
      qty_before: 0,
      qty_change: parsedStock,
      qty_after: parsedStock,
      note: 'Initial stock entry'
    });
  }

  return res.status(201).json(data);
}

module.exports = async function handleProducts(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  try {
    if (req.method === 'GET') {
      return await handleGetProducts(req, res);
    }
    if (req.method === 'POST') {
      return await handleCreateProduct(req, res);
    }
    return res.status(405).json({ error: 'Method not allowed' });
  } catch (err) {
    console.error('Products API error:', err);
    return res.status(500).json({ error: err.message });
  }
};
