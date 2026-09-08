import 'dotenv/config'
import bcrypt from 'bcryptjs'
import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()
const run = async () => {
  const passwordHash = await bcrypt.hash('password123', 12)
  const user = await prisma.user.upsert({ where: { email: 'demo@daymark.app' }, update: {}, create: { email: 'demo@daymark.app', name: 'Demo account', passwordHash } })
  const names = ['Food', 'Transport', 'Housing', 'Entertainment', 'Health', 'Other']; const categories = []
  for (const [index, name] of names.entries()) categories.push(await prisma.category.upsert({ where: { userId_name: { userId: user.id, name } }, update: {}, create: { userId: user.id, name, color: ['#E76F51', '#457B9D', '#264653', '#E9C46A', '#2A9D8F', '#6C757D'][index] } }))
  const habits = await Promise.all(['Morning movement', 'Read 20 pages', 'No spend day'].map((name, index) => prisma.habit.create({ data: { userId: user.id, name, color: ['#E76F51', '#2A9D8F', '#457B9D'][index] } })))
  for (let day = 0; day < 30; day++) { const date = new Date(Date.now() - day * 86400000); for (const habit of habits) if (Math.random() > 0.25) await prisma.habitLog.create({ data: { habitId: habit.id, date, completed: true } }).catch(() => {}) }
  for (let day = 0; day < 30; day++) await prisma.expense.create({ data: { userId: user.id, categoryId: categories[day % categories.length].id, amount: (12 + (day * 7) % 64).toFixed(2), note: ['Lunch', 'Commute', 'Groceries', 'Coffee'][day % 4], date: new Date(Date.now() - day * 86400000) } })
}
run().finally(() => prisma.$disconnect())