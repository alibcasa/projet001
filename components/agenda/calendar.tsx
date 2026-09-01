"use client";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";

export default function Calendar() {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
        initialView="dayGridMonth"
        editable
        selectable
        events={[
          { title: "Révision Douane", start: new Date().toISOString().slice(0,10) },
          { title: "QCM droit pénal", start: new Date(Date.now()+86400000).toISOString().slice(0,10) }
        ]}
      />
    </div>
  );
}
