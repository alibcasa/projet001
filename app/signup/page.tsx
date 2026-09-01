import Link from 'next/link'
import { signup } from './actions'

export default async function SignupPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return <main className="mx-auto max-w-md p-8">
    <h1 className="text-3xl font-bold">Créer un compte</h1>
    {params.error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{params.error}</p>}
    <form action={signup} className="mt-6 space-y-4">
      <input name="full_name" required placeholder="Nom complet" className="w-full rounded-xl border p-3" />
      <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border p-3" />
      <input name="password" type="password" minLength={8} required placeholder="Mot de passe" className="w-full rounded-xl border p-3" />
      <button className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white">Créer le compte</button>
    </form>
    <p className="mt-4 text-sm"><Link className="underline" href="/login">Retour à la connexion</Link></p>
  </main>
}
