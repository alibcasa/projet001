import{UsersClient}from'@/components/admin/users-client'
export default function AdminPage(){return <div><h1 className="text-3xl font-bold">Administration</h1><p className="mt-2 text-zinc-500">Utilisateurs, rôles, accès et supervision.</p><div className="mt-6"><UsersClient/></div></div>}
