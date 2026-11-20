// People and groups who recently messaged the bot, so a couple's chat can be picked by name instead of
// looked up by number. Telegram keeps these for about a day, so the couple messages the bot just before.
export default defineEventHandler(async (event) => {
  await requireAdmin(event)
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw createError({ statusCode: 503, statusMessage: 'TELEGRAM_BOT_TOKEN is not set in .env' })
  const [me, updates] = await Promise.all([
    $fetch<{ result: { username: string } }>(`https://api.telegram.org/bot${token}/getMe`),
    $fetch<{ result: Array<Record<string, any>> }>(`https://api.telegram.org/bot${token}/getUpdates`),
  ])
  const chats = new Map<string, { id: string, name: string }>()
  // Newest first, so each chat shows under its latest name
  for (const u of updates.result.reverse()) {
    const chat = (u.message ?? u.my_chat_member ?? u.edited_message)?.chat
    if (!chat || chats.has(String(chat.id))) continue
    const name = chat.title ?? [chat.first_name, chat.last_name].filter(Boolean).join(' ')
    chats.set(String(chat.id), { id: String(chat.id), name: chat.username ? `${name} (@${chat.username})` : name })
  }
  return { bot: me.result.username, chats: [...chats.values()] }
})
