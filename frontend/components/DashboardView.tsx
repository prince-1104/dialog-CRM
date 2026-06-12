import React, { useState, useEffect } from 'react';
import { 
  PhoneOutgoing, 
  DollarSign, 
  Target, 
  ArrowUpRight, 
  ArrowDownRight,
  Activity,
  Bot,
  UserCheck
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { getAnalyticsOverview, getAnalyticsCalls, getAnalyticsLeads } from '../lib/api';

const defaultCallHistoryData = [
  { day: 'Mon', connected: 42, failed: 8 },
  { day: 'Tue', connected: 58, failed: 12 },
  { day: 'Wed', connected: 72, failed: 15 },
  { day: 'Thu', connected: 64, failed: 9 },
  { day: 'Fri', connected: 85, failed: 19 },
  { day: 'Sat', connected: 24, failed: 4 },
  { day: 'Sun', connected: 18, failed: 3 },
];

const defaultStageRevenueData = [
  { stage: 'Leads', value: 12000 },
  { stage: 'Qualified', value: 34000 },
  { stage: 'Proposal', value: 58000 },
  { stage: 'Negotiation', value: 85000 },
  { stage: 'Won', value: 110000 },
];

const defaultSentimentData = [
  { name: 'Positive', value: 65, color: '#10b981' },
  { name: 'Neutral', value: 25, color: '#f59e0b' },
  { name: 'Negative', value: 10, color: '#ef4444' },
];

export const DashboardView: React.FC = () => {
  const [overview, setOverview] = useState<any>(null);
  const [callsAnalytics, setCallsAnalytics] = useState<any>(null);
  const [leadsAnalytics, setLeadsAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        const [ov, ca, la] = await Promise.all([
          getAnalyticsOverview(),
          getAnalyticsCalls(),
          getAnalyticsLeads()
        ]);
        setOverview(ov);
        setCallsAnalytics(ca);
        setLeadsAnalytics(la);
      } catch (err) {
        console.error('Failed to fetch dashboard analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="h-[calc(100vh-6rem)] flex items-center justify-center text-zinc-500 font-mono text-xs">
        <div className="flex flex-col items-center gap-2">
          <div className="h-5 w-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
          <span>Loading Dashboard Metrics...</span>
        </div>
      </div>
    );
  }

  // Fallback mappings if database statistics are empty
  const callHistoryData = callsAnalytics?.by_date && callsAnalytics.by_date.length > 0
    ? callsAnalytics.by_date.map((item: any) => ({
        day: item.date.substring(5),
        connected: item.answered,
        failed: item.no_answer
      }))
    : defaultCallHistoryData;

  const stageRevenueData = leadsAnalytics?.pipeline_funnel && leadsAnalytics.pipeline_funnel.length > 0
    ? leadsAnalytics.pipeline_funnel.map((item: any) => ({
        stage: item.stage.split(' ')[0],
        value: item.value
      }))
    : defaultStageRevenueData;

  const sentimentData = callsAnalytics?.by_intent && callsAnalytics.by_intent.length > 0
    ? [
        { name: 'Positive', value: callsAnalytics.by_intent.find((i: any) => i.intent === 'interested')?.count || 10, color: '#10b981' },
        { name: 'Neutral', value: callsAnalytics.by_intent.find((i: any) => i.intent === 'general_question')?.count || 5, color: '#f59e0b' },
        { name: 'Negative', value: callsAnalytics.by_intent.find((i: any) => i.intent === 'not_interested')?.count || 2, color: '#ef4444' }
      ]
    : defaultSentimentData;

  return (
    <div className="space-y-6 text-left pb-12">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric Card 1 */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400">Total Deals Value</span>
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <DollarSign className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-100">
              ${(overview?.total_deals_value || 0).toLocaleString(undefined, { minimumFractionDigits: 0 })}
            </span>
            <span className="text-[10px] font-bold text-emerald-400 flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/25">
              <ArrowUpRight className="h-3 w-3 mr-0.5" />
              Optimal
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">Active pipeline values across stages</p>
        </div>

        {/* Metric Card 2 */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400">Total Calls Placed</span>
            <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <PhoneOutgoing className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-100">{overview?.total_calls || 0} calls</span>
            <span className="text-[10px] font-bold text-emerald-400 flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/25">
              <ArrowUpRight className="h-3 w-3 mr-0.5" />
              Live
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">Cumulative synthetic agent talks</p>
        </div>

        {/* Metric Card 3 */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400">Agent Conversion</span>
            <div className="p-2 rounded-xl bg-pink-500/10 text-pink-400 border border-pink-500/20">
              <Target className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-100">
              {(overview?.conversion_rate || 0).toFixed(1)}%
            </span>
            <span className="text-[10px] font-bold text-emerald-400 flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/25">
              <ArrowUpRight className="h-3 w-3 mr-0.5" />
              Direct
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">Outbound campaigns booking rate</p>
        </div>

        {/* Metric Card 4 */}
        <div className="glass-panel p-5 rounded-2xl relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-zinc-400">Active AI Agents</span>
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Bot className="h-4.5 w-4.5" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-zinc-100">{overview?.active_agents || 0} Online</span>
            <span className="text-[10px] font-bold text-emerald-400 flex items-center bg-emerald-500/10 px-1.5 py-0.5 rounded-full border border-emerald-500/25">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1 pulse-active"></span>
              Optimal
            </span>
          </div>
          <p className="text-[10px] text-zinc-500 mt-2">Active LLM agents serving campaigns</p>
        </div>
      </div>

      {/* Graphs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main call chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col h-96">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-bold text-zinc-200">Outbound Call Performance</h3>
              <span className="text-[10px] text-zinc-500">Weekly call volume breakdown</span>
            </div>
            <div className="flex gap-4 text-xs font-mono">
              <div className="flex items-center gap-1.5 text-purple-400">
                <span className="h-2 w-2 rounded bg-purple-500"></span> Connected
              </div>
              <div className="flex items-center gap-1.5 text-zinc-600">
                <span className="h-2 w-2 rounded bg-zinc-700"></span> Failed / Busy
              </div>
            </div>
          </div>
          <div className="flex-1 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={callHistoryData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorConnected" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="day" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#f4f4f5' }}
                />
                <Area type="monotone" dataKey="connected" stroke="#8b5cf6" fillOpacity={1} fill="url(#colorConnected)" strokeWidth={2} />
                <Area type="monotone" dataKey="failed" stroke="#52525b" fill="none" strokeWidth={1.5} strokeDasharray="4 4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Sentiment Analysis Pie Chart */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col h-96">
          <h3 className="text-sm font-bold text-zinc-200 mb-1">AI Sentiment Score</h3>
          <span className="text-[10px] text-zinc-500 mb-6">Aggregate customer response mood</span>
          
          <div className="flex-1 flex items-center justify-center relative">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="45%"
                  innerRadius={55}
                  outerRadius={75}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
            
            {/* Center Sentiment Label */}
            <div className="absolute top-[40%] flex flex-col items-center justify-center pointer-events-none">
              <span className="text-xl font-black text-zinc-200">88%</span>
              <span className="text-[9px] text-emerald-400 font-bold uppercase tracking-wider">Positive Avg</span>
            </div>
          </div>

          <div className="space-y-2.5 mt-auto">
            {sentimentData.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: item.color }}></span>
                  <span className="text-zinc-400 font-medium">{item.name} Mood</span>
                </div>
                <span className="font-mono font-bold text-zinc-300">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3 - Revenue stages and Live logs */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Deal pipeline chart */}
        <div className="glass-panel p-6 rounded-2xl flex flex-col h-80">
          <h3 className="text-sm font-bold text-zinc-200 mb-1">Pipeline Distribution</h3>
          <span className="text-[10px] text-zinc-500 mb-6">Deals volume value by current sales stages</span>
          <div className="flex-1 w-full text-xs font-mono">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stageRevenueData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="stage" stroke="#71717a" fontSize={10} />
                <YAxis stroke="#71717a" fontSize={10} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '12px', color: '#f4f4f5' }}
                />
                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]}>
                  {stageRevenueData.map((entry, idx) => (
                    <Cell 
                      key={`cell-${idx}`} 
                      fill={idx === 4 ? '#10b981' : '#8b5cf6'} 
                      opacity={0.8 - idx * 0.1}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live system logs / activity stream */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl flex flex-col h-80 overflow-hidden">
          <h3 className="text-sm font-bold text-zinc-200 mb-1">System Audit & Events</h3>
          <span className="text-[10px] text-zinc-500 mb-4">Real-time status updates of AI interactions</span>

          <div className="flex-1 overflow-y-auto space-y-3 scrollbar-thin">
            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-900/35 border border-zinc-850 text-xs">
              <div className="p-1 rounded bg-purple-600/10 text-purple-400 mt-0.5">
                <Bot className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-zinc-300">Campaign Call Completed</span>
                  <span className="text-[9px] text-zinc-650 font-mono">Just now</span>
                </div>
                <p className="text-zinc-400">Sarah AI finished dialer sequence with <strong>John Peterson</strong>. Deal stage updated to Proposal Sent.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-900/35 border border-zinc-850 text-xs">
              <div className="p-1 rounded bg-emerald-600/10 text-emerald-400 mt-0.5">
                <UserCheck className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-zinc-300">New Qualified Lead</span>
                  <span className="text-[9px] text-zinc-650 font-mono">10m ago</span>
                </div>
                <p className="text-zinc-400">Inbound caller <strong>David Kim</strong> qualified by Max AI for Enterprise Plan upgrade.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-2.5 rounded-xl bg-zinc-900/35 border border-zinc-850 text-xs">
              <div className="p-1 rounded bg-zinc-800 text-zinc-400 mt-0.5">
                <Activity className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="font-bold text-zinc-300">Celery Beat Scheduler Heartbeat</span>
                  <span className="text-[9px] text-zinc-650 font-mono">25m ago</span>
                </div>
                <p className="text-zinc-400">Dispatched recurring campaign triggers for Tech Founders Outbound leads list.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
