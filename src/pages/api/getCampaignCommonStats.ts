import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { api_key, campaign_id } = req.query;

  if (!api_key || !campaign_id) {
    return res.status(400).json({ error: 'Missing api_key or campaign_id parameter' });
  }

  const url = `https://api.selzy.com/en/api/getCampaignCommonStats?format=json&api_key=${api_key}&campaign_id=${campaign_id}`;

  try {
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error: unknown) {
    if (error instanceof Error) {
      res.status(500).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Internal server error' });
    }
  }
} 