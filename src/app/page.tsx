"use client";
import { useEffect, useState, useRef } from "react";

interface Campaign {
  id: number;
  subject: string;
  status: string;
  start_time: string;
  stats_url: string;
  sender_name: string;
  sender_email: string;
}

interface CampaignStats {
  sent?: number;
  delivered?: number;
  read_all?: number;
  read_unique?: number;
  clicked_all?: number;
  clicked_unique?: number;
}

export default function Home() {
  const [apiKey, setApiKey] = useState<string>("");
  const [inputKey, setInputKey] = useState<string>("");
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [campaignStats, setCampaignStats] = useState<Record<number, CampaignStats>>({});
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const storedKey = localStorage.getItem("selzyApiKey");
    if (storedKey) {
      setApiKey(storedKey);
      setInputKey(storedKey);
    }
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (apiKey) {
      fetchCampaigns();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiKey]);

  useEffect(() => {
    if (apiKey && campaigns.length > 0) {
      fetchAllStats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [campaigns]);

  const fetchCampaigns = async () => {
    setLoading(true);
    setError("");
    try {
      const tenYearsAgo = new Date();
      tenYearsAgo.setUTCFullYear(tenYearsAgo.getUTCFullYear() - 10);
      const pad = (n: number) => n.toString().padStart(2, '0');
      const from = `${tenYearsAgo.getUTCFullYear()}-${pad(tenYearsAgo.getUTCMonth() + 1)}-${pad(tenYearsAgo.getUTCDate())} 00:00:00`;
      const res = await fetch(`/api/getCampaigns?api_key=${apiKey}&from=${encodeURIComponent(from)}&limit=10000`);
      let data: unknown = null;
      try {
        data = await res.json();
        console.log('Frontend Selzy API response:', data);
      } catch {
        throw new Error('Invalid JSON response');
      }
      if (
        res.ok && typeof data === 'object' && data !== null && 'result' in data && Array.isArray((data as { result: unknown[] }).result) && (data as { result: unknown[] }).result.length > 0
      ) {
        const sorted = (data as { result: { start_time: string }[] }).result.sort((a: { start_time: string }, b: { start_time: string }) => new Date(b.start_time).getTime() - new Date(a.start_time).getTime());
        setCampaigns(sorted.slice(0, 5));
      } else if (typeof data === 'object' && data !== null && 'error' in data) {
        setError((data as { error: string }).error);
      } else {
        setError("No campaigns found.");
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Unknown error");
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchAllStats = async () => {
    const stats: Record<number, CampaignStats> = {};
    await Promise.all(
      campaigns.map(async (c) => {
        try {
          const res = await fetch(`/api/getCampaignCommonStats?api_key=${apiKey}&campaign_id=${c.id}`);
          const data = await res.json();
          if (data.result) {
            stats[c.id] = {
              sent: data.result.sent,
              delivered: data.result.delivered,
              read_all: data.result.read_all,
              read_unique: data.result.read_unique,
              clicked_all: data.result.clicked_all,
              clicked_unique: data.result.clicked_unique,
            };
          }
        } catch {}
      })
    );
    setCampaignStats(stats);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputKey.trim()) {
      setApiKey(inputKey.trim());
      localStorage.setItem("selzyApiKey", inputKey.trim());
    }
  };

  const handleLogout = () => {
    setApiKey("");
    setInputKey("");
    setCampaigns([]);
    localStorage.removeItem("selzyApiKey");
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">Selzy Dashboard</h1>
        {!apiKey ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <label className="font-medium">Enter your Selzy API Key:</label>
            <input
              type="text"
              value={inputKey}
              onChange={e => setInputKey(e.target.value)}
              className="border rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
              ref={inputRef}
            />
            <p className="text-xs text-gray-500 mb-2">You can find the key <a href="https://cp.selzy.com/en/v5/user/info/api" target="_blank" rel="noopener noreferrer" className="underline text-blue-600">here</a></p>
            <button
              type="submit"
              className="bg-blue-600 text-white rounded px-4 py-2 font-semibold hover:bg-blue-700 transition"
            >
              Login
            </button>
          </form>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={fetchCampaigns}
                  title="Refresh"
                  className="bg-blue-500 text-white text-sm px-3 py-1 rounded hover:bg-blue-600 transition"
                >
                  Refresh
                </button>
                <button
                  onClick={handleLogout}
                  className="bg-red-500 text-white text-sm px-3 py-1 rounded hover:bg-red-600 transition"
                >
                  Logout
                </button>
              </div>
            </div>
            <h2 className="text-xl font-semibold mb-2">Last 5 Campaigns</h2>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : error ? (
              <div className="text-red-500 py-4">{error}</div>
            ) : campaigns.length === 0 ? (
              <div className="text-gray-500 py-4">No campaigns found.</div>
            ) : (
              <>
                <ul className="divide-y divide-gray-200">
                  {campaigns.map(c => (
                    <li key={c.id} className="py-3">
                      <div className="font-semibold">{c.subject}</div>
                      <div className="text-xs text-gray-700 mb-1">{`"${c.sender_name}"<${c.sender_email}>`}</div>
                      <div className="text-xs text-gray-500">Status: {c.status} | Sent: {c.start_time}</div>
                      <a href={c.stats_url} target="_blank" rel="noopener noreferrer" className="text-blue-600 text-xs hover:underline">View stats</a>
                      {campaignStats[c.id] && (
                        <div className="mt-2 text-xs text-gray-800">
                          Sent: {campaignStats[c.id].sent ?? '-'} | Delivered: {campaignStats[c.id].delivered ?? '-'} |
                          Opens: {
                            (campaignStats[c.id].read_unique === 0 && campaignStats[c.id].read_all === 0)
                              ? '0'
                              : `${campaignStats[c.id].read_unique ?? '-'} / ${campaignStats[c.id].read_all ?? '-'}`
                          } |
                          Clicks: {
                            (campaignStats[c.id].clicked_unique === 0 && campaignStats[c.id].clicked_all === 0)
                              ? '0'
                              : `${campaignStats[c.id].clicked_unique ?? '-'} / ${campaignStats[c.id].clicked_all ?? '-'}`
                          }
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
