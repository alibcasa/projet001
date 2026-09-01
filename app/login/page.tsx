import Link from 'next/link'
import { login } from './actions'

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const params = await searchParams
  return <main className="mx-auto max-w-md p-8">
    <h1 className="text-3xl font-bold">Connexion</h1>
    <p className="mt-2 text-sm text-zinc-500">Accédez à votre espace RevisionOS.</p>
    {params.error && <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{params.error}</p>}
    <form action={login} className="mt-6 space-y-4">
      <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border p-3" />
      <input name="password" type="password" required placeholder="Mot de passe" className="w-full rounded-xl border p-3" />
      <button className="w-full rounded-xl bg-black px-4 py-3 font-medium text-white">Se connecter</button>
    </form>
    <p className="mt-4 text-sm">Pas de compte ? <Link className="underline" href="/signup">Créer un compte</Link></p>
  </main>
}
