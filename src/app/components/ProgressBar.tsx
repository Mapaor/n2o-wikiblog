import React from 'react';

interface ProgressBarProps {
  current: number;
  total: number;
  loading: boolean;
}

export default function ProgressBar({ current, total, loading }: ProgressBarProps) {
  const percent = total > 0 ? Math.min(100, Math.round((current / total) * 100)) : 0;
  return (
    <div className="w-full mt-6">
      <div className="flex justify-between mb-1">
        <span className="text-sm font-medium text-green-700">Processant blocs...</span>
        <span className="text-sm font-medium text-green-700">{current}/{total}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-4 dark:bg-gray-700">
        <div
          className={`h-4 rounded-full transition-all duration-300 ${loading ? 'bg-green-500 animate-pulse' : 'bg-green-400'}`}
          style={{ width: `${percent}%` }}
        ></div>
      </div>
      {loading && (
        <div className="text-xs text-gray-500 mt-2 text-center animate-pulse">Processant bloc {current} de {total}...</div>
      )}
    </div>
  );
}
