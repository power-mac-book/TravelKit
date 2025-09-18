'use client';

import { useState } from 'react';
import { format, addDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { CalendarData } from '@/types';

interface CalendarViewProps {
  calendarData?: CalendarData[];
  selectedDate?: Date;
  onDateSelect?: (date: Date) => void;
  month: Date;
  onMonthChange: (month: Date) => void;
}

export default function CalendarView({ 
  calendarData = [], 
  selectedDate, 
  onDateSelect, 
  month,
  onMonthChange 
}: CalendarViewProps) {
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const getInterestCount = (date: Date): number => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const data = calendarData.find(item => item.date === dateStr);
    return data?.count || 0;
  };

  const getHeatmapColor = (count: number): string => {
    if (count === 0) return 'bg-gray-100';
    if (count <= 2) return 'bg-primary-100';
    if (count <= 5) return 'bg-primary-200';
    if (count <= 10) return 'bg-primary-400';
    return 'bg-primary-600';
  };

  const getTextColor = (count: number): string => {
    if (count <= 5) return 'text-gray-700';
    return 'text-white';
  };

  const previousMonth = () => {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1));
  };

  const nextMonth = () => {
    onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1));
  };

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">
          Interest Calendar - {format(month, 'MMMM yyyy')}
        </h3>
        <div className="flex items-center space-x-2">
          <button 
            onClick={previousMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronLeft className="w-5 h-5 text-gray-600" />
          </button>
          <button 
            onClick={nextMonth}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ChevronRight className="w-5 h-5 text-gray-600" />
          </button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="grid grid-cols-7 gap-2 mb-4">
        {/* Day Headers */}
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
            {day}
          </div>
        ))}

        {/* Calendar Days */}
        {days.map(day => {
          const count = getInterestCount(day);
          const isSelected = selectedDate && isSameDay(day, selectedDate);
          const isCurrentMonth = isSameMonth(day, month);
          
          return (
            <button
              key={day.toISOString()}
              onClick={() => onDateSelect?.(day)}
              disabled={!isCurrentMonth}
              className={`
                relative h-12 rounded-lg border transition-all duration-200
                ${isCurrentMonth ? 'hover:border-primary-300' : 'opacity-50 cursor-not-allowed'}
                ${isSelected ? 'ring-2 ring-primary-500 border-primary-500' : 'border-gray-200'}
                ${getHeatmapColor(count)}
                ${getTextColor(count)}
                hover:scale-105
              `}
            >
              <div className="text-sm font-medium">
                {format(day, 'd')}
              </div>
              {count > 0 && (
                <div className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {count > 99 ? '99+' : count}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center space-x-4">
          <span className="text-gray-600">Interest Level:</span>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-gray-100 rounded"></div>
            <span className="text-gray-500">None</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary-100 rounded"></div>
            <span className="text-gray-500">Low</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary-400 rounded"></div>
            <span className="text-gray-500">High</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-primary-600 rounded"></div>
            <span className="text-gray-500">Very High</span>
          </div>
        </div>
        
        {selectedDate && (
          <div className="text-primary-600 font-medium">
            {format(selectedDate, 'MMM d')} - {getInterestCount(selectedDate)} interested
          </div>
        )}
      </div>
    </div>
  );
}