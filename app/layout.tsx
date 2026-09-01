import "./globals.css";
import Sidebar from "@/components/sidebar";
import Topbar from "@/components/topbar";
export const metadata={title:"RevisionOS",description:"Révision, bibliothèque PDF, QCM, agenda et gestion documentaire"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="fr"><body><Sidebar/><div className="ml-64 min-h-screen"><Topbar/><main className="p-6">{children}</main></div></body></html>}
