'use client'
import {useEffect,useState} from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
export function Calendar(){const[events,setEvents]=useState<any[]>([]);async function load(){const r=await fetch('/api/agenda');if(r.ok){const d=await r.json();setEvents(d.map((e:any)=>({id:e.id,title:e.title,start:e.start_at,end:e.end_at})))} }useEffect(()=>{load()},[]);async function add(info:any){const title=prompt('Titre de la séance / tâche');if(!title)return;await fetch('/api/agenda',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title,start_at:info.startStr,end_at:info.endStr||info.startStr,event_type:'revision'})});load()}return <div className="rounded-2xl border bg-white p-4"><FullCalendar plugins={[dayGridPlugin,timeGridPlugin,interactionPlugin]} initialView="dayGridMonth" selectable select={add} events={events} headerToolbar={{left:'prev,next today',center:'title',right:'dayGridMonth,timeGridWeek,timeGridDay'}} height="auto"/></div>}
