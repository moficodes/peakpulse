import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Target, 
  Minus, 
  AlertCircle, 
  Flame, 
  Trash2, 
  RefreshCcw, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp,
  Clock,
  Calendar,
  Download,
  Settings,
  X
} from 'lucide-react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  AreaChart,
  Area
} from 'recharts';
import { useState, useEffect, useMemo } from 'react';
import { MOODS, DAYS, HOURS, MoodId, Mood } from './constants';

type GridData = Record<string, MoodId>; // Key: "day-hour", Value: moodId

const formatHour = (h: number) => {
  const ampm = h >= 12 ? 'PM' : 'AM';
  const displayHour = h % 12 || 12;
  return `${displayHour}${ampm}`;
};

export default function App() {
  const [data, setData] = useState<GridData>(() => {
    const saved = localStorage.getItem('peakpulse-data');
    return saved ? JSON.parse(saved) : {};
  });

  const [moodColors, setMoodColors] = useState<Record<MoodId, string>>(() => {
    const saved = localStorage.getItem('peakpulse-colors');
    if (saved) return JSON.parse(saved);
    return {
      'productive': '#059669',
      'focused': '#5eead4',
      'neutral': '#e2e8f0',
      'distracted': '#fbbf24',
      'burned-out': '#f43f5e'
    };
  });

  const [selectedCells, setSelectedCells] = useState<{ day: number, hour: number }[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ day: number, hour: number } | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  useEffect(() => {
    const handleMouseUpGlobal = () => setIsDragging(false);
    window.addEventListener('mouseup', handleMouseUpGlobal);
    return () => window.removeEventListener('mouseup', handleMouseUpGlobal);
  }, []);

  useEffect(() => {
    localStorage.setItem('peakpulse-data', JSON.stringify(data));
  }, [data]);

  useEffect(() => {
    localStorage.setItem('peakpulse-colors', JSON.stringify(moodColors));
  }, [moodColors]);

  const getCellsInRange = (start: { day: number, hour: number }, end: { day: number, hour: number }) => {
    const cells = [];
    const minDay = Math.min(start.day, end.day);
    const maxDay = Math.max(start.day, end.day);
    const minHour = Math.min(start.hour, end.hour);
    const maxHour = Math.max(start.hour, end.hour);

    for (let d = minDay; d <= maxDay; d++) {
      for (let h = minHour; h <= maxHour; h++) {
        cells.push({ day: d, hour: h });
      }
    }
    return cells;
  };

  const handleMouseDown = (day: number, hour: number) => {
    setIsDragging(true);
    setDragStart({ day, hour });
    setSelectedCells([{ day, hour }]);
  };

  const handleMouseEnter = (day: number, hour: number) => {
    if (isDragging && dragStart) {
      setSelectedCells(getCellsInRange(dragStart, { day, hour }));
    }
  };

  const setMood = (moodId: MoodId) => {
    if (selectedCells.length === 0) return;
    setData(prev => {
      const next = { ...prev };
      selectedCells.forEach(cell => {
        next[`${cell.day}-${cell.hour}`] = moodId;
      });
      return next;
    });
  };

  const clearCell = () => {
    if (selectedCells.length === 0) return;
    setData(prev => {
      const next = { ...prev };
      selectedCells.forEach(cell => {
        delete next[`${cell.day}-${cell.hour}`];
      });
      return next;
    });
  };

  const resetAll = () => {
    if (confirm('Are you sure you want to clear all data?')) {
      setData({});
      localStorage.removeItem('peakpulse-data');
    }
  };

  const exportToCSV = () => {
    if (Object.keys(data).length === 0) {
      alert('No data to export.');
      return;
    }

    const headers = ['Day', 'Hour', 'Mood', 'Energy Score'];
    const moodScores: Record<MoodId, number> = {
      'productive': 5,
      'focused': 4,
      'neutral': 3,
      'distracted': 2,
      'burned-out': 1
    };

    const rows = Object.entries(data).map(([key, value]) => {
      const moodId = value as MoodId;
      const [dayIdx, hour] = key.split('-').map(Number);
      const mood = MOODS[moodId];
      return [
        DAYS[dayIdx],
        formatHour(hour),
        mood.label,
        moodScores[moodId]
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `peakpulse_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const getMoodAt = (day: number, hour: number): Mood | null => {
    const moodId = data[`${day}-${hour}`];
    return moodId ? MOODS[moodId] : null;
  };

  // Insights calculations
  const insights = useMemo(() => {
    const hourStats: Record<number, { score: number, count: number }> = {};
    const moodScores: Record<MoodId, number> = {
      'productive': 5,
      'focused': 4,
      'neutral': 3,
      'distracted': 2,
      'burned-out': 1
    };

    Object.entries(data).forEach(([key, moodId]) => {
      const hour = parseInt(key.split('-')[1]);
      const score = moodScores[moodId as MoodId] || 0;
      if (!hourStats[hour]) hourStats[hour] = { score: 0, count: 0 };
      hourStats[hour].score += score;
      hourStats[hour].count += 1;
    });

    let peakHour = -1;
    let maxAvg = 0;
    let slumpHour = -1;
    let minAvg = 6;
    let totalScore = 0;
    let totalCount = 0;

    Object.entries(hourStats).forEach(([hourStr, stats]) => {
      const hour = Number(hourStr);
      const avg = stats.score / stats.count;
      totalScore += stats.score;
      totalCount += stats.count;
      
      if (avg > maxAvg) {
        maxAvg = avg;
        peakHour = hour;
      }
      if (avg < minAvg) {
        minAvg = avg;
        slumpHour = hour;
      }
    });

    const averageEnergy = totalCount > 0 ? totalScore / totalCount : 0;
    
    // Prepare chart data: Average energy for each hour (0-23)
    const chartData = HOURS.map(hour => {
      const stats = hourStats[hour];
      return {
        hour,
        displayHour: formatHour(hour),
        energy: stats ? (stats.score / stats.count) : null
      };
    });
    
    let trendDescription = "Start logging your moods to see your weekly performance trend.";
    if (totalCount > 0) {
      if (averageEnergy >= 4.2) {
        trendDescription = "You're in peak performance mode! Your focus and productivity have been exceptionally high this week.";
      } else if (averageEnergy >= 3.5) {
        trendDescription = "You're maintaining a strong, steady rhythm. You've found a good balance between effort and recovery.";
      } else if (averageEnergy >= 2.8) {
        trendDescription = "Your energy is holding at a baseline level. You might benefit from more intentional deep work sessions.";
      } else if (averageEnergy >= 2.0) {
        trendDescription = "Energy levels are dipping below average. Consider prioritizing rest or adjusting your expectations for the week.";
      } else {
        trendDescription = "You're showing signs of high fatigue. This is a critical time to prioritize recovery and avoid burnout.";
      }
    }

    return { peakHour, slumpHour, totalHours: totalCount, averageEnergy, trendDescription, chartData };
  }, [data]);

  return (
    <div className="min-h-screen bg-[#F9FAFB] font-sans text-slate-900 flex flex-col">
      <div className="w-full max-w-7xl mx-auto flex-1 flex flex-col">
        
        {/* Header */}
        <header className="flex items-center justify-between px-6 md:px-10 py-8 bg-white border-b border-slate-100 w-full">
          <div className="flex flex-col">
            <h1 className="text-2xl font-semibold tracking-tight text-slate-800">PeakPulse</h1>
            <p className="text-sm text-slate-500 font-medium uppercase tracking-widest mt-1">
              Performance Heatmap • {DAYS[0]} — {DAYS[6]}
            </p>
          </div>
          
          <div className="flex gap-8 text-right items-center">
            <div className="hidden md:flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Peak Performance</span>
              <span className="text-lg font-medium text-emerald-600 underline underline-offset-4 decoration-2">
                {insights.peakHour !== -1 ? formatHour(insights.peakHour) : '--:--'}
              </span>
            </div>
            <div className="hidden md:flex flex-col">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lowest Energy</span>
              <span className="text-lg font-medium text-rose-500">
                {insights.slumpHour !== -1 ? formatHour(insights.slumpHour) : '--:--'}
              </span>
            </div>
            <button 
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 text-slate-400 hover:text-indigo-500 transition-colors border border-slate-100 rounded-lg hover:bg-indigo-50 ml-4"
              title="Color Settings"
            >
              <Settings size={18} />
            </button>
            <button 
              onClick={exportToCSV}
              className="p-2 text-slate-400 hover:text-indigo-500 transition-colors border border-slate-100 rounded-lg hover:bg-indigo-50 ml-2"
              title="Export to CSV"
            >
              <Download size={18} />
            </button>
            <button 
              onClick={resetAll}
              className="p-2 text-slate-400 hover:text-red-500 transition-colors border border-slate-100 rounded-lg hover:bg-red-50 ml-2"
              title="Clear all data"
            >
              <Trash2 size={18} />
            </button>
          </div>
        </header>

        <main className="flex-1 p-4 md:p-10 flex flex-col gap-10">
          {/* Main Grid View */}
          <section className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 w-full">
            <div className="flex justify-between items-center mb-10">
              <div className="flex items-center gap-3">
                <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
                <h2 className="text-xl font-semibold text-slate-800">Weekly Energy Flow</h2>
              </div>
              
              <div className="flex gap-4 items-center">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Heatmap Intensity</span>
                <div className="flex gap-1 items-center">
                  {Object.values(MOODS).reverse().map(m => (
                    <div 
                      key={m.id} 
                      className="w-3.5 h-3.5 rounded-sm shadow-sm" 
                      style={{ backgroundColor: moodColors[m.id as MoodId] }}
                      title={m.label} 
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto pb-4 scrollbar-hide">
              <div className="min-w-[850px]">
                {/* Grid Header (Hours) */}
                <div className="grid grid-cols-[80px_repeat(24,1fr)] gap-2 mb-6">
                  <div />
                  {HOURS.map(h => (
                    <div key={h} className="text-[10px] font-bold text-slate-300 uppercase text-center transition-colors hover:text-slate-500">
                      {h % 3 === 0 ? h.toString().padStart(2, '0') : ''}
                    </div>
                  ))}
                </div>

                {/* Grid Rows (Days) */}
                <div className="space-y-1.5">
                  {DAYS.map((day, dayIdx) => (
                    <div key={day} className="grid grid-cols-[80px_repeat(24,1fr)] gap-1.5 items-center">
                      <div className="text-[11px] font-bold text-slate-400 uppercase tracking-tighter pr-4 text-right">
                        {day}
                      </div>
                      {HOURS.map(hour => {
                        const mood = getMoodAt(dayIdx, hour);
                        const isSelected = selectedCells.some(c => c.day === dayIdx && c.hour === hour);
                        
                        const now = new Date();
                        const jsDay = now.getDay();
                        const currentDayIdx = jsDay === 0 ? 6 : jsDay - 1;
                        const currentHour = now.getHours();
                        const isCurrent = currentDayIdx === dayIdx && currentHour === hour;

                        return (
                          <motion.button
                            key={`${dayIdx}-${hour}-${mood?.id || 'empty'}-${isSelected}`}
                            initial={mood ? { scale: 0.9, opacity: 0.8 } : false}
                            animate={{ 
                              scale: isSelected ? 1.05 : 1, 
                              opacity: 1,
                              filter: isSelected ? 'brightness(1.05) saturate(1.1)' : 'brightness(1) saturate(1)',
                            }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                            whileHover={{ 
                              scale: 1.1, 
                              zIndex: 40, 
                              borderRadius: '8px',
                              boxShadow: '0 8px 16px rgba(0,0,0,0.12)'
                            }}
                            whileTap={{ scale: 0.9 }}
                            onMouseDown={() => handleMouseDown(dayIdx, hour)}
                            onMouseEnter={() => handleMouseEnter(dayIdx, hour)}
                            className={`
                              h-9 rounded-sm border transition-all relative select-none cursor-pointer
                              ${isSelected ? `ring-2 ring-indigo-500 ring-offset-2 z-30 border-white rounded-[4px] ${!mood ? 'bg-indigo-50' : ''}` : 'border-slate-100/50'}
                              ${!mood && !isSelected ? 'bg-slate-50 hover:bg-slate-100' : ''}
                            `}
                            style={{ 
                              backgroundColor: mood ? moodColors[mood.id] : (isSelected && !mood ? undefined : undefined),
                              borderColor: mood ? 'transparent' : undefined
                            }}
                          >
                            {isSelected && (
                              <motion.div 
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="absolute inset-0 bg-indigo-500/10 blur-sm rounded-sm" 
                              />
                            )}
                            {isCurrent && !mood && (
                              <motion.div 
                                animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.05, 1] }}
                                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                                className="absolute inset-0 bg-indigo-500/20 rounded-sm"
                              />
                            )}
                            {isCurrent && (
                              <motion.div 
                                animate={{ scale: [1, 1.5, 1] }}
                                transition={{ duration: 1.5, repeat: Infinity }}
                                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-indigo-500 rounded-full shadow-[0_0_8px_rgba(99,102,241,0.5)]" 
                              />
                            )}
                          </motion.button>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <div className="flex justify-between items-center mt-10 pt-6 border-t border-slate-50 text-[10px] font-medium text-slate-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                <span>Live performance monitoring active</span>
              </div>
              <div className="flex gap-4">
                <span>Total tracked: {Object.keys(data).length} hours</span>
                <span>Last updated: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </div>
          </section>
          
          {/* Weekly Performance Summary */}
          <section className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 w-full">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-emerald-500 rounded-full" />
              <h2 className="text-xl font-semibold text-slate-800">Weekly Performance Summary</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Volume</span>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-bold text-slate-800">{insights.totalHours}</span>
                  <span className="text-sm font-medium text-slate-400">hours tracked</span>
                </div>
                <p className="text-xs text-slate-500 mt-2">Consistent logging helps identifying long-term productivity patterns.</p>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Weekly Energy Average</span>
                <div className="flex items-center gap-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl font-bold text-slate-800">{insights.averageEnergy.toFixed(1)}</span>
                    <span className="text-sm font-medium text-slate-400">/ 5.0</span>
                  </div>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(insights.averageEnergy / 5) * 100}%` }}
                      className="h-full"
                      style={{ 
                        backgroundColor: 
                          insights.averageEnergy >= 4.5 ? moodColors['productive'] : 
                          insights.averageEnergy >= 3.5 ? moodColors['focused'] : 
                          insights.averageEnergy >= 2.5 ? moodColors['neutral'] : 
                          insights.averageEnergy >= 1.5 ? moodColors['distracted'] : moodColors['burned-out']
                      }}
                    />
                  </div>
                </div>
                <p className="text-xs text-slate-500 mt-2">Your aggregate vibration across all recorded hours this week.</p>
              </div>

              <div className="flex flex-col gap-2 lg:col-span-1 md:col-span-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Efficiency Trend</span>
                <div className="bg-[#F9FAFB] p-4 rounded-2xl border border-slate-100">
                  <p className="text-sm font-medium text-slate-700 leading-relaxed">
                    {insights.trendDescription}
                  </p>
                </div>
              </div>
            </div>
          </section>
          
          {/* Hourly Energy Trends Chart */}
          <section className="bg-white p-6 md:p-10 rounded-[2.5rem] shadow-sm border border-slate-100 w-full">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-1.5 h-6 bg-indigo-500 rounded-full" />
              <h2 className="text-xl font-semibold text-slate-800">Hourly Energy Trends</h2>
            </div>
            
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart
                  data={insights.chartData}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis 
                    dataKey="displayHour" 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    interval={3}
                  />
                  <YAxis 
                    domain={[0, 5]} 
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    ticks={[0, 1, 2, 3, 4, 5]}
                  />
                  <Tooltip 
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-white p-3 border border-slate-100 shadow-xl rounded-xl">
                            <p className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-wider">{data.displayHour}</p>
                            <div className="flex items-center gap-2">
                              <span className="text-lg font-bold text-slate-800">
                                {data.energy ? data.energy.toFixed(1) : 'No data'}
                              </span>
                              <span className="text-xs text-slate-400">/ 5.0</span>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="energy" 
                    stroke="#6366f1" 
                    strokeWidth={4}
                    strokeLinecap="round"
                    connectNulls
                    dot={{ r: 5, fill: '#6366f1', strokeWidth: 3, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0, fill: '#4f46e5' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
            
            <p className="text-center text-[10px] font-bold text-slate-300 uppercase tracking-widest mt-6">
              Vibration patterns across a 24-hour cycle
            </p>
          </section>
        </main>

        {/* Interaction Bar (Themed) */}
        <AnimatePresence mode="wait">
          {selectedCells.length > 0 ? (
            <motion.div
              initial={{ y: 100, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 100, opacity: 0 }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white border border-slate-100 shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2rem] p-3 flex items-center gap-6 z-50 overflow-hidden"
            >
              <div className="flex items-center gap-4 pl-4 pr-6 border-r border-slate-100">
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Logging</span>
                  <span className="text-sm font-semibold text-slate-800">
                    {selectedCells.length === 1 
                      ? `${DAYS[selectedCells[0].day]} • ${formatHour(selectedCells[0].hour)}`
                      : `${selectedCells.length} slots selected`}
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                {Object.values(MOODS).map((mood) => {
                  const isCurrentMood = selectedCells.length === 1 && data[`${selectedCells[0].day}-${selectedCells[0].hour}`] === mood.id;
                  
                  return (
                    <button
                      key={mood.id}
                      onClick={() => setMood(mood.id)}
                      className={`
                        px-4 py-2.5 rounded-xl border font-bold text-xs transition-all active:scale-95
                        ${isCurrentMood ? 'ring-2 ring-offset-2 ring-slate-200' : ''}
                      `}
                      style={{
                        backgroundColor: moodColors[mood.id],
                        color: mood.id === 'neutral' || mood.id === 'focused' ? '#475569' : '#fff',
                        borderColor: 'transparent'
                      }}
                    >
                      {mood.label}
                    </button>
                  );
                })}
                
                <div className="w-[1px] bg-slate-100 mx-1" />
                
                <button
                  onClick={clearCell}
                  className="p-2.5 rounded-xl bg-slate-50 text-slate-400 hover:text-slate-600 transition-all border border-slate-100"
                  title="Clear slot"
                >
                  <RefreshCcw size={18} />
                </button>
                
                <button
                  onClick={() => setSelectedCells([])}
                  className="p-2.5 rounded-xl bg-slate-800 text-white hover:bg-black transition-all shadow-lg"
                  title="Close"
                >
                  <ChevronRight size={18} />
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-white/80 backdrop-blur-sm border border-slate-100 px-6 py-3 rounded-full text-xs font-bold text-slate-400 uppercase tracking-widest shadow-sm"
            >
              Select a time slice to record your flow
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <footer className="w-full max-w-5xl mx-auto px-10 py-12 flex flex-col items-center gap-8 border-t border-slate-50">
          <div className="flex flex-wrap justify-center gap-12">
            {Object.values(MOODS).map(m => (
              <div key={m.id} className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3.5 h-3.5 rounded-sm shadow-sm" 
                    style={{ backgroundColor: moodColors[m.id as MoodId] }}
                  />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-slate-600">{m.label}</span>
                </div>
                <p className="text-[10px] text-slate-400 max-w-[140px] leading-relaxed italic">
                  {m.description}
                </p>
              </div>
            ))}
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">Built for high-output individuals</p>
            <p className="text-[10px] text-slate-400">&copy; {new Date().getFullYear()} PeakPulse Energy Mapping System</p>
          </div>
        </footer>

        {/* Global Settings Modal */}
        <AnimatePresence>
          {isSettingsOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-white rounded-[2.5rem] p-8 md:p-10 shadow-2xl border border-slate-100 max-w-md w-full"
              >
                <div className="flex justify-between items-center mb-8">
                  <div className="flex flex-col">
                    <h2 className="text-xl font-semibold text-slate-800">Personalize Pulse</h2>
                    <p className="text-xs text-slate-400 font-medium">Custom color mapping for your energy flows</p>
                  </div>
                  <button onClick={() => setIsSettingsOpen(false)} className="p-2 hover:bg-slate-50 rounded-full text-slate-400 transition-colors">
                    <X size={20} />
                  </button>
                </div>
                <div className="space-y-5">
                  {Object.values(MOODS).map(m => (
                    <div key={m.id} className="flex items-center justify-between p-3 rounded-2xl border border-slate-50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-10 h-10 rounded-xl shadow-inner border border-white"
                          style={{ backgroundColor: moodColors[m.id as MoodId] }}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-700">{m.label}</span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-[0.2em]">{m.id}</span>
                        </div>
                      </div>
                      <div className="relative">
                        <input 
                          type="color" 
                          value={moodColors[m.id as MoodId]} 
                          onChange={(e) => setMoodColors(prev => ({ ...prev, [m.id]: e.target.value }))}
                          className="w-12 h-12 rounded-xl border-0 cursor-pointer p-0 overflow-hidden bg-transparent"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-10 flex flex-col gap-3">
                  <button 
                    onClick={() => setIsSettingsOpen(false)}
                    className="w-full bg-slate-900 hover:bg-black text-white font-bold py-4 rounded-2xl transition-all shadow-xl shadow-slate-200"
                  >
                    Done
                  </button>
                  <button 
                    onClick={() => {
                      if (confirm('Reset colors to system defaults?')) {
                        setMoodColors({
                          'productive': '#059669',
                          'focused': '#5eead4',
                          'neutral': '#e2e8f0',
                          'distracted': '#fbbf24',
                          'burned-out': '#f43f5e'
                        });
                      }
                    }}
                    className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hover:text-rose-500 transition-colors"
                  >
                    Reset Defaults
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
