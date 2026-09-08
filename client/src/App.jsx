import { useEffect, useState } from 'react'
import { Activity, ArrowUpRight, CalendarDays, Check, CircleDollarSign, Menu, Plus, Target, X } from 'lucide-react'
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'

const spending = [
  { day: '01', amount: 42 }, { day: '05', amount: 78 }, { day: '09', amount: 55 },
  { day: '13', amount: 112 }, { day: '17', amount: 68 }, { day: '21', amount: 94 },
  { day: '25', amount: 76 }, { day: '29', amount: 124 },
]
const categories = [
  { name: 'Food & dining', amount: '$284.20', percent: 42, color: '#e76f51' },
  { name: 'Transport', amount: '$146.80', percent: 22, color: '#457b9d' },
  { name: 'Home', amount: '$122.40', percent: 18, color: '#2a9d8f' },
  { name: 'Wellness', amount: '$78.50', percent: 12, color: '#e9c46a' },
]

function App() {
  const [apiStatus, setApiStatus] = useState('checking')
  const [menuOpen, setMenuOpen] = useState(false)
  const [checked, setChecked] = useState([true, false, true])

  useEffect(() => {
    fetch('http://localhost:4000/api/health').then((response) => setApiStatus(response.ok ? 'online' : 'offline')).catch(() => setApiStatus('offline'))
  }, [])

  const toggleHabit = (index) => setChecked((current) => current.map((value, itemIndex) => itemIndex === index ? !value : value))

  return (
    <div className="app-shell">
      <aside className={menuOpen ? 'sidebar sidebar-open' : 'sidebar'}>
        <div className="brand"><span className="brand-mark"><Activity size={18} /></span><span>daymark</span></div>
        <div className="workspace-label">Workspace</div>
        <nav><a className="nav-item active" href="#overview"><span>◈</span> Overview</a><a className="nav-item" href="#habits"><Target size={17} /> Habits</a><a className="nav-item" href="#expenses"><CircleDollarSign size={17} /> Expenses</a></nav>
        <div className="sidebar-footer"><div className="avatar">JD</div><div><strong>Jordan Davis</strong><small>Personal space</small></div><button className="icon-button" aria-label="Open menu"><Menu size={17} /></button></div>
      </aside>

      <main className="main-content">
        <header className="topbar"><button className="mobile-menu" onClick={() => setMenuOpen(!menuOpen)} aria-label="Toggle navigation"><Menu /></button><div><p className="eyebrow">Tuesday, September 8, 2026</p><h1>Good morning, Jordan.</h1></div><div className="header-actions"><span className={apiStatus === 'online' ? 'status-pill' : 'status-pill muted'}><span className="status-dot" /> {apiStatus === 'checking' ? 'Connecting' : apiStatus === 'online' ? 'Synced' : 'Demo mode'}</span><button className="primary-button"><Plus size={17} /> Add entry</button></div></header>

        <section className="welcome-strip"><div><span className="section-kicker">Your rhythm, in focus</span><h2>A little consistency goes a long way.</h2><p>Three habits checked this week. Your spending is down 8% from last month.</p></div><div className="strip-metric"><strong>74%</strong><span>weekly momentum</span></div></section>

        <section className="summary-grid" id="overview"><article className="summary-card accent-coral"><div className="card-label"><span>Total spent</span><CircleDollarSign size={18} /></div><strong>$631.90</strong><small><span className="positive">↓ 8.2%</span> vs last month</small></article><article className="summary-card"><div className="card-label"><span>Top category</span><span className="mini-dot coral" /></div><strong>Food & dining</strong><small>$284.20 this month</small></article><article className="summary-card"><div className="card-label"><span>Active streaks</span><Activity size={18} /></div><strong>12 days</strong><small><span className="positive">↑ 3 days</span> personal best</small></article><article className="summary-card"><div className="card-label"><span>Completion rate</span><Check size={18} /></div><strong>86%</strong><small>last 30 days</small></article></section>

        <section className="content-grid"><article className="panel trend-panel"><div className="panel-heading"><div><span className="section-kicker">Spending trend</span><h3>Where your money went</h3></div><button className="date-button"><CalendarDays size={15} /> This month</button></div><div className="chart-wrap"><ResponsiveContainer width="100%" height="100%"><AreaChart data={spending} margin={{ top: 10, right: 4, left: -20, bottom: 0 }}><defs><linearGradient id="spendFill" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#e76f51" stopOpacity={0.25} /><stop offset="95%" stopColor="#e76f51" stopOpacity={0} /></linearGradient></defs><CartesianGrid vertical={false} stroke="#ebe6de" /><XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fill: '#918b82', fontSize: 11 }} /><YAxis axisLine={false} tickLine={false} tick={{ fill: '#918b82', fontSize: 11 }} tickFormatter={(value) => `$${value}`} /><Tooltip formatter={(value) => [`$${value}`, 'Spent']} contentStyle={{ border: '0', borderRadius: 8, boxShadow: '0 8px 24px #20322c18' }} /><Area type="monotone" dataKey="amount" stroke="#e76f51" strokeWidth={3} fill="url(#spendFill)" /></AreaChart></ResponsiveContainer></div></article><article className="panel category-panel"><div className="panel-heading"><div><span className="section-kicker">Spending mix</span><h3>By category</h3></div><button className="text-button">View all <ArrowUpRight size={14} /></button></div><div className="category-list">{categories.map((category) => <div className="category-row" key={category.name}><span className="category-swatch" style={{ background: category.color }} /><div className="category-info"><div><strong>{category.name}</strong><span>{category.amount}</span></div><div className="progress-track"><span style={{ width: `${category.percent}%`, background: category.color }} /></div></div></div>)}</div></article></section>

        <section className="content-grid lower-grid"><article className="panel habits-panel" id="habits"><div className="panel-heading"><div><span className="section-kicker">Today</span><h3>Keep the chain going</h3></div><button className="text-button">Manage <ArrowUpRight size={14} /></button></div><div className="habit-list">{['Morning movement', 'Read 20 pages', 'No spend day'].map((habit, index) => <button className={checked[index] ? 'habit-row completed' : 'habit-row'} key={habit} onClick={() => toggleHabit(index)}><span className="habit-check">{checked[index] ? <Check size={15} /> : null}</span><span><strong>{habit}</strong><small>{index === 0 ? '12 day streak' : index === 1 ? '4 day streak' : '2 day streak'}</small></span><span className="habit-date">Today</span></button>)}</div></article><article className="panel insight-panel" id="expenses"><div className="insight-icon"><Activity size={20} /></div><span className="section-kicker">Small insight</span><h3>Your habits are paying off.</h3><p>You completed 18% more check-ins this month, while keeping your average daily spend under $25.</p><button className="outline-button">See your progress <ArrowUpRight size={15} /></button></article></section>
      </main>
    </div>
  )
}

export default App