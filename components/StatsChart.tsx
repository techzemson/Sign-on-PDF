import React from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DocStats } from '../types';

interface StatsChartProps {
  stats: DocStats;
}

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

const StatsChart: React.FC<StatsChartProps> = ({ stats }) => {
  const data = [
    { name: 'Text Content', value: stats.estimatedTextContent },
    { name: 'Graphics/Images', value: 100 - stats.estimatedTextContent },
  ];

  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 h-full">
      <h3 className="text-sm font-semibold text-slate-700 mb-2">Analysis Result</h3>
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500">Pages</p>
          <p className="text-lg font-bold text-slate-800">{stats.pageCount}</p>
        </div>
        <div className="text-center p-2 bg-slate-50 rounded-lg">
          <p className="text-xs text-slate-500">Size</p>
          <p className="text-lg font-bold text-slate-800">{stats.fileSizeMB} MB</p>
        </div>
      </div>
      <div className="h-40 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={40}
              outerRadius={60}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend iconSize={8} wrapperStyle={{ fontSize: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default StatsChart;