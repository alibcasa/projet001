'use client'

import { useEffect, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'

export function Calendar(){
  const [events,setEvents]=useState<any[]>([])
  const [message,setMessage]=useState('')

  async function load(){
    const r=await fetch('/api/agenda')
    if(r.ok){const d=await r.json();setEvents(d.map((e:any)=>({id:e.id,title:e.title,start:e.start_at,end:e.end_at,extendedProps:{event_type:e.event_type}})))}
  }
  useEffect(()=>{load()},[])

  async function add(info:any){
    const title=prompt('Titre de la séance / tâche')?.trim()
    if(!title)return
    const start=info.startStr
    const end=info.endStr||info.startStr
    const r=await fetch('/api/agenda',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({title,start_at:start,end_at:end,event_type:'revision'})})
    if(!r.ok){const d=await r.json().catch(()=>({}));setMessage(d.error||'Création impossible')}
    else {setMessage('Séance créée.');await load()}
  }

  async function move(info:any){
    const r=await fetch(`/api/agenda/${info.event.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({start_at:info.event.start?.toISOString(),end_at:(info.event.end||info.event.start)?.toISOString()})})
    if(!r.ok){info.revert();const d=await r.json().catch(()=>({}));setMessage(d.error||'Déplacement impossible')}
    else setMessage('Planning mis à jour.')
  }

  async function open(info:any){
    const action=prompt('Modifier le titre, ou écrivez SUPPRIMER pour effacer cet événement :',info.event.title)
    if(action===null)return
    if(action.trim().toUpperCase()==='SUPPRIMER'){
      if(!confirm(`Supprimer « ${info.event.title} » ?`))return
      const r=await fetch(`/api/agenda/${info.event.id}`,{method:'DELETE'})
      if(r.ok){setMessage('Événement supprimé.');await load()}else setMessage('Suppression impossible')
      return
    }
    const title=action.trim()
    if(!title)return
    const r=await fetch(`/api/agenda/${info.event.id}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({title})})
    if(r.ok){setMessage('Événement modifié.');await load()}else setMessage('Modification impossible')
  }

  return <div className="rounded-2xl border bg-white p-4 shadow-sm">
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2"><div><h2 className="font-semibold">Agenda de révision</h2><p className="text-xs text-zinc-500">Sélectionnez une plage pour créer · glissez pour déplacer · cliquez pour modifier ou supprimer.</p></div>{message&&<span className="text-xs text-zinc-500">{message}</span>}</div>
    <FullCalendar plugins={[dayGridPlugin,timeGridPlugin,interactionPlugin]} initialView="dayGridMonth" selectable editable select={add} eventDrop={move} eventResize={move} eventClick={open} events={events} headerToolbar={{left:'prev,next today',center:'title',right:'dayGridMonth,timeGridWeek,timeGridDay'}} height="auto"/>
  </div>
}
