import { SystemStatus } from '@/components/system-status'

export default function Settings(){
  return <div className="space-y-6">
    <div><h1 className="text-3xl font-bold">Paramètres</h1><p className="mt-2 text-zinc-500">Configuration et état réel des services RevisionOS.</p></div>
    <SystemStatus/>
    <div className="rounded-2xl border bg-white p-5"><h2 className="font-semibold">Configuration serveur</h2><p className="mt-2 text-sm text-zinc-600">Les clés sensibles restent dans <code>.env.local</code> sur le serveur et ne sont jamais exposées dans le navigateur.</p><div className="mt-4 grid gap-2 text-sm"><code>AI_PROVIDER=ollama</code><code>OLLAMA_BASE_URL=http://localhost:11434</code><code>OLLAMA_MODEL=qwen3:4b</code><code>NEXT_PUBLIC_SUPABASE_URL=...</code><code>NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=...</code></div></div>
  </div>
}
