import { useEffect, useState } from 'react';
import { getProgress, resetProgress } from '../services/api';
import type { ProgressOverview } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, BarChart, Bar, Cell } from 'recharts';

export default function DashboardPage() {
  const [data, setData] = useState<ProgressOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getProgress()
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8 text-center">
        <p className="text-gray-500">Loading dashboard...</p>
      </div>
    );
  }

  if (!data || data.total_attempts === 0) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-[#003057] mb-4">Dashboard</h1>
        <p className="text-gray-500 mb-4">No data yet. Complete some practice questions or take an exam to see your progress.</p>
      </div>
    );
  }

  // Prepare chart data
  const trendData = data.recent_trend.map((score, i) => ({ attempt: i + 1, score: Math.round(score) }));

  const sectionData = Object.entries(data.section_averages).map(([section, avg]) => ({
    section: section.charAt(0).toUpperCase() + section.slice(1),
    score: Math.round(avg),
  }));

  const typeData = Object.entries(data.question_type_averages)
    .map(([type, avg]) => ({
      type: type.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
      score: Math.round(avg),
    }))
    .sort((a, b) => a.score - b.score);

  const scoreColor = data.estimated_pte_score >= 65 ? '#00A651' : data.estimated_pte_score >= 50 ? '#F2A900' : '#E31837';

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#003057]">Dashboard</h1>
        <button
          onClick={async () => {
            if (window.confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
              await resetProgress();
              setData(null);
              setLoading(true);
              getProgress().then(setData).finally(() => setLoading(false));
            }
          }}
          className="bg-red-600 text-white py-2 px-4 rounded-lg text-sm hover:bg-red-700 transition-colors"
        >
          Reset Statistics
        </button>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {/* PTE Score */}
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">Estimated PTE Score</p>
          <div className="text-5xl font-bold" style={{ color: scoreColor }}>
            {data.estimated_pte_score}
          </div>
          <p className="text-xs text-gray-400 mt-1">out of 90</p>
        </div>

        {/* Total Attempts */}
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">Total Questions Answered</p>
          <div className="text-5xl font-bold text-[#0072CE]">{data.total_attempts}</div>
        </div>

        {/* Average Score */}
        <div className="bg-white rounded-xl shadow-md p-6 text-center">
          <p className="text-sm text-gray-500 mb-2">Average Score</p>
          <div className="text-5xl font-bold text-[#003057]">{Math.round(data.average_score)}%</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Score Trend */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-[#003057] mb-4">Score Trend</h2>
          {trendData.length > 1 ? (
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="attempt" label={{ value: 'Attempt', position: 'insideBottom', offset: -5 }} />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#0072CE" strokeWidth={2} dot={{ fill: '#0072CE' }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">Need more data to show trend.</p>
          )}
        </div>

        {/* Section Radar */}
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-[#003057] mb-4">Section Performance</h2>
          {sectionData.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <RadarChart data={sectionData}>
                <PolarGrid />
                <PolarAngleAxis dataKey="section" />
                <PolarRadiusAxis domain={[0, 100]} />
                <Radar dataKey="score" stroke="#0072CE" fill="#0072CE" fillOpacity={0.3} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-gray-400 text-sm py-8 text-center">No section data yet.</p>
          )}
        </div>
      </div>

      {/* Question Type Performance */}
      {typeData.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6 mb-8">
          <h2 className="text-lg font-semibold text-[#003057] mb-4">Performance by Question Type</h2>
          <ResponsiveContainer width="100%" height={Math.max(250, typeData.length * 35)}>
            <BarChart data={typeData} layout="vertical" margin={{ left: 150 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} />
              <YAxis type="category" dataKey="type" width={140} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Bar dataKey="score" radius={[0, 4, 4, 0]}>
                {typeData.map((entry, index) => (
                  <Cell key={index} fill={entry.score >= 70 ? '#00A651' : entry.score >= 40 ? '#F2A900' : '#E31837'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weak Areas */}
      {data.weakest_areas.length > 0 && (
        <div className="bg-white rounded-xl shadow-md p-6">
          <h2 className="text-lg font-semibold text-[#003057] mb-4">Areas to Improve</h2>
          <div className="space-y-3">
            {data.weakest_areas.map((area) => (
              <div key={area.type} className="flex items-center justify-between p-3 bg-red-50 rounded-lg border border-red-100">
                <div>
                  <span className="font-medium text-sm text-red-800 capitalize">
                    {area.type.replace(/_/g, ' ')}
                  </span>
                  <p className="text-xs text-red-600 mt-0.5">{area.tip}</p>
                </div>
                <span className="text-lg font-bold text-red-600">{Math.round(area.avg_score)}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
