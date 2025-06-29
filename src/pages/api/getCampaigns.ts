import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  console.log('API route hit', req.query);
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { api_key, from, to, limit } = req.query;

  if (!api_key || !from) {
    return res.status(400).json({ error: 'Missing api_key or from parameter' });
  }

  const url = `https://api.selzy.com/en/api/getCampaigns?format=json&api_key=${api_key}`
    + (from ? `&from=${from}` : '')
    + `&limit=10000`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    console.log('Selzy response:', data);
    res.status(response.status).json({ ...data, selzy_request_url: url });
  } catch (error: any) {
    console.log('Selzy fetch error:', error);
    res.status(500).json({ error: error.message || 'Internal server error', selzy_request_url: url });
  }
} 