import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: number | string;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color?: "indigo" | "green" | "blue" | "orange";
  delay?: string;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, trend, trendUp, color = "indigo", delay = "delay-0" }) => {
  const styles = {
    indigo: { bg: "bg-indigo-50", text: "text-indigo-600", gradient: "from-indigo-500 to-indigo-600" },
    green: { bg: "bg-emerald-50", text: "text-emerald-600", gradient: "from-emerald-500 to-emerald-600" },
    blue: { bg: "bg-blue-50", text: "text-blue-600", gradient: "from-blue-500 to-blue-600" },
    orange: { bg: "bg-orange-50", text: "text-orange-600", gradient: "from-orange-500 to-orange-600" },
  };

  const style = styles[color];

  return (
    <div className={`
      group bg-white p-4 sm:p-6 rounded-2xl shadow-sm border border-slate-100 
      animate-enter ${delay} 
      dark:bg-slate-900 dark:border-slate-800 dark:shadow-none 
      hover-3d-card preserve-3d
    `}>
      <div className="flex items-center justify-between mb-3 sm:mb-4 transform translate-z-10 transition-transform duration-300 group-hover:translate-z-4">
        <div className={`p-2.5 sm:p-3 rounded-xl bg-gradient-to-br ${style.gradient} text-white shadow-lg shadow-${color}-500/20 dark:shadow-none group-hover:scale-110 transition-transform`}>
          <Icon size={20} className="sm:w-6 sm:h-6" />
        </div>
        {trend && (
          <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${trendUp ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-400' : 'bg-red-50 text-red-500 dark:bg-red-500/10 dark:text-red-400'}`}>
            {trendUp ? '↑' : '↓'} {trend}
          </div>
        )}
      </div>
      <h3 className="text-slate-400 text-[10px] sm:text-xs font-semibold mb-1 uppercase tracking-wider dark:text-slate-500 transform translate-z-0 group-hover:translate-z-2 transition-transform">{title}</h3>
      <div className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight dark:text-white transform translate-z-0 group-hover:translate-z-6 transition-transform">{value}</div>
    </div>
  );
};

export default StatCard;