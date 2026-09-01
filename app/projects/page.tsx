import{OpenProjectClient}from'@/components/projects/openproject-client'
export default function Page(){return <div><h1 className="text-3xl font-bold">Projets</h1><p className="mt-2 text-zinc-500">Synchronisation OpenProject API v3.</p><div className="mt-6"><OpenProjectClient/></div></div>}
