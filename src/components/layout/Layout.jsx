import Sidebar from './Sidebar'
import TopBar from './TopBar'

export default function Layout({ children, title }) {
  return (
    <div className="flex min-h-screen bg-slate-100">
      <Sidebar />
      <div className="flex-1 ml-56 flex flex-col min-h-screen">
        <TopBar title={title} />
        <main className="flex-1 p-6 fade-in">
          {children}
        </main>
      </div>
    </div>
  )
}
