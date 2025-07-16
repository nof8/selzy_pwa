"use client";
import { useEffect, useState, useRef } from "react";
import Image from "next/image";

interface Campaign {
  id: number;
  userId: number;
  campaignType: string;
  status: string;
  letterId: number;
  listId: number;
  segmentId: number | null;
  createdAt: string;
  startedAt: string;
  trackRead: boolean;
  trackLink: boolean;
  numTotal: number;
  numSent: number;
  numDelivered: number;
  numOpened: number;
  numOpenedUnique: number;
  numClicked: number;
  numClickedUnique: number;
  numSoftBounced: number;
  numHardBounced: number;
  numUnsubscribed: number;
  numSpammed: number;
  gaParam: string | null;
  flags: string[];
  declineReason: string | null;
  splitId: number | null;
  resendNonOpenersAt: string | null;
  resendNonOpenersSubject: string | null;
  dkimStatus: string | null;
  subject?: string; // Added for letter subject
  listName?: string; // Added for list name
}

interface SubscriberList {
  id: number;
  name: string;
}

interface UserInfo {
  email: string;
  firstName: string;
  lastName: string;
  balance: {
    currency: string;
    main: number;
  };
}

interface ErrorResponse {
  error?: Array<{ code?: string }> | {
    error?: Record<string, Array<{ code?: string }>>;
  };
  message?: string;
  raw?: unknown;
}

interface ApiResponse {
  success: boolean;
  result?: {
    list: Campaign[] | UserInfo[];
    token?: string;
  };
  error?: string;
}

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string>("");
  const [errorCode, setErrorCode] = useState<string | null>(null);
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);

  // Helper functions for credential storage
  const saveCredentials = (email: string, password: string) => {
    const credentials = btoa(JSON.stringify({ email, password }));
    localStorage.setItem("selzy_credentials", credentials);
  };

  const getCredentials = (): { email: string; password: string } | null => {
    try {
      const credentials = localStorage.getItem("selzy_credentials");
      if (credentials) {
        return JSON.parse(atob(credentials));
      }
    } catch {
      console.error("Failed to decode credentials");
    }
    return null;
  };

  const clearCredentials = () => {
    localStorage.removeItem("selzy_credentials");
  };

  // Helper function to extract first UUID error code
  const extractErrorCode = (errorResponse: ErrorResponse): string | null => {
    try {
      // Format 1: Direct error array (like rate limiting)
      if (Array.isArray(errorResponse?.error) && errorResponse.error.length > 0) {
        const firstError = errorResponse.error[0];
        if (firstError?.code) {
          return firstError.code;
        }
      }
      
      // Format 2: Nested field errors (like validation errors)
      if (errorResponse?.error && !Array.isArray(errorResponse.error) && errorResponse.error.error) {
        const fields = errorResponse.error.error;
        for (const fieldName in fields) {
          const fieldErrors = fields[fieldName];
          if (Array.isArray(fieldErrors) && fieldErrors.length > 0) {
            const firstError = fieldErrors[0];
            if (firstError?.code) {
              return firstError.code;
            }
          }
        }
      }
    } catch {
      console.error("Failed to extract error code");
    }
    return null;
  };

  // Auto-login function
  const attemptAutoLogin = async (storedEmail: string, storedPassword: string) => {
    try {
      setLoading(true);
      const res = await fetch("https://apig.selzy.com/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: storedEmail, password: storedPassword }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.result?.token) {
        setToken(data.result.token);
        localStorage.setItem("selzy_token", data.result.token);
        setIsLoggedIn(true);
        setEmail(storedEmail);
        setPassword(storedPassword);
        setRememberMe(true);
        setErrorCode(null);
        return true;
      }
    } catch {
      console.error("Auto-login failed");
    } finally {
      setLoading(false);
    }
    return false;
  };

  useEffect(() => {
    // Load token from localStorage on mount
    const storedToken = localStorage.getItem("selzy_token");
    const savedCredentials = getCredentials();
    
    if (storedToken) {
      setToken(storedToken);
      setIsLoggedIn(true);
    } else if (savedCredentials) {
      // Try auto-login with saved credentials
      attemptAutoLogin(savedCredentials.email, savedCredentials.password);
    }
    
    // Set form values if credentials are saved
    if (savedCredentials) {
      setEmail(savedCredentials.email);
      setPassword(savedCredentials.password);
      setRememberMe(true);
    }
    
    // Focus on the email input when component mounts
    if (inputRef.current && !savedCredentials) {
      inputRef.current.focus();
    }
  }, []);

  useEffect(() => {
    if (isLoggedIn && token) {
      fetchUserInfo(token);
      fetchCampaigns(token, 0, true); // Reset to first page
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn, token]);

  const fetchUserInfo = async (token: string) => {
    try {
      const url = `https://apig.selzy.com/user`;
      console.log('Fetching user info from:', url);
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        mode: 'cors',
      });
      console.log('User info response status:', res.status);
      const data = await res.json();
      console.log('User info response:', JSON.stringify(data, null, 2));
      
      if (res.ok && data.success && data.result?.list?.[0]) {
        const user = data.result.list[0] as UserInfo;
        setUserInfo({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          balance: user.balance,
        });
      }
    } catch {
      console.error('Failed to fetch user info');
    }
  };

  const fetchCampaigns = async (token: string, currentOffset: number = 0, reset: boolean = false) => {
    if (reset) {
      setLoading(true);
      setOffset(0);
      setHasMore(true);
    } else {
      setLoadingMore(true);
    }
    setError("");
    setErrorCode(null);
    try {
      const url = `https://apig.selzy.com/campaign?limit=5&offset=${currentOffset}&orderType=desc&orderBy=startedAt`;
      console.log('Fetching campaigns from:', url);
      const res = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        mode: 'cors',
      });
      console.log('Response status:', res.status);
      console.log('Response headers:', Object.fromEntries(res.headers.entries()));
      let data: ApiResponse | null = null;
      try {
        data = await res.json();
        console.log('Full JSON response:', JSON.stringify(data, null, 2));
      } catch {
        throw new Error("Invalid JSON response");
      }
      console.log('Campaign API response:', { status: res.status, data });
      if (res.ok && data?.result?.list) {
        const campaignList = data.result.list as Campaign[];
        console.log('Number of campaigns returned from API:', campaignList.length);
        
        // Fetch letter subjects and list names for campaigns
        const letterIds = campaignList.map((campaign: Campaign) => campaign.letterId).filter(Boolean);
        const listIds = [...new Set(campaignList.map((campaign: Campaign) => campaign.listId).filter(Boolean))];
        let campaignsWithSubjectsAndLists = campaignList;
        
        // Fetch letter subjects
        if (letterIds.length > 0) {
          try {
            const letterUrl = `https://apig.selzy.com/letter?ids=${letterIds.join('%2C')}&limit=20`;
            console.log('Fetching letters from:', letterUrl);
            const letterRes = await fetch(letterUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              mode: 'cors',
            });
            
            if (letterRes.ok) {
              const letterData = await letterRes.json();
              console.log('Letter API response:', letterData);
              
              if (letterData.success && letterData.result?.list) {
                const letterMap = new Map<number, string>();
                letterData.result.list.forEach((letter: { id: number; subject: string }) => {
                  letterMap.set(letter.id, letter.subject);
                });
                
                // Add subjects to campaigns
                campaignsWithSubjectsAndLists = campaignList.map((campaign: Campaign) => ({
                  ...campaign,
                  subject: letterMap.get(campaign.letterId) || 'No subject'
                }));
              }
            }
          } catch {
            console.error('Failed to fetch letter subjects');
          }
        }
        
        // Fetch list names
        if (listIds.length > 0) {
          try {
            const listUrl = `https://apig.selzy.com/subscriber/list?listIds=${encodeURIComponent(JSON.stringify(listIds))}`;
            console.log('Fetching lists from:', listUrl);
            const listRes = await fetch(listUrl, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json',
                'Authorization': `Bearer ${token}`,
              },
              mode: 'cors',
            });
            
            if (listRes.ok) {
              const listData = await listRes.json();
              console.log('List API response:', listData);
              
              if (listData.success && listData.result?.list) {
                const listMap = new Map<number, string>();
                listData.result.list.forEach((list: SubscriberList) => {
                  listMap.set(list.id, list.name);
                });
                
                // Add list names to campaigns
                campaignsWithSubjectsAndLists = campaignsWithSubjectsAndLists.map((campaign: Campaign) => ({
                  ...campaign,
                  listName: listMap.get(campaign.listId) || 'Unknown list'
                }));
              }
            }
          } catch {
            console.error('Failed to fetch list names');
          }
        }
        
        if (reset) {
          setCampaigns(campaignsWithSubjectsAndLists);
          setOffset(5);
        } else {
          setCampaigns(prev => [...prev, ...campaignsWithSubjectsAndLists]);
          setOffset(prev => prev + 5);
        }
        
        // Check if there are more campaigns to load
        if (campaignList.length < 5) {
          setHasMore(false);
        }
      } else if (res.status === 401) {
        // Token is invalid, try auto-relogin if credentials are saved
        console.log('401 received, attempting auto-relogin');
        const savedCredentials = getCredentials();
        if (savedCredentials) {
          const autoLoginSuccess = await attemptAutoLogin(savedCredentials.email, savedCredentials.password);
          if (autoLoginSuccess) {
            // Retry the original request with new token
            return fetchCampaigns(localStorage.getItem("selzy_token")!, currentOffset, reset);
          }
        }
        
        // Auto-relogin failed or no credentials, logout
        setIsLoggedIn(false);
        setToken(null);
        localStorage.removeItem("selzy_token");
        setError("Session expired. Please login again.");
      } else if (data?.error) {
        setError(data.error);
      } else {
        setError("No campaigns found.");
      }
    } catch (e: unknown) {
      console.error('Campaign fetch error:', e);
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Unknown error");
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLoadMore = () => {
    if (token && !loadingMore) {
      fetchCampaigns(token, offset, false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("https://apig.selzy.com/auth/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: email, password }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.result?.token) {
        setToken(data.result.token);
        localStorage.setItem("selzy_token", data.result.token);
        setIsLoggedIn(true);
        
        // Save credentials if "Remember me" is checked
        if (rememberMe) {
          saveCredentials(email, password);
        } else {
          clearCredentials();
        }
        
        setEmail("");
        setPassword("");
        setErrorCode(null);
      } else {
        setError(data.message || "Login failed");
        setErrorCode(extractErrorCode(data));
      }
    } catch (e: unknown) {
      if (e instanceof Error) {
        setError(e.message);
      } else {
        setError("Login failed");
      }
      setErrorCode(null);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setIsLoggedIn(false);
    setToken(null);
    localStorage.removeItem("selzy_token");
    
    // Only clear credentials if "Remember me" is not checked
    if (!rememberMe) {
      clearCredentials();
      setEmail("");
      setPassword("");
    }
    
    setCampaigns([]);
    setUserInfo(null);
    setError("");
    setErrorCode(null);
    setOffset(0);
    setHasMore(true);
    setRememberMe(false);
  };

    return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-2xl mx-auto pt-8">
            <div className="flex items-center justify-center mb-8">
          <Image 
            src="/selzy-logo.svg" 
            alt="Selzy" 
            width={64}
            height={24}
            className="mr-3"
            style={{ display: 'block' }}
            onError={() => {
              console.error('Logo failed to load');
            }}
          />
          <h1 className="text-2xl font-bold text-center text-gray-500">Campaigns</h1>
        </div>
        {!isLoggedIn ? (
          <form onSubmit={handleLogin} className="flex flex-col gap-4">
            <label className="font-semibold text-gray-700 mb-2">Email:</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800"
              required
              ref={inputRef}
            />
            <label className="font-semibold text-gray-700 mb-2">Password:</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-300 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-200 bg-gray-50 focus:bg-white text-gray-800"
              required
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="rememberMe"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500 focus:ring-2"
              />
              <label htmlFor="rememberMe" className="text-sm text-gray-700">
                Remember me
              </label>
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white py-3 px-6 rounded-xl font-semibold hover:from-purple-700 hover:to-blue-700 transform hover:scale-[1.02] transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
            {error && (
              <div className="text-red-500 text-sm mt-2">
                {error}
                {errorCode && <div className="text-xs text-gray-500 mt-1">Error code: {errorCode}</div>}
              </div>
            )}
          </form>
        ) : (
          <>
            {userInfo && (
              <div className="mb-6 p-4 bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl border border-purple-100 shadow-sm">
                <div className="text-base font-semibold text-gray-800">
                  {userInfo.firstName} {userInfo.lastName}
                </div>
                <div className="text-sm text-gray-600 mt-1">{userInfo.email}</div>
                <div className="text-sm text-purple-700 mt-2 font-medium">
                  Balance: {userInfo.balance.main.toFixed(2)} {userInfo.balance.currency}
                </div>
              </div>
            )}
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => token && fetchCampaigns(token, 0, true)}
                  title="Refresh"
                  className="text-white text-sm px-4 py-2 rounded-lg font-medium transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md"
                  style={{ backgroundColor: '#3b1b67' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#2d1450'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#3b1b67'}
                  disabled={loading}
                >
                  Refresh
                </button>
                <button
                  onClick={handleLogout}
                  className="text-gray-700 text-sm px-4 py-2 rounded-lg font-medium transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md"
                  style={{ backgroundColor: '#dcc7ed' }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#d0b3e6'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#dcc7ed'}
                  disabled={loading}
                >
                  Logout
                </button>
              </div>
            </div>
            {loading ? (
              <div className="text-center py-8">Loading...</div>
            ) : error ? (
              <div className="text-red-500 py-4">{error}</div>
            ) : campaigns.length === 0 ? (
              <div className="text-gray-500 py-4">No campaigns found.</div>
            ) : (
              <>
                <div className="space-y-4">
                  {campaigns.map(c => {
                    // Use startedAt if available, otherwise use createdAt
                    const displayDate = c.startedAt || c.createdAt;
                    
                    return (
                      <div key={c.id} className="bg-gradient-to-r from-gray-50 to-blue-50 rounded-xl p-4 border border-gray-200 hover:shadow-md transition-shadow duration-200">
                        <div className="flex justify-between items-start mb-2">
                          <div className="text-sm text-gray-600">{new Date(displayDate).toLocaleDateString('en-US', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })}</div>
                          <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                            c.status === 'sent' ? 'bg-green-100 text-green-800' :
                            c.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }`}>
                            {c.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-lg font-bold text-gray-800 mb-1">{c.subject || `Campaign #${c.id}`}</div>
                        {c.listName && (
                          <div className="text-sm text-gray-600 mb-3">List: {c.listName}</div>
                        )}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                          <div className="bg-white rounded-lg p-2 text-center">
                            <div className="font-semibold text-gray-800">{c.numSent}</div>
                            <div className="text-xs text-gray-500">Sent (100%)</div>
                          </div>
                          <div className="bg-white rounded-lg p-2 text-center">
                            <div className="font-semibold text-green-600">{c.numDelivered}</div>
                            <div className="text-xs text-gray-500">Delivered ({c.numSent > 0 ? Math.round((c.numDelivered / c.numSent) * 100) : 0}%)</div>
                          </div>
                          <div className="bg-white rounded-lg p-2 text-center">
                            <div className="font-semibold text-blue-600">{c.numOpenedUnique}</div>
                            <div className="text-xs text-gray-500">Opens ({c.numSent > 0 ? Math.round((c.numOpenedUnique / c.numSent) * 100) : 0}%)</div>
                          </div>
                          <div className="bg-white rounded-lg p-2 text-center">
                            <div className="font-semibold text-purple-600">{c.numClickedUnique}</div>
                            <div className="text-xs text-gray-500">Clicks ({c.numSent > 0 ? Math.round((c.numClickedUnique / c.numSent) * 100) : 0}%)</div>
                          </div>
                        </div>
                      </div>
                    );
                                      })}
                </div>
                {hasMore && (
                  <div className="mt-4 text-center">
                    <button
                      onClick={handleLoadMore}
                      disabled={loadingMore}
                      className="bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-6 py-3 rounded-xl font-semibold hover:from-purple-200 hover:to-blue-200 transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-md border border-purple-200"
                    >
                      {loadingMore ? 'Loading...' : 'Load more...'}
                    </button>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
