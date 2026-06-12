import Layout from '../components/layout/Layout'
import { Card } from '../components/ui/index'
import { Construction } from 'lucide-react'

function Placeholder({ title }) {
  return (
    <Layout title={title}>
      <Card className="flex flex-col items-center justify-center py-24">
        <Construction size={48} className="text-slate-300 mb-4" />
        <h3 className="text-lg font-bold text-slate-600">{title}</h3>
        <p className="text-slate-400 text-sm mt-1">This section is coming soon</p>
      </Card>
    </Layout>
  )
}

export function Inventory()  { return <Placeholder title="Inventory" /> }
export function FlashDeals() { return <Placeholder title="Flash Deals" /> }
export function Banners()    { return <Placeholder title="Banners" /> }
export function Payments()   { return <Placeholder title="Payments" /> }
export function Shipping()   { return <Placeholder title="Shipping" /> }
export function AdminUsers() { return <Placeholder title="Users" /> }
