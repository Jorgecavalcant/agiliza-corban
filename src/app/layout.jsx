import './globals.css'

export const metadata = {
  title: 'Agiliza Corban',
  description: 'Sistema de Caixa Offline para Correspondente Bancário',
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body className="bg-slate-900 text-white antialiased">
        {children}
      </body>
    </html>
  )
}
