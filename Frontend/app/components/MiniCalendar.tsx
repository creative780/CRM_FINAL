'use client';
import React, { useState } from 'react';
import {
  format,
  addMonths,
  subMonths,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  addDays,
  isSameDay,
  isSameMonth,
} from 'date-fns';

const MiniCalendar = () => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [events, setEvents] = useState<Record<string, string[]>>({
    '2025-07-30': ['Order #1024 Due', 'Team A Shift Start'],
    '2025-08-01': ['New Campaign Launch'],
    '2025-08-04': ['Delivery: Order #1030'],
  });

  const [showModal, setShowModal] = useState(false);
  const [newEvent, setNewEvent] = useState('');

  const handleAddEvent = () => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    const updated = { ...events };
    if (!updated[key]) updated[key] = [];
    updated[key].push(newEvent);
    setEvents(updated);
    setNewEvent('');
    setShowModal(false);
  };

  const renderHeader = () => (
    <div className="flex justify-between items-center mb-4">
      <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="text-gray-500 hover:text-black text-lg">
        ◀
      </button>
      <h2 className="text-lg font-semibold text-gray-800">{format(currentMonth, 'MMMM yyyy')}</h2>
      <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="text-gray-500 hover:text-black text-lg">
        ▶
      </button>
    </div>
  );

  const renderDays = () => {
    const days = [];
    const start = startOfWeek(currentMonth);
    for (let i = 0; i < 7; i++) {
      days.push(
        <div key={i} className="text-xs text-center text-gray-400 font-semibold">
          {format(addDays(start, i), 'EEE')}
        </div>
      );
    }
    return <div className="grid grid-cols-7 mb-2">{days}</div>;
  };

  const renderCells = () => {
    const monthStart = startOfMonth(currentMonth);
    const startDate = startOfWeek(monthStart);
    let day = startDate;
    const rows = [];

    for (let row = 0; row < 6; row++) {
      const days = [];
      for (let col = 0; col < 7; col++) {
        const formatted = format(day, 'yyyy-MM-dd');
        const isToday = isSameDay(day, new Date());
        const isSelected = isSameDay(day, selectedDate);
        const isCurrentMonth = isSameMonth(day, currentMonth);
        const hasEvents = events[formatted];

        days.push(
          <div
            key={col}
            onClick={() => setSelectedDate(day)}
            className={`cursor-pointer text-sm p-2 text-center rounded-md transition
              ${
                !isCurrentMonth
                  ? 'text-gray-300'
                  : isSelected
                  ? 'bg-indigo-600 text-white'
                  : 'text-gray-700 hover:bg-gray-100'
              }`}
          >
            <div className="relative">
              {format(day, 'd')}
              {hasEvents && (
                <span className="w-1.5 h-1.5 bg-indigo-500 rounded-full absolute bottom-0 left-1/2 -translate-x-1/2 mt-1"></span>
              )}
              {isToday && (
                <span className="absolute top-0 right-0 w-1.5 h-1.5 bg-red-500 rounded-full"></span>
              )}
            </div>
          </div>
        );
        day = addDays(day, 1);
      }
      rows.push(<div key={row} className="grid grid-cols-7 gap-1">{days}</div>);
    }

    return <div className="space-y-1">{rows}</div>;
  };

  const renderEvents = () => {
    const key = format(selectedDate, 'yyyy-MM-dd');
    const eventList = events[key] || [];
    return (
      <div className="mt-4">
        <div className="flex justify-between items-center mb-2">
          <p className="text-sm font-semibold text-gray-700">
            Events on {format(selectedDate, 'MMM d')}:
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="text-xs px-2 py-1 bg-indigo-500 text-white rounded-md hover:bg-indigo-600"
          >
            + Add Event
          </button>
        </div>
        {eventList.length === 0 ? (
          <p className="text-sm text-gray-400">No events.</p>
        ) : (
          <ul className="space-y-1 text-sm text-gray-600">
            {eventList.map((e, i) => (
              <li key={i} className="bg-gray-100 px-3 py-1 rounded-md">{e}</li>
            ))}
          </ul>
        )}
      </div>
    );
  };

  const renderModal = () => {
  if (!showModal) return null;
  return (
    <div className="fixed inset-0 backdrop-blur-md flex items-center justify-center z-50">
      <div className="bg-white/90 backdrop-blur-md p-6 rounded-2xl w-80 shadow-xl border border-gray-200">
        <h3 className="text-lg font-semibold mb-4 text-gray-700">Add Event</h3>
        <input
          type="text"
          value={newEvent}
          onChange={(e) => setNewEvent(e.target.value)}
          placeholder="Event title"
          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 text-black"
        />
        <div className="flex justify-end space-x-2">
          <button
            onClick={() => setShowModal(false)}
            className="text-sm text-gray-600 hover:underline"
          >
            Cancel
          </button>
          <button
            onClick={handleAddEvent}
            className="text-sm bg-indigo-500 text-white px-4 py-2 rounded-md hover:bg-indigo-600"
            disabled={!newEvent.trim()}
          >
            Add
          </button>
        </div>
      </div>
    </div>
  );
};


  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-200 w-full max-w-md">
      {renderHeader()}
      {renderDays()}
      {renderCells()}
      {renderEvents()}
      {renderModal()}
    </div>
  );
};

export default MiniCalendar;
