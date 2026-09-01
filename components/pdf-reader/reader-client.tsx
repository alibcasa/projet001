'use client'
import { useState } from 'react'
import { PdfViewer } from './pdf-viewer'
import { KeynotesPanel } from '@/components/keynotes/keynotes-panel'
export function ReaderClient({documentId,url,title,totalPages,initialPage}:{documentId:string;url:string;title:string;totalPages:number;initialPage:number}){const [page,setPage]=useState(initialPage);return <div><h1 className="mb-4 text-xl font-semibold">{title}</h1><div className="grid gap-4 xl:grid-cols-[1fr_320px]"><PdfViewer url={url} documentId={documentId} totalPages={totalPages} initialPage={initialPage} onPageChange={setPage}/><KeynotesPanel documentId={documentId} page={page}/></div></div>}
