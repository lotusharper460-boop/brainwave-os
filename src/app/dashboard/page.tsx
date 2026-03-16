'use client'

import React, { useEffect, useState, Fragment, useCallback } from 'react'
import { supabase } from '@/utils/supabase/client';

export default function AnalyticsDashboard() {
  // Authentication States
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState(false);
  
  // Define your hardcoded PIN here
  const SECURE_PIN = "121231";

  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<'analytics' | 'responses' | 'messaging' | 'insights'>('analytics');
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  // New States for Sorting/Deleting
  const [roleFilter, setRoleFilter] = useState<string>('All');
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Messaging States
  const [messageSubject, setMessageSubject] = useState("Update: Educational Infrastructure Study");
  const [messageBody, setMessageBody] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [emailSuccess, setEmailSuccess] = useState(false);

  // --- STABILIZED FETCH FUNCTION ---
  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('research_responses')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) setErrorMsg(error.message);
    else setResponses(data || []);
    
    setLoading(false);
  }, []);

  // Only fetch data AFTER the user is authenticated
  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated && isMounted) {
      fetchData();
    }
    return () => { isMounted = false; };
  }, [isAuthenticated, fetchData]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === SECURE_PIN) {
      setIsAuthenticated(true);
    } else {
      setPinError(true);
    }
  };

  // --- DELETE FUNCTION ---
  const handleDeleteResponse = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this response?")) return;
    
    setIsDeleting(id);
    try {
      const { error } = await supabase
        .from('research_responses')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      setResponses(prev => prev.filter(res => res.id !== id));
      if (expandedRow === id) setExpandedRow(null);
    } catch (err: any) {
      alert("Failed to delete response: " + err.message);
    } finally {
      setIsDeleting(null);
    }
  };

  // --- CONTACT FORMATTERS ---
  const cleanPhoneNumber = (phone: string) => {
    if (!phone) return "";
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('0')) cleaned = '234' + cleaned.substring(1);
    else if (!cleaned.startsWith('234') && cleaned.length === 10) cleaned = '234' + cleaned;
    return cleaned;
  };

  const formatWhatsAppLink = (phone: string) => {
    const cleaned = cleanPhoneNumber(phone);
    if (!cleaned) return "#";
    const message = encodeURIComponent("Hello! Thank you for participating in the Educational Infrastructure Study.");
    return `https://wa.me/${cleaned}?text=${message}`;
  };

  const allPhoneNumbers = responses
    .map(r => r.phone_number)
    .filter(phone => phone && phone !== "Not Provided")
    .map(cleanPhoneNumber)
    .join(', ');

  // --- BULK MESSAGING ACTIONS ---
  const handleCopyBulkNumbers = () => {
    if (!allPhoneNumbers) return alert("No valid phone numbers found.");
    navigator.clipboard.writeText(allPhoneNumbers);
    setCopySuccess(true);
    setTimeout(() => setCopySuccess(false), 3000);
  };

  const handleSendDirectEmail = async () => {
    const emails = responses
      .map(r => r.email_address)
      .filter(email => email && email !== "Not Provided" && email.includes('@'));
      
    if (emails.length === 0) return alert("No valid email addresses found.");
    if (!messageSubject || !messageBody) return alert("Please enter a subject and a message.");

    setIsSendingEmail(true);

    try {
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: emails,
          subject: messageSubject,
          message: messageBody
        })
      });

      if (res.ok) {
        setEmailSuccess(true);
        setMessageBody(""); 
        setTimeout(() => setEmailSuccess(false), 4000);
      } else {
        const errorData = await res.json();
        alert(`Server Error: ${errorData.error || 'Failed to send emails.'}`);
      }
    } catch (err) {
      alert("Failed to connect to the email server API.");
    }
    
    setIsSendingEmail(false);
  };

  // --- ANALYTICS ENGINE (Charts) ---
  const total = responses.length;

  const getFrequencies = (key: string) => {
    const counts: Record<string, number> = {};
    responses.forEach(r => {
      const val = r[key];
      if (val && typeof val === 'string' && val !== "") counts[val] = (counts[val] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]); 
  };

  const getArrayFrequencies = (key: string) => {
    const counts: Record<string, number> = {};
    responses.forEach(r => {
      const arr = r[key];
      if (Array.isArray(arr)) {
        arr.forEach(val => {
          if (val) counts[val] = (counts[val] || 0) + 1;
        });
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const getTopChallenges = () => {
    const counts: Record<string, number> = {};
    responses.forEach(r => {
      const challenges = r.q10_top_challenges;
      if (challenges && typeof challenges === 'object') {
        Object.keys(challenges).forEach(ch => {
          counts[ch] = (counts[ch] || 0) + 1;
        });
      }
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  };

  const getFeatureAverages = (key: string) => {
    const sums: Record<string, number> = {};
    const counts: Record<string, number> = {};
    responses.forEach(r => {
      const features = r[key];
      if (features && typeof features === 'object') {
        Object.entries(features).forEach(([feat, rating]) => {
          if (typeof rating === 'number') {
            sums[feat] = (sums[feat] || 0) + rating;
            counts[feat] = (counts[feat] || 0) + 1;
          }
        });
      }
    });
    return Object.entries(sums)
      .map(([feat, sum]) => [feat, Number((sum / counts[feat]).toFixed(1))] as [string, number])
      .sort((a, b) => b[1] - a[1]); 
  };

  // --- LOCAL AI HEURISTICS ENGINE ---
  const generateInsights = () => {
    if (total === 0) return null;

    // 1. Monetization Viability
    const paying = responses.filter((r: any) => r.q18_willing_to_pay && r.q18_willing_to_pay !== 'Nothing');
    const payPercent = Math.round((paying.length / total) * 100);

    // 2. Biggest Dealbreaker
    const dealbreakers: Record<string, number> = {};
    responses.forEach((r: any) => {
      if (Array.isArray(r.q21_refuse_to_pay_reasons)) {
        r.q21_refuse_to_pay_reasons.forEach((d: string) => { 
          dealbreakers[d] = (dealbreakers[d] || 0) + 1; 
        });
      }
    });
    const topDealbreaker = Object.entries(dealbreakers).sort((a, b) => b[1] - a[1])[0];

    // 3. Number 1 Feature Request
    const allFeats: Record<string, { sum: number, count: number }> = {};
    responses.forEach((r: any) => {
      ['feature_finance', 'feature_student', 'feature_attendance', 'feature_academic', 'feature_communication', 'feature_analytics'].forEach((cat: string) => {
        if (r[cat] && typeof r[cat] === 'object') {
          Object.entries(r[cat]).forEach(([feat, val]: [string, any]) => {
            if (typeof val === 'number') {
              if (!allFeats[feat]) allFeats[feat] = { sum: 0, count: 0 };
              allFeats[feat].sum += val;
              allFeats[feat].count += 1;
            }
          });
        }
      });
    });
    const topFeat = Object.entries(allFeats)
      .map(([name, stats]: [string, any]) => ({ name, avg: stats.sum / stats.count }))
      .sort((a, b) => b.avg - a.avg)[0];

    // 4. Core Operational Challenge
    const topChallenges: Record<string, number> = {};
    responses.forEach((r: any) => {
      if (r.q10_top_challenges && typeof r.q10_top_challenges === 'object') {
         Object.keys(r.q10_top_challenges).forEach((ch: string) => {
           topChallenges[ch] = (topChallenges[ch] || 0) + 1;
         })
      }
    });
    const topChallenge = Object.entries(topChallenges).sort((a,b) => b[1] - a[1])[0];

    // 5. Tech Readiness Danger
    const techIssues = responses.filter((r: any) => r.q14_internet_access === 'Poor' || r.q14_internet_access === 'No internet');
    const offlineNeedPercent = Math.round((techIssues.length / total) * 100);

    return { payPercent, topDealbreaker, topFeat, topChallenge, offlineNeedPercent };
  };
  const insights = generateInsights();

  // --- DERIVE ROLES & FILTER RESPONSES ---
  const uniqueRoles = Array.from(new Set(responses.map(r => r.role).filter(Boolean)));
  const displayedResponses = roleFilter === 'All' ? responses : responses.filter(r => r.role === roleFilter);

  // --- UI COMPONENTS FOR CHARTS ---
  const StatBar = ({ label, count }: { label: string, count: number }) => {
    const percentage = total === 0 ? 0 : Math.round((count / total) * 100);
    return (
      <div className="mb-3">
        <div className="flex justify-between text-xs font-medium text-[#E5E7EB] mb-1">
          <span className="truncate pr-2">{label}</span>
          <span className="text-[#00B8CC] whitespace-nowrap">{count} ({percentage}%)</span>
        </div>
        <div className="w-full bg-[#1A1A1B] rounded-full h-2 border border-[#37373A] overflow-hidden">
          <div className="bg-gradient-to-r from-[#00B8CC] to-[#00E5FF] h-2 rounded-full transition-all" style={{ width: `${percentage}%` }} />
        </div>
      </div>
    );
  };

  const FeatureBar = ({ label, score }: { label: string, score: number }) => {
    const percentage = (score / 5) * 100;
    return (
      <div className="mb-3">
        <div className="flex justify-between text-xs font-medium text-[#E5E7EB] mb-1">
          <span className="truncate pr-2">{label}</span>
          <span className="text-[#E5C100] font-bold whitespace-nowrap">{score} / 5.0</span>
        </div>
        <div className="w-full bg-[#1A1A1B] rounded-full h-2 border border-[#37373A] overflow-hidden">
          <div className="bg-gradient-to-r from-[#E5C100] to-[#FFD700] h-2 rounded-full transition-all" style={{ width: `${percentage}%` }} />
        </div>
      </div>
    );
  };

  const AnalyticsCard = ({ title, data }: { title: string, data: [string, number][] }) => (
    <div className="bg-[#242426] border border-[#37373A] rounded-2xl p-6 shadow-lg">
      <h3 className="text-sm font-bold text-[#E5C100] uppercase tracking-wider mb-4 border-b border-[#37373A] pb-2">{title}</h3>
      {data.length === 0 ? <p className="text-xs text-[#9CA3AF] italic">No data yet.</p> : data.map(([label, count]) => <StatBar key={label} label={label} count={count} />)}
    </div>
  );

  const FeatureCard = ({ title, data }: { title: string, data: [string, number][] }) => (
    <div className="bg-[#242426] border border-[#37373A] rounded-2xl p-6 shadow-lg">
      <h3 className="text-sm font-bold text-[#00B8CC] uppercase tracking-wider mb-4 border-b border-[#37373A] pb-2">{title}</h3>
      {data.length === 0 ? <p className="text-xs text-[#9CA3AF] italic">No data yet.</p> : data.map(([label, score]) => <FeatureBar key={label} label={label} score={score} />)}
    </div>
  );

  // ==========================================
  // AUTHENTICATION MODAL
  // ==========================================
  if (!isAuthenticated) {
    return (
      <main className="min-h-screen bg-[#1A1A1B] text-[#E5E7EB] flex items-center justify-center p-4 font-sans">
        <div className="bg-[#242426] border border-[#37373A] rounded-2xl p-8 max-w-sm w-full shadow-2xl animate-in fade-in zoom-in duration-300">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-[#00B8CC]/10 text-[#00B8CC] rounded-full flex items-center justify-center mx-auto mb-5 border border-[#00B8CC]/30 shadow-[0_0_15px_rgba(0,184,204,0.2)]">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h2 className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#00B8CC] to-[#E5C100]">Admin Gateway</h2>
            <p className="text-xs font-medium text-[#9CA3AF] mt-2 tracking-wide">Enter your secure PIN to access analytics.</p>
          </div>
          
          <form onSubmit={handleLogin}>
            <input
              type="password"
              maxLength={6}
              value={pin}
              onChange={(e) => {
                setPin(e.target.value.replace(/\D/g, ''));
                setPinError(false);
              }}
              className={`w-full bg-[#1A1A1B] border ${pinError ? 'border-red-500' : 'border-[#37373A]'} rounded-xl p-4 text-center text-3xl tracking-[0.5em] font-mono text-[#E5E7EB] outline-none focus:border-[#00B8CC] transition-all mb-4 shadow-inner`}
              placeholder="••••••"
              autoFocus
            />
            {pinError && <p className="text-red-500 text-xs font-bold text-center mb-4 animate-bounce">Incorrect PIN. Access Denied.</p>}
            <button 
              type="submit"
              className="w-full py-4 mt-2 bg-[#00B8CC] text-[#1A1A1B] font-black rounded-xl uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(0,184,204,0.4)] transition-all"
            >
              Unlock Dashboard
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ==========================================
  // MAIN DASHBOARD
  // ==========================================
  return (
    <main className="min-h-screen bg-[#1A1A1B] text-[#E5E7EB] p-4 sm:p-8 font-sans pb-32">
      
      {/* HEADER */}
      <div className="max-w-7xl mx-auto mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-[#E5C100] tracking-[0.2em] uppercase mb-1">Admin Dashboard</p>
          <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-[#00B8CC] to-[#E5C100]">
            Research Analytics
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-[#242426] border border-[#37373A] rounded-xl text-sm font-bold">
            Total Valid Responses: <span className="text-[#00B8CC] text-lg ml-1">{total}</span>
          </div>
          <button onClick={fetchData} className="p-2.5 bg-[#242426] border border-[#37373A] rounded-xl hover:bg-[#2A2A2D] transition-all text-[#00B8CC]">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="max-w-7xl mx-auto mb-6 p-4 bg-red-500/10 border border-red-500 text-red-500 rounded-xl font-bold">
          Error loading data: {errorMsg}
        </div>
      )}

      {/* TAB NAVIGATION */}
      <div className="max-w-7xl mx-auto mb-8">
        <div className="flex overflow-x-auto gap-2 border-b border-[#37373A] pb-px [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
          <button 
            onClick={() => setActiveTab('analytics')}
            className={`shrink-0 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all ${activeTab === 'analytics' ? 'bg-[#242426] text-[#00B8CC] border-t border-l border-r border-[#37373A]' : 'text-[#9CA3AF] hover:text-[#E5E7EB]'}`}
          >
            Data Analytics
          </button>
          
          <button 
            onClick={() => setActiveTab('insights')}
            className={`shrink-0 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-1.5 ${activeTab === 'insights' ? 'bg-[#242426] text-[#B562FF] border-t border-l border-r border-[#37373A]' : 'text-[#9CA3AF] hover:text-[#B562FF]'}`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
            AI Synthesis
          </button>

          <button 
            onClick={() => setActiveTab('responses')}
            className={`shrink-0 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all ${activeTab === 'responses' ? 'bg-[#242426] text-[#00B8CC] border-t border-l border-r border-[#37373A]' : 'text-[#9CA3AF] hover:text-[#E5E7EB]'}`}
          >
            Individual Responses
          </button>

          <button 
            onClick={() => setActiveTab('messaging')}
            className={`shrink-0 px-4 py-2.5 font-bold text-xs rounded-t-xl transition-all flex items-center gap-1.5 ${activeTab === 'messaging' ? 'bg-[#242426] text-[#E5C100] border-t border-l border-r border-[#37373A]' : 'text-[#9CA3AF] hover:text-[#E5C100]'}`}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
            Communication Hub
          </button>
        </div>
      </div>

      {/* --- TAB 1: AI INSIGHTS --- */}
      {activeTab === 'insights' && (
        <div className="max-w-4xl mx-auto animate-in fade-in zoom-in-95 duration-500">
          <div className="bg-gradient-to-br from-[#1A1A1B] to-[#2d1b4d]/40 border border-[#B562FF]/40 rounded-2xl p-8 shadow-[0_0_30px_rgba(181,98,255,0.1)] relative overflow-hidden">
            <div className="absolute -top-20 -right-20 w-64 h-64 bg-[#B562FF]/10 blur-[60px] rounded-full pointer-events-none" />

            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-[#37373A] relative z-10">
              <div className="w-12 h-12 rounded-full bg-[#B562FF]/20 border border-[#B562FF]/50 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#B562FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#E5E7EB]">Automated Strategy Report</h2>
                <p className="text-sm text-[#9CA3AF]">Synthesized from <span className="text-[#B562FF] font-bold">{total} data points</span> using local heuristics.</p>
              </div>
            </div>

            {total === 0 ? (
              <p className="text-center text-[#9CA3AF] py-10 font-bold">Waiting for survey data to run synthesis...</p>
            ) : (
              <div className="space-y-6 relative z-10">
                <div className="bg-[#1A1A1B]/80 backdrop-blur-md p-6 rounded-xl border border-[#37373A]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black text-[#B562FF] uppercase tracking-widest">1. Market Viability</h3>
                    <span className="px-3 py-1 bg-[#00D06C]/20 text-[#00D06C] rounded-full text-xs font-bold">{insights?.payPercent}% Conversion Rate</span>
                  </div>
                  <p className="text-sm text-[#E5E7EB] leading-relaxed">
                    Based on responses, <strong className="text-white">{insights?.payPercent}% of schools</strong> are willing to pay for this software right now. If you launch today, this is your immediate addressable market.
                  </p>
                </div>

                <div className="bg-[#1A1A1B]/80 backdrop-blur-md p-6 rounded-xl border border-[#37373A]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black text-[#B562FF] uppercase tracking-widest">2. Development Roadmap</h3>
                    <span className="px-3 py-1 bg-[#00B8CC]/20 text-[#00B8CC] rounded-full text-xs font-bold">Priority #1</span>
                  </div>
                  <p className="text-sm text-[#E5E7EB] leading-relaxed">
                    The highest-rated feature requested by schools is <strong className="text-white">"{insights?.topFeat?.name}"</strong>, with an average urgency score of <strong className="text-[#E5C100]">{insights?.topFeat?.avg?.toFixed(1)} / 5.0</strong>. You should prioritize building this module before anything else.
                  </p>
                </div>

                <div className="bg-[#1A1A1B]/80 backdrop-blur-md p-6 rounded-xl border border-[#37373A]">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black text-[#B562FF] uppercase tracking-widest">3. Primary Pain Point</h3>
                    <span className="px-3 py-1 bg-[#E5C100]/20 text-[#E5C100] rounded-full text-xs font-bold">Core Problem</span>
                  </div>
                  <p className="text-sm text-[#E5E7EB] leading-relaxed">
                    When forced to rank their challenges, <strong className="text-white">"{insights?.topChallenge?.[0]}"</strong> was consistently ranked as the most severe issue across the schools. Your landing page marketing copy should explicitly promise to solve this specific problem.
                  </p>
                </div>

                <div className="bg-[#1A1A1B]/80 backdrop-blur-md p-6 rounded-xl border border-red-500/30">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-black text-[#B562FF] uppercase tracking-widest">4. Critical Risk / Dealbreaker</h3>
                    <span className="px-3 py-1 bg-red-500/20 text-red-400 rounded-full text-xs font-bold">Warning</span>
                  </div>
                  <p className="text-sm text-[#E5E7EB] leading-relaxed">
                    The most common reason schools will refuse to use your software is <strong className="text-white">"{insights?.topDealbreaker?.[0]}"</strong> (cited by {insights?.topDealbreaker?.[1]} schools). Furthermore, <strong className="text-white">{insights?.offlineNeedPercent}% of respondents</strong> report having poor or no internet. If your app isn't fast and offline-capable, they will churn.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* --- TAB 2: DATA ANALYTICS --- */}
      {activeTab === 'analytics' && (
        <div className="max-w-7xl mx-auto animate-in fade-in duration-500">
          <h2 className="text-lg font-bold mb-4 text-[#E5E7EB]">1. School Demographics</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            <AnalyticsCard title="Enrollment Size (Q1)" data={getFrequencies('q1_enrollment')} />
            <AnalyticsCard title="Levels Offered (Q2)" data={getArrayFrequencies('q2_levels_offered')} />
            <AnalyticsCard title="Staff Count (Q3)" data={getFrequencies('q3_staff_count')} />
            <AnalyticsCard title="Average Fee / Term (Q5)" data={getFrequencies('q5_average_fee')} />
          </div>

          <h2 className="text-lg font-bold mb-4 text-[#E5E7EB]">2. Operations & Challenges</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <AnalyticsCard title="Manage Records (Q7)" data={getArrayFrequencies('q7_manage_records')} />
            <AnalyticsCard title="Track Fees (Q8)" data={getArrayFrequencies('q8_track_fees')} />
            <AnalyticsCard title="Take Attendance (Q9)" data={getArrayFrequencies('q9_take_attendance')} />
            <AnalyticsCard title="Top Admin Challenges (Q10)" data={getTopChallenges()} />
            <AnalyticsCard title="Admin Time Spent (Q11)" data={getFrequencies('q11_admin_time_spent')} />
            <AnalyticsCard title="Error Frequency (Q12)" data={getFrequencies('q12_error_frequency')} />
          </div>

          <h2 className="text-lg font-bold mb-4 text-[#E5E7EB]">3. Tech Readiness</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <AnalyticsCard title="Devices Used (Q13)" data={getArrayFrequencies('q13_devices_used')} />
            <AnalyticsCard title="Internet Access (Q14)" data={getFrequencies('q14_internet_access')} />
            <AnalyticsCard title="Parents Smartphones (Q15)" data={getFrequencies('q15_parent_smartphones')} />
            <AnalyticsCard title="Previous Software Use (Q16)" data={getFrequencies('q16_used_software_before')} />
            <AnalyticsCard title="Personal Tech Comfort (Q17)" data={getFrequencies('q17_personal_tech_comfort')} />
          </div>

          <h2 className="text-lg font-bold mb-4 text-[#E5E7EB]">4. Feature Priority (Average Rating out of 5.0)</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <FeatureCard title="Finance Features" data={getFeatureAverages('feature_finance')} />
            <FeatureCard title="Student Mgt Features" data={getFeatureAverages('feature_student')} />
            <FeatureCard title="Attendance Features" data={getFeatureAverages('feature_attendance')} />
            <FeatureCard title="Academic Features" data={getFeatureAverages('feature_academic')} />
            <FeatureCard title="Communication Features" data={getFeatureAverages('feature_communication')} />
            <FeatureCard title="Analytics Features" data={getFeatureAverages('feature_analytics')} />
          </div>

          <h2 className="text-lg font-bold mb-4 text-[#E5E7EB]">5. Pricing & Dealbreakers</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">
            <AnalyticsCard title="Willingness to Pay (Q18)" data={getFrequencies('q18_willing_to_pay')} />
            <AnalyticsCard title="Payment Structure (Q19)" data={getFrequencies('q19_payment_structure')} />
            <AnalyticsCard title="Pay More For (Q20)" data={getArrayFrequencies('q20_premium_features')} />
            <AnalyticsCard title="Dealbreakers / Refusal (Q21)" data={getArrayFrequencies('q21_refuse_to_pay_reasons')} />
            <AnalyticsCard title="Current Admin Spend (Q22)" data={getFrequencies('q22_current_admin_spend')} />
            <AnalyticsCard title="Free Trial Opt-In (Q23)" data={getFrequencies('q23_free_trial_opt_in')} />
          </div>
        </div>
      )}

      {/* --- TAB 3: INDIVIDUAL RESPONSES --- */}
      {activeTab === 'responses' && (
        <div className="max-w-7xl mx-auto bg-[#242426] border border-[#37373A] rounded-2xl shadow-xl overflow-hidden animate-in fade-in duration-500">
          
          <div className="p-5 border-b border-[#37373A] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[rgba(0,0,0,0.2)]">
            <div className="flex items-center gap-3">
              <svg className="w-5 h-5 text-[#00B8CC]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              <span className="text-sm font-bold text-[#E5E7EB] uppercase tracking-wider">Filter by Role:</span>
            </div>
            <select 
              value={roleFilter} 
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-[#1A1A1B] border border-[#37373A] text-sm text-[#E5E7EB] rounded-xl px-4 py-2 outline-none focus:border-[#00B8CC] min-w-[200px]"
            >
              <option value="All">All Roles ({responses.length})</option>
              {uniqueRoles.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[rgba(0,0,0,0.3)] border-b border-[#37373A]">
                  <th className="p-5 text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">Date</th>
                  <th className="p-5 text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">School Info</th>
                  <th className="p-5 text-xs font-bold text-[#9CA3AF] uppercase tracking-widest">Contact Details</th>
                  <th className="p-5 text-xs font-bold text-[#9CA3AF] uppercase tracking-widest text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#37373A]">
                {loading ? (
                  <tr><td colSpan={4} className="p-10 text-center text-[#9CA3AF] font-bold">Loading secure data...</td></tr>
                ) : displayedResponses.length === 0 ? (
                  <tr><td colSpan={4} className="p-10 text-center text-[#9CA3AF] font-bold">No research responses match this filter.</td></tr>
                ) : (
                  displayedResponses.map((res) => (
                    <Fragment key={res.id}>
                      <tr className="hover:bg-[rgba(255,255,255,0.02)] transition-colors">
                        
                        <td className="p-5 align-top border-r border-[#37373A]/50">
                          <p className="text-sm font-medium text-[#E5E7EB]">{new Date(res.created_at).toLocaleDateString('en-GB')}</p>
                        </td>

                        <td className="p-5 align-top border-r border-[#37373A]/50">
                          <p className="text-base font-bold text-[#00B8CC]">{res.school_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-[#E5E7EB] font-medium">{res.respondent_name}</span>
                            <span className="px-2 py-0.5 bg-[#37373A] text-[#9CA3AF] rounded text-[10px] uppercase font-bold tracking-wider">{res.role}</span>
                          </div>
                        </td>

                        <td className="p-5 align-top space-y-2 border-r border-[#37373A]/50">
                          <div className="flex items-center gap-2 text-sm text-[#E5E7EB]">{res.phone_number}</div>
                          <div className="flex items-center gap-2 text-sm text-[#E5E7EB]">{res.email_address}</div>
                        </td>

                        <td className="p-5 align-top">
                          <div className="flex flex-col gap-2 w-32 ml-auto">
                            <a href={formatWhatsAppLink(res.phone_number)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center px-3 py-2 bg-[#25D366]/10 border border-[#25D366]/30 text-[#25D366] rounded-lg hover:bg-[#25D366] hover:text-[#1A1A1B] transition-all font-bold text-[11px] uppercase tracking-wider">
                              WhatsApp
                            </a>
                            <a href={`mailto:${res.email_address}?subject=Educational Infrastructure Study`} className="flex items-center justify-center px-3 py-2 bg-[#00B8CC]/10 border border-[#00B8CC]/30 text-[#00B8CC] rounded-lg hover:bg-[#00B8CC] hover:text-[#1A1A1B] transition-all font-bold text-[11px] uppercase tracking-wider">
                              Email
                            </a>
                            <button 
                              onClick={() => setExpandedRow(expandedRow === res.id ? null : res.id)}
                              className="flex items-center justify-center px-3 py-2 bg-[#E5C100]/10 border border-[#E5C100]/30 text-[#E5C100] rounded-lg hover:bg-[#E5C100] hover:text-[#1A1A1B] transition-all font-bold text-[11px] uppercase tracking-wider"
                            >
                              {expandedRow === res.id ? 'Close' : 'View Data'}
                            </button>
                            <button 
                              onClick={() => handleDeleteResponse(res.id)}
                              disabled={isDeleting === res.id}
                              className={`flex items-center justify-center px-3 py-2 rounded-lg transition-all font-bold text-[11px] uppercase tracking-wider border ${isDeleting === res.id ? 'bg-[#37373A] text-[#9CA3AF] border-transparent' : 'bg-red-500/10 border-red-500/30 text-red-500 hover:bg-red-500 hover:text-white'}`}
                            >
                              {isDeleting === res.id ? 'Deleting...' : 'Delete'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* --- FULL 100% DATA BENTO LAYOUT FOR INDIVIDUAL RESPONSE --- */}
                      {expandedRow === res.id && (
                        <tr className="bg-[#121212] animate-in fade-in slide-in-from-top-2 duration-300 shadow-inner">
                          <td colSpan={4} className="p-0 border-b-2 border-[#00B8CC]">
                            <div className="p-6 sm:p-10 space-y-8">
                              
                              <div className="flex justify-between items-center border-b border-[#37373A] pb-4">
                                <div>
                                  <h4 className="text-lg font-black text-[#E5E7EB]">Full Respondent Profile</h4>
                                  <p className="text-xs text-[#9CA3AF] mt-1">Submitted on {new Date(res.created_at).toLocaleString()}</p>
                                </div>
                                <button 
                                  onClick={() => setExpandedRow(null)}
                                  className="px-4 py-2 bg-[#242426] border border-[#37373A] rounded-lg text-xs font-bold text-[#9CA3AF] hover:text-white hover:border-[#00B8CC] transition-all"
                                >
                                  Close View
                                </button>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {/* COLUMN 1 */}
                                <div className="space-y-6">
                                  <div className="bg-[#1A1A1B] p-5 rounded-xl border border-[#37373A]">
                                    <h5 className="text-xs font-bold text-[#00B8CC] uppercase tracking-widest mb-4 border-b border-[#37373A] pb-2">School Demographics</h5>
                                    <div className="space-y-3">
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q1. Enrollment</p><p className="text-sm text-[#E5E7EB]">{res.q1_enrollment || 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q2. Levels Offered</p><p className="text-sm text-[#E5E7EB]">{Array.isArray(res.q2_levels_offered) ? res.q2_levels_offered.join(', ') : 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q3. Staff Count</p><p className="text-sm text-[#E5E7EB]">{res.q3_staff_count || 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q4. Class Count</p><p className="text-sm text-[#E5E7EB]">{res.q4_class_count || 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q5. Avg Fee/Term</p><p className="text-sm text-[#E5E7EB]">{res.q5_average_fee || 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q6. City / Area</p><p className="text-sm text-[#E5E7EB]">{res.q6_city_area || 'N/A'}</p></div>
                                    </div>
                                  </div>

                                  <div className="bg-[#1A1A1B] p-5 rounded-xl border border-[#37373A]">
                                    <h5 className="text-xs font-bold text-[#00B8CC] uppercase tracking-widest mb-4 border-b border-[#37373A] pb-2">Tech Readiness</h5>
                                    <div className="space-y-3">
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q13. Devices Used</p><p className="text-sm text-[#E5E7EB]">{Array.isArray(res.q13_devices_used) ? res.q13_devices_used.join(', ') : 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q14. Internet Access</p><p className="text-sm text-[#E5E7EB]">{res.q14_internet_access || 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q15. Parent Smartphones</p><p className="text-sm text-[#E5E7EB]">{res.q15_parent_smartphones || 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q16. Used Software Before?</p><p className="text-sm text-[#E5E7EB]">{res.q16_used_software_before || 'N/A'}</p></div>
                                      {res.q16b_software_feedback && <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q16b. Software Notes</p><p className="text-sm text-[#E5C100] italic">{res.q16b_software_feedback}</p></div>}
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q17. Personal Tech Comfort</p><p className="text-sm text-[#E5E7EB]">{res.q17_personal_tech_comfort || 'N/A'}</p></div>
                                    </div>
                                  </div>
                                </div>

                                {/* COLUMN 2 */}
                                <div className="space-y-6">
                                  <div className="bg-[#1A1A1B] p-5 rounded-xl border border-[#37373A]">
                                    <h5 className="text-xs font-bold text-[#00B8CC] uppercase tracking-widest mb-4 border-b border-[#37373A] pb-2">Daily Operations</h5>
                                    <div className="space-y-3">
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q7. Manage Records</p><p className="text-sm text-[#E5E7EB]">{Array.isArray(res.q7_manage_records) ? res.q7_manage_records.join(', ') : 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q8. Track Fees</p><p className="text-sm text-[#E5E7EB]">{Array.isArray(res.q8_track_fees) ? res.q8_track_fees.join(', ') : 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q9. Take Attendance</p><p className="text-sm text-[#E5E7EB]">{Array.isArray(res.q9_take_attendance) ? res.q9_take_attendance.join(', ') : 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q11. Admin Time/Week</p><p className="text-sm text-[#E5E7EB]">{res.q11_admin_time_spent || 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q12. Error Frequency</p><p className="text-sm text-[#E5E7EB]">{res.q12_error_frequency || 'N/A'}</p></div>
                                      {res.q12b_recent_error_desc && <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q12b. Recent Error</p><p className="text-sm text-[#FF4D4D] italic">{res.q12b_recent_error_desc}</p></div>}
                                    </div>
                                  </div>

                                  <div className="bg-[#1A1A1B] p-5 rounded-xl border border-[#37373A]">
                                    <h5 className="text-xs font-bold text-[#E5C100] uppercase tracking-widest mb-4 border-b border-[#37373A] pb-2">Pricing & Refusals</h5>
                                    <div className="space-y-3">
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q18. Budget/Month</p><p className="text-sm text-[#E5E7EB]">{res.q18_willing_to_pay || 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q19. Payment Structure</p><p className="text-sm text-[#E5E7EB]">{res.q19_payment_structure || 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q20. Would Pay More For</p><p className="text-sm text-[#E5E7EB]">{Array.isArray(res.q20_premium_features) ? res.q20_premium_features.join(', ') : 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q21. Dealbreakers (Refusal)</p><p className="text-sm text-[#FF4D4D]">{Array.isArray(res.q21_refuse_to_pay_reasons) ? res.q21_refuse_to_pay_reasons.join(', ') : 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q22. Current Spend</p><p className="text-sm text-[#E5E7EB]">{res.q22_current_admin_spend || 'N/A'}</p></div>
                                      <div><p className="text-[10px] text-[#9CA3AF] uppercase font-bold">Q23. Free Trial Opt-in</p><p className="text-sm text-[#E5E7EB]">{res.q23_free_trial_opt_in || 'N/A'}</p></div>
                                    </div>
                                  </div>
                                </div>

                                {/* COLUMN 3 */}
                                <div className="space-y-6">
                                  <div className="bg-[#1A1A1B] p-5 rounded-xl border border-[#37373A]">
                                    <h5 className="text-xs font-bold text-[#E5C100] uppercase tracking-widest mb-4 border-b border-[#37373A] pb-2">Q10. Top Admin Challenges (Ranked)</h5>
                                    {res.q10_top_challenges && typeof res.q10_top_challenges === 'object' && Object.keys(res.q10_top_challenges).length > 0 ? (
                                      <ul className="space-y-2">
                                        {Object.entries(res.q10_top_challenges)
                                          .sort(([, a], [, b]) => (a as number) - (b as number))
                                          .map(([challenge, rank]) => (
                                            <li key={challenge} className="flex items-center gap-3 text-sm text-[#E5E7EB]">
                                              <span className="w-5 h-5 flex items-center justify-center bg-[#E5C100] text-[#1A1A1B] font-black rounded-full text-xs">{rank as number}</span>
                                              {challenge}
                                            </li>
                                        ))}
                                      </ul>
                                    ) : <p className="text-sm text-[#9CA3AF]">No ranking provided.</p>}
                                  </div>

                                  <div className="bg-[#1A1A1B] p-5 rounded-xl border border-[#37373A]">
                                    <h5 className="text-xs font-bold text-[#00B8CC] uppercase tracking-widest mb-4 border-b border-[#37373A] pb-2">Feature Prioritization (1-5)</h5>
                                    <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-[#37373A]">
                                      
                                      {[
                                        { title: "Finance", data: res.feature_finance },
                                        { title: "Student Mgt", data: res.feature_student },
                                        { title: "Attendance", data: res.feature_attendance },
                                        { title: "Academic", data: res.feature_academic },
                                        { title: "Communication", data: res.feature_communication },
                                        { title: "Analytics", data: res.feature_analytics }
                                      ].map((group, idx) => group.data && typeof group.data === 'object' && Object.keys(group.data).length > 0 && (
                                        <div key={idx} className="mb-3">
                                          <p className="text-[10px] text-[#9CA3AF] uppercase font-bold mb-2">{group.title}</p>
                                          {Object.entries(group.data).map(([feat, rating]) => (
                                            <div key={feat} className="flex justify-between items-center text-xs mb-1">
                                              <span className="text-[#E5E7EB] truncate pr-2">{feat}</span>
                                              <span className={`font-bold px-1.5 py-0.5 rounded ${Number(rating) >= 4 ? 'bg-[#00B8CC]/20 text-[#00E5FF]' : Number(rating) <= 2 ? 'bg-red-500/20 text-red-400' : 'bg-[#37373A] text-gray-300'}`}>
                                                {rating as string}/5
                                              </span>
                                            </div>
                                          ))}
                                        </div>
                                      ))}

                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* FULL WIDTH: Open Text Feedback */}
                              <div className="bg-[#1A1A1B] p-5 rounded-xl border border-[#37373A]">
                                <h5 className="text-xs font-bold text-[#00B8CC] uppercase tracking-widest mb-4 border-b border-[#37373A] pb-2">Open Text Feedback</h5>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                  <div>
                                    <p className="text-[10px] text-[#9CA3AF] uppercase font-bold mb-1">Q24. Biggest problem?</p>
                                    <p className="text-sm text-[#E5E7EB] bg-[#242426] p-3 rounded-lg border border-[#37373A] leading-relaxed italic">"{res.q24_biggest_problem || 'Left blank'}"</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-[#9CA3AF] uppercase font-bold mb-1">Q25. Desperate missing feature?</p>
                                    <p className="text-sm text-[#E5E7EB] bg-[#242426] p-3 rounded-lg border border-[#37373A] leading-relaxed italic">"{res.q25_desperate_feature || 'Left blank'}"</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-[#9CA3AF] uppercase font-bold mb-1">Q26. Advice to proprietors?</p>
                                    <p className="text-sm text-[#E5E7EB] bg-[#242426] p-3 rounded-lg border border-[#37373A] leading-relaxed italic">"{res.q26_advice_to_proprietors || 'Left blank'}"</p>
                                  </div>
                                  <div>
                                    <p className="text-[10px] text-[#9CA3AF] uppercase font-bold mb-1">Q27. Launch day requirement?</p>
                                    <p className="text-sm text-[#E5E7EB] bg-[#242426] p-3 rounded-lg border border-[#37373A] leading-relaxed italic">"{res.q27_launch_day_requirement || 'Left blank'}"</p>
                                  </div>
                                  <div className="lg:col-span-2">
                                    <p className="text-[10px] text-[#9CA3AF] uppercase font-bold mb-1">Q28. Other comments/concerns?</p>
                                    <p className="text-sm text-[#E5E7EB] bg-[#242426] p-3 rounded-lg border border-[#37373A] leading-relaxed italic">"{res.q28_other_comments || 'Left blank'}"</p>
                                  </div>
                                </div>
                              </div>

                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* --- TAB 4: DIRECT BULK MESSAGING --- */}
      {activeTab === 'messaging' && (
        <div className="max-w-4xl mx-auto animate-in fade-in duration-500">
          <div className="bg-[#242426] border border-[#37373A] rounded-2xl p-8 shadow-xl">
            <div className="flex items-center gap-4 mb-8 pb-4 border-b border-[#37373A]">
              <div className="w-12 h-12 rounded-full bg-[rgba(229,193,0,0.1)] border border-[#E5C100]/30 flex items-center justify-center">
                <svg className="w-6 h-6 text-[#E5C100]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#E5E7EB]">Direct Communication Hub</h2>
                <p className="text-sm text-[#9CA3AF]">Send updates to all <span className="text-[#00B8CC] font-bold">{total}</span> respondents.</p>
              </div>
            </div>

            {emailSuccess && (
              <div className="mb-6 p-4 bg-green-500/10 border border-green-500 text-green-400 rounded-xl font-bold flex items-center gap-2">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                Emails dispatched to backend queue successfully!
              </div>
            )}

            <div className="mb-8 p-5 bg-[#1A1A1B] border border-[#37373A] rounded-xl">
               <h3 className="text-sm font-bold text-[#E5C100] mb-2">Collected Phone Numbers (Ready for Bulk Copy)</h3>
               <textarea 
                  readOnly 
                  value={allPhoneNumbers} 
                  className="w-full bg-[#242426] text-xs text-[#9CA3AF] p-3 rounded-lg h-24 mb-3 border border-[#37373A] outline-none resize-none font-mono" 
                />
               <button 
                  onClick={handleCopyBulkNumbers}
                  className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${copySuccess ? 'bg-[#25D366] text-[#1A1A1B]' : 'bg-[#E5C100]/10 text-[#E5C100] border border-[#E5C100]/30 hover:bg-[#E5C100] hover:text-[#1A1A1B]'}`}
                >
                  {copySuccess ? '✓ Copied to Clipboard!' : 'Copy Numbers'}
                </button>
            </div>

            <div className="space-y-6 pt-6 border-t border-[#37373A]">
              <h3 className="text-sm font-bold text-[#00B8CC] mb-2 flex items-center gap-2">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Direct Bulk Email
                </h3>
              <div>
                <label className="block text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Subject</label>
                <input 
                  className="w-full p-4 bg-[#1A1A1B] border border-[#37373A] rounded-xl text-[#E5E7EB] outline-none focus:border-[#00B8CC] transition-all"
                  value={messageSubject}
                  onChange={(e) => setMessageSubject(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9CA3AF] uppercase tracking-wider mb-2">Message Body</label>
                <textarea 
                  className="w-full p-4 bg-[#1A1A1B] border border-[#37373A] rounded-xl text-[#E5E7EB] outline-none focus:border-[#00B8CC] transition-all h-48 resize-none"
                  placeholder="Type your message here..."
                  value={messageBody}
                  onChange={(e) => setMessageBody(e.target.value)}
                />
              </div>

              <button 
                onClick={handleSendDirectEmail}
                disabled={isSendingEmail}
                className={`w-full py-4 rounded-lg font-bold text-sm transition-all ${isSendingEmail ? 'bg-[#37373A] text-[#9CA3AF]' : 'bg-[#00B8CC] text-[#1A1A1B] hover:shadow-[0_0_15px_rgba(0,184,204,0.4)]'}`}
              >
                {isSendingEmail ? 'Sending via Server...' : `Send Email to ${total} Users`}
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}