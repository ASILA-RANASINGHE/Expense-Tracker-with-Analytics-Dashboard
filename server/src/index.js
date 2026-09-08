import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()
const app = express()
const port = process.env.PORT || 4000
const jwtSecret = process.env.JWT_SECRET || 'development-secret'

app.use(cors({ origin: process.env.CLIENT_URL || 'http://localhost:5173' }))
app.use(express.json())

const tokenFor = (user) => jwt.sign({ userId: user.id }, jwtSecret, { expiresIn: '24h' })
const safeUser = ({ id, email, name }) => ({ id, email, name })
const auth = (req, res, next) => {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) return res.status(401).json({ error: 'Authentication required' })
  try {
    req.userId = jwt.verify(header.slice(7), jwtSecret).userId
    next()
  } catch { res.status(401).json({ error: 'Invalid or expired token' }) }
}
const dateValue = (value) => new Date(`${value || new Date().toISOString().slice(0, 10)}T00:00:00.000Z`)
const startOfMonth = () => { const date = new Date(); return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1)) }

app.get('/api/health', (_req, res) => res.json({ ok: true }))

app.post('/api/auth/register', async (req, res) => {
  try {
    const { email, password, name } = req.body
    if (!email || !password || password.length < 8) return res.status(400).json({ error: 'Email and an 8-character password are required' })
    const user = await prisma.user.create({ data: { email: email.toLowerCase(), name, passwordHash: await bcrypt.hash(password, 12) } })
    await prisma.category.createMany({ data: ['Food', 'Transport', 'Housing', 'Entertainment', 'Health', 'Other'].map((categoryName, index) => ({ userId: user.id, name: categoryName, color: ['#E76F51', '#457B9D', '#264653', '#E9C46A', '#2A9D8F', '#6C757D'][index] })) })
    res.status(201).json({ token: tokenFor(user), user: safeUser(user) })
  } catch (error) { res.status(error.code === 'P2002' ? 409 : 500).json({ error: error.code === 'P2002' ? 'Email already registered' : 'Could not create account' }) }
})

app.post('/api/auth/login', async (req, res) => {
  const user = await prisma.user.findUnique({ where: { email: req.body.email?.toLowerCase() } })
  if (!user || !(await bcrypt.compare(req.body.password || '', user.passwordHash))) return res.status(401).json({ error: 'Invalid email or password' })
  res.json({ token: tokenFor(user), user: safeUser(user) })
})
app.get('/api/auth/me', auth, async (req, res) => res.json({ user: safeUser(await prisma.user.findUniqueOrThrow({ where: { id: req.userId } })) }))

app.get('/api/habits', auth, async (req, res) => res.json(await prisma.habit.findMany({ where: { userId: req.userId, archived: false }, include: { logs: { orderBy: { date: 'desc' }, take: 100 } }, orderBy: { createdAt: 'asc' } })))
app.post('/api/habits', auth, async (req, res) => res.status(201).json(await prisma.habit.create({ data: { userId: req.userId, name: req.body.name, frequency: req.body.frequency || 'daily', color: req.body.color || '#F4A261' } })))
app.put('/api/habits/:id', auth, async (req, res) => res.json(await prisma.habit.updateMany({ where: { id: Number(req.params.id), userId: req.userId }, data: { name: req.body.name, frequency: req.body.frequency, color: req.body.color } })))
app.delete('/api/habits/:id', auth, async (req, res) => res.json(await prisma.habit.updateMany({ where: { id: Number(req.params.id), userId: req.userId }, data: { archived: true } })))
app.post('/api/habits/:id/logs', auth, async (req, res) => {
  const habitId = Number(req.params.id); const date = dateValue(req.body.date)
  const habit = await prisma.habit.findFirst({ where: { id: habitId, userId: req.userId } }); if (!habit) return res.status(404).json({ error: 'Habit not found' })
  const existing = await prisma.habitLog.findUnique({ where: { habitId_date: { habitId, date } } })
  res.json(await prisma.habitLog.upsert({ where: { habitId_date: { habitId, date } }, update: { completed: existing ? !existing.completed : true }, create: { habitId, date, completed: true } }))
})
app.get('/api/habits/:id/logs', auth, async (req, res) => res.json(await prisma.habitLog.findMany({ where: { habitId: Number(req.params.id), habit: { userId: req.userId }, date: { gte: dateValue(req.query.from), lte: dateValue(req.query.to || new Date().toISOString().slice(0, 10)) } }, orderBy: { date: 'asc' } })))

app.get('/api/categories', auth, async (req, res) => res.json(await prisma.category.findMany({ where: { userId: req.userId }, orderBy: { name: 'asc' } })))
app.post('/api/categories', auth, async (req, res) => res.status(201).json(await prisma.category.create({ data: { userId: req.userId, name: req.body.name, color: req.body.color || '#2A9D8F' } })))
app.put('/api/categories/:id', auth, async (req, res) => res.json(await prisma.category.update({ where: { id: Number(req.params.id), userId: req.userId }, data: { name: req.body.name, color: req.body.color } })))
app.delete('/api/categories/:id', auth, async (req, res) => res.json(await prisma.category.delete({ where: { id: Number(req.params.id), userId: req.userId } })))

app.get('/api/expenses', auth, async (req, res) => res.json(await prisma.expense.findMany({ where: { userId: req.userId, ...(req.query.from || req.query.to ? { date: { ...(req.query.from && { gte: dateValue(req.query.from) }), ...(req.query.to && { lte: dateValue(req.query.to) }) } } : {}), ...(req.query.category_id ? { categoryId: Number(req.query.category_id) } : {}) }, include: { category: true }, orderBy: { date: 'desc' } })))
app.post('/api/expenses', auth, async (req, res) => res.status(201).json(await prisma.expense.create({ data: { userId: req.userId, categoryId: req.body.categoryId ? Number(req.body.categoryId) : null, amount: Number(req.body.amount), note: req.body.note, date: dateValue(req.body.date), isRecurring: Boolean(req.body.isRecurring), recurrenceRule: req.body.recurrenceRule }, include: { category: true } })))
app.put('/api/expenses/:id', auth, async (req, res) => res.json(await prisma.expense.update({ where: { id: Number(req.params.id), userId: req.userId }, data: { categoryId: req.body.categoryId ? Number(req.body.categoryId) : null, amount: Number(req.body.amount), note: req.body.note, date: dateValue(req.body.date) }, include: { category: true } })))
app.delete('/api/expenses/:id', auth, async (req, res) => res.json(await prisma.expense.delete({ where: { id: Number(req.params.id), userId: req.userId } })))

app.get('/api/analytics/spending-by-category', auth, async (req, res) => {
  const month = req.query.month ? new Date(`${req.query.month}-01T00:00:00.000Z`) : startOfMonth(); const end = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + 1, 1))
  const expenses = await prisma.expense.findMany({ where: { userId: req.userId, date: { gte: month, lt: end } }, include: { category: true } }); const grouped = Object.values(expenses.reduce((all, expense) => { const name = expense.category?.name || 'Uncategorized'; all[name] ||= { name, value: 0, color: expense.category?.color || '#6C757D' }; all[name].value += Number(expense.amount); return all }, {})); res.json(grouped)
})
app.get('/api/analytics/spending-trend', auth, async (req, res) => { const expenses = await prisma.expense.findMany({ where: { userId: req.userId, date: { gte: dateValue(req.query.from || new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10)), lte: dateValue(req.query.to || new Date().toISOString().slice(0, 10)) } }, orderBy: { date: 'asc' } }); const grouped = expenses.reduce((all, expense) => { const key = expense.date.toISOString().slice(0, 10); all[key] = (all[key] || 0) + Number(expense.amount); return all }, {}); res.json(Object.entries(grouped).map(([date, amount]) => ({ date, amount }))) })
app.get('/api/analytics/habit-completion', auth, async (req, res) => { const days = Number(req.query.range || 7); const from = new Date(Date.now() - (days - 1) * 86400000); const habits = await prisma.habit.findMany({ where: { userId: req.userId, archived: false }, include: { logs: { where: { date: { gte: from } } } } }); res.json({ completion: habits.length ? Math.round(habits.reduce((sum, habit) => sum + habit.logs.filter((log) => log.completed).length, 0) / (habits.length * days) * 100) : 0, habits: habits.map((habit) => ({ name: habit.name, completed: habit.logs.filter((log) => log.completed).length, color: habit.color })) }) })
app.get('/api/analytics/streaks', auth, async (req, res) => { const habits = await prisma.habit.findMany({ where: { userId: req.userId, archived: false }, include: { logs: { where: { completed: true }, orderBy: { date: 'desc' } } } }); res.json(habits.map((habit) => { let streak = 0; let cursor = new Date(); for (const log of habit.logs) { if (log.date.toISOString().slice(0, 10) !== cursor.toISOString().slice(0, 10)) break; streak++; cursor = new Date(cursor.getTime() - 86400000) } return { id: habit.id, name: habit.name, current: streak, color: habit.color } }).sort((a, b) => b.current - a.current)) })
app.get('/api/analytics/summary', auth, async (req, res) => { const monthStart = startOfMonth(); const [expenses, habits] = await Promise.all([prisma.expense.findMany({ where: { userId: req.userId, date: { gte: monthStart } }, include: { category: true } }), prisma.habit.findMany({ where: { userId: req.userId, archived: false }, include: { logs: { where: { date: { gte: new Date(Date.now() - 6 * 86400000) } } } } })]); const byCategory = expenses.reduce((all, item) => { const key = item.category?.name || 'Other'; all[key] = (all[key] || 0) + Number(item.amount); return all }, {}); const completion = habits.length ? Math.round(habits.reduce((sum, habit) => sum + habit.logs.filter((log) => log.completed).length, 0) / (habits.length * 7) * 100) : 0; res.json({ totalSpent: expenses.reduce((sum, item) => sum + Number(item.amount), 0), topCategory: Object.entries(byCategory).sort((a, b) => b[1] - a[1])[0]?.[0] || 'No spend yet', activeStreaks: habits.filter((habit) => habit.logs.some((log) => log.completed)).length, completion }) })

app.listen(port, () => console.log(`API listening on http://localhost:${port}`))