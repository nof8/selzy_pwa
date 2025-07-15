"use client";
import { useEffect, useState, useRef } from "react";

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
  const [rawError, setRawError] = useState<any>(null);
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
    } catch (e) {
      console.error("Failed to decode credentials");
    }
    return null;
  };

  const clearCredentials = () => {
    localStorage.removeItem("selzy_credentials");
  };

  // Helper function to extract first UUID error code
  const extractErrorCode = (errorResponse: any): string | null => {
    try {
      // Format 1: Direct error array (like rate limiting)
      if (Array.isArray(errorResponse?.error) && errorResponse.error.length > 0) {
        const firstError = errorResponse.error[0];
        if (firstError?.code) {
          return firstError.code;
        }
      }
      
      // Format 2: Nested field errors (like validation errors)
      if (errorResponse?.error?.error) {
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
    } catch (e) {
      console.error("Failed to extract error code:", e);
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
        setRawError(null);
        setErrorCode(null);
        return true;
      }
    } catch (e) {
      console.error("Auto-login failed:", e);
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
        const user = data.result.list[0];
        setUserInfo({
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          balance: user.balance,
        });
      }
    } catch (e) {
      console.error('Failed to fetch user info:', e);
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
    setRawError(null);
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
      let data: unknown = null;
      try {
        data = await res.json();
        console.log('Full JSON response:', JSON.stringify(data, null, 2));
      } catch {
        throw new Error("Invalid JSON response");
      }
      console.log('Campaign API response:', { status: res.status, data });
      if (res.ok && typeof data === "object" && data !== null && "result" in data && (data as any).result.list) {
        const campaignList = (data as any).result.list;
        console.log('Number of campaigns returned from API:', campaignList.length);
        
        // Fetch letter subjects for campaigns
        const letterIds = campaignList.map((campaign: Campaign) => campaign.letterId).filter(Boolean);
        let campaignsWithSubjects = campaignList;
        
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
                const letterMap = new Map();
                letterData.result.list.forEach((letter: any) => {
                  letterMap.set(letter.id, letter.subject);
                });
                
                // Add subjects to campaigns
                campaignsWithSubjects = campaignList.map((campaign: Campaign) => ({
                  ...campaign,
                  subject: letterMap.get(campaign.letterId) || 'No subject'
                }));
              }
            }
          } catch (e) {
            console.error('Failed to fetch letter subjects:', e);
          }
        }
        
        if (reset) {
          setCampaigns(campaignsWithSubjects);
          setOffset(5);
        } else {
          setCampaigns(prev => [...prev, ...campaignsWithSubjects]);
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
        setRawError(data);
      } else if (typeof data === "object" && data !== null && "error" in data) {
        setError((data as { error: string }).error);
        setRawError(data);
      } else {
        setError("No campaigns found.");
        setRawError(data);
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
    setRawError(null);
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
        setRawError(null);
        setErrorCode(null);
      } else {
        setError(data.message || "Login failed");
        setRawError(data.raw || data);
        setErrorCode(extractErrorCode(data));
      }
    } catch (e: any) {
      setError(e.message || "Login failed");
      setRawError(null);
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
    setRawError(null);
    setErrorCode(null);
    setOffset(0);
    setHasMore(true);
    setRememberMe(false);
  };

    return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <div className="w-full max-w-2xl mx-auto pt-8">
            <div className="flex items-center justify-center mb-8">
          <img 
            src="/selzy-logo.svg" 
            alt="Selzy" 
            className="w-16 h-6 mr-3"
            style={{ display: 'block' }}
            onError={(e) => {
              console.error('Logo failed to load');
              e.currentTarget.style.display = 'none';
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
                    // Format date to YYYY-MM-DD hh:mm
                    const formattedDate = new Date(displayDate).toLocaleString('sv-SE', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    }).replace(' ', ' ');
                    
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
                        <div className="text-lg font-bold text-gray-800 mb-3">{c.subject || `Campaign #${c.id}`}</div>
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
