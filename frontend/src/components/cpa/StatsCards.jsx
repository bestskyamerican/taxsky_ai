// ============================================================
// STATS CARDS - Dashboard Statistics - DARK THEME
// ============================================================
// Location: frontend/src/components/cpa/StatsCards.jsx
// ✅ UPDATED: Dark theme matching TaxSky design
// ============================================================

import React from 'react';

export default function StatsCards({ stats, loading, assignedZipcodes = [] }) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-slate-800 border border-slate-700 rounded-xl p-6 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-1/2 mb-2"></div>
            <div className="h-8 bg-slate-700 rounded w-1/4"></div>
          </div>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Pending Review',
      value: stats?.pending || 0,
      icon: '⏳',
      gradient: 'from-amber-500 to-orange-500',
      bgColor: 'bg-amber-500/10',
      borderColor: 'border-amber-500/30',
      textColor: 'text-amber-400'
    },
    {
      title: 'Approved',
      value: stats?.approved || 0,
      icon: '✅',
      gradient: 'from-emerald-500 to-green-500',
      bgColor: 'bg-emerald-500/10',
      borderColor: 'border-emerald-500/30',
      textColor: 'text-emerald-400'
    },
    {
      title: 'Rejected',
      value: stats?.rejected || 0,
      icon: '❌',
      gradient: 'from-red-500 to-pink-500',
      bgColor: 'bg-red-500/10',
      borderColor: 'border-red-500/30',
      textColor: 'text-red-400'
    },
    {
      title: 'Total Files',
      value: stats?.total || 0,
      icon: '📁',
      gradient: 'from-blue-500 to-purple-500',
      bgColor: 'bg-blue-500/10',
      borderColor: 'border-blue-500/30',
      textColor: 'text-blue-400'
    }
  ];

  return (
    <div className="space-y-4">
      {/* Assigned ZIP Codes Badge */}
      {assignedZipcodes.length > 0 && (
        <div className="bg-slate-800/50 border border-slate-700 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-slate-400 text-sm">📍 Your Territory:</span>
          <div className="flex flex-wrap gap-2">
            {assignedZipcodes.slice(0, 10).map((zip, i) => (
              <span key={i} className="bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded text-xs font-mono">
                {zip}
              </span>
            ))}
            {assignedZipcodes.length > 10 && (
              <span className="text-slate-500 text-xs">+{assignedZipcodes.length - 10} more</span>
            )}
          </div>
        </div>
      )}

      {/* Stats Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {cards.map((card, index) => (
          <div
            key={index}
            className={`${card.bgColor} ${card.borderColor} border rounded-xl p-6 relative overflow-hidden`}
          >
            {/* Background gradient accent */}
            <div className={`absolute top-0 right-0 w-24 h-24 bg-gradient-to-br ${card.gradient} opacity-10 rounded-full -mr-8 -mt-8`}></div>
            
            <div className="flex justify-between items-start relative">
              <div>
                <p className="text-slate-400 text-sm font-medium">{card.title}</p>
                <p className={`text-3xl font-bold ${card.textColor} mt-1`}>
                  {card.value.toLocaleString()}
                </p>
              </div>
              <span className="text-3xl opacity-80">{card.icon}</span>
            </div>
            
            {/* Today's stat if available */}
            {card.title === 'Pending Review' && stats?.today && (
              <p className="text-xs text-slate-500 mt-2">
                +{stats.today.uploaded} today
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}