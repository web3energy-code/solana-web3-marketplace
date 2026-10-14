import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react'
import { useWallet } from '@solana/wallet-adapter-react'
import { WalletMultiButton } from '@solana/wallet-adapter-react-ui'
import {
  ArrowLeft,
  Check,
  CheckCheck,
  Clock,
  MessageCircle,
  Send,
} from 'lucide-react'

const API = 'https://solana-web3-marketplace-3et8.vercel.app'
const SESSION_KEY = 'solmart_chat_session'
const INBOX_POLL_MS = 8000
const CHAT_POLL_MS = 2500
const UNREAD_POLL_MS = 12000
const REFRESH_EVENT = 'solmart-chat-refresh'

interface Session {
  token: string
  walletAddress: string
  expiresAt: number
}

export interface ConversationItem {
  id: string
  productId: string
  product: {
    id: string
    name: string
    price: number
    currency: string
    image: string | null
  } | null
  other: {
    wallet: string
    name: string | null
    username: string | null
    image: string | null
  }
  lastMessage: {
    body: string
    senderWallet: string
    createdAt: string
    readAt: string | null
  } | null
  unread: number
  updatedAt: string
}

interface Msg {
  id: string
  conversation_id: string
  sender_wallet: string
  body: string
  created_at: string
  read_at?: string | null
  pending?: boolean
  failed?: boolean
}

interface Props {
  startProductId: string | null
  onStartHandled: () => void
  onOpenProduct?: (productId: string) => void
}

class SessionExpiredError extends Error {}

// ---------------------------------------------------------------------------
// Session + API helpers
// ---------------------------------------------------------------------------

function loadSession(wallet: string): Session | null {
  try {
    const raw = window.localStorage.getItem(SESSION_KEY)

    if (!raw) return null

    const session = JSON.parse(raw) as Session

    if (
      !session.token ||
      session.walletAddress !== wallet ||
      typeof session.expiresAt !== 'number' ||
      session.expiresAt < Date.now() + 60_000
    ) {
      return null
    }

    return session
  } catch {
    return null
  }
}

function saveSession(session: Session) {
  try {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(session))
  } catch {
    // Storage can be blocked in some in-app browsers; the session then lasts
    // until the page closes.
  }
}

function clearSession() {
  try {
    window.localStorage.removeItem(SESSION_KEY)
  } catch {
    // Nothing to clear.
  }
}

async function createSession(wallet: string): Promise<Session> {
  const response = await fetch(`${API}/messages/session`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ walletAddress: wallet }),
  })

  const result = await response.json()

  if (!response.ok || !result.success) {
    throw new Error(result.error || 'Could not start messaging.')
  }

  return {
    token: result.token,
    walletAddress: wallet,
    expiresAt: new Date(result.expiresAt).getTime(),
  }
}

async function chatRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const headers: Record<string, string> = { Authorization: `Bearer ${token}` }

  if (init.body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(`${API}/messages${path}`, { ...init, headers })

  let data: any = {}

  try {
    data = await response.json()
  } catch {
    // Not JSON; handled below.
  }

  if (response.status === 401) {
    throw new SessionExpiredError(data.error || 'Please sign in again.')
  }

  if (!response.ok || data.success === false) {
    throw new Error(data.error || 'Something went wrong. Please try again.')
  }

  return data as T
}

function friendlyError(error: unknown): string {
  if (
    error instanceof Error &&
    /reject|declined|cancelled by user|denied/i.test(error.message)
  ) {
    return 'You cancelled the wallet signature request.'
  }

  return error instanceof Error ? error.message : 'Something went wrong.'
}

// Unread count for the badge on the Messages tab.
export function useChatUnread(wallet: string): number {
  const [unread, setUnread] = useState(0)

  useEffect(() => {
    if (!wallet) {
      setUnread(0)
      return
    }

    let stopped = false
    let running = false
    let timer: number | undefined

    async function check() {
      if (running) return

      running = true

      const session = loadSession(wallet)

      if (!session) {
        setUnread(0)
      } else if (document.visibilityState === 'visible') {
        try {
          const result = await chatRequest<{ unread: number }>(
            '/unread',
            session.token,
          )

          if (!stopped) setUnread(result.unread)
        } catch (error) {
          if (error instanceof SessionExpiredError) clearSession()
        }
      }

      running = false

      if (!stopped) {
        timer = window.setTimeout(check, UNREAD_POLL_MS)
      }
    }

    function refresh() {
      window.clearTimeout(timer)
      void check()
    }

    void check()
    window.addEventListener(REFRESH_EVENT, refresh)

    return () => {
      stopped = true
      window.clearTimeout(timer)
      window.removeEventListener(REFRESH_EVENT, refresh)
    }
  }, [wallet])

  return unread
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function shortWallet(wallet: string) {
  return wallet.length > 10 ? `${wallet.slice(0, 4)}…${wallet.slice(-4)}` : wallet
}

function displayName(other: ConversationItem['other']) {
  return (
    other.name ||
    (other.username ? `@${other.username}` : shortWallet(other.wallet))
  )
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString([], {
    hour: 'numeric',
    minute: '2-digit',
  })
}

function sameDay(a: Date, b: Date) {
  return a.toDateString() === b.toDateString()
}

function dayLabel(iso: string) {
  const date = new Date(iso)
  const now = new Date()
  const yesterday = new Date(now.getTime() - 86_400_000)

  if (sameDay(date, now)) return 'Today'
  if (sameDay(date, yesterday)) return 'Yesterday'

  return date.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
}

function listTime(iso: string) {
  const date = new Date(iso)
  const now = new Date()

  if (sameDay(date, now)) return clock(iso)
  if (sameDay(date, new Date(now.getTime() - 86_400_000))) return 'Yesterday'

  return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

function mergeMessages(prev: Msg[], incoming: Msg[], replace: boolean): Msg[] {
  const real = new Map<string, Msg>()

  if (!replace) {
    for (const message of prev) {
      if (!message.pending && !message.failed) real.set(message.id, message)
    }
  }

  for (const message of incoming) {
    real.set(message.id, message)
  }

  const realList = Array.from(real.values())

  // A message I just sent that has come back from the server replaces its
  // temporary "sending" copy.
  const knownIds = new Set(prev.map((message) => message.id))

  const stillLocal = prev.filter(
    (local) =>
      (local.pending || local.failed) &&
      !(
        local.pending &&
        incoming.some(
          (remote) =>
            !knownIds.has(remote.id) &&
            remote.sender_wallet === local.sender_wallet &&
            remote.body === local.body,
        )
      ),
  )

  realList.sort((a, b) => Date.parse(a.created_at) - Date.parse(b.created_at))

  return [...realList, ...stillLocal]
}

function mergeInbox(
  previous: ConversationItem[],
  incoming: ConversationItem[],
): ConversationItem[] {
  const ids = new Set(incoming.map((item) => item.id))

  // Keep a chat I just opened that has no messages yet.
  const localOnly = previous.filter((item) => !ids.has(item.id) && !item.lastMessage)

  return [...localOnly, ...incoming]
}

function useViewport() {
  const read = () => ({
    height: window.visualViewport?.height ?? window.innerHeight,
    top: window.visualViewport?.offsetTop ?? 0,
  })

  const [viewport, setViewport] = useState(read)

  useEffect(() => {
    const visual = window.visualViewport

    function update() {
      setViewport(read())
    }

    visual?.addEventListener('resize', update)
    visual?.addEventListener('scroll', update)
    window.addEventListener('resize', update)

    return () => {
      visual?.removeEventListener('resize', update)
      visual?.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return viewport
}

function Avatar({
  image,
  label,
  size,
}: {
  image: string | null
  label: string
  size: number
}) {
  return (
    <div
      className="wm-avatar"
      style={{ width: size, height: size, flex: `0 0 ${size}px` }}
    >
      {image ? (
        <img src={image} alt={label} />
      ) : (
        <span>{label.replace('@', '').slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  )
}

function Ticks({ message, read }: { message: Msg; read: boolean }) {
  if (message.failed) return <span className="wm-failed">!</span>
  if (message.pending) return <Clock size={12} className="wm-tick" />
  if (read) return <CheckCheck size={15} className="wm-tick wm-read" />

  return <Check size={15} className="wm-tick" />
}

// ---------------------------------------------------------------------------
// The screen
// ---------------------------------------------------------------------------

export default function MessagesPage({
  startProductId,
  onStartHandled,
  onOpenProduct,
}: Props) {
  const { publicKey, connected } = useWallet()
  const wallet = publicKey ? publicKey.toBase58() : ''
  const viewport = useViewport()

  const [session, setSession] = useState<Session | null>(() =>
    wallet ? loadSession(wallet) : null,
  )
  const [signingIn, setSigningIn] = useState(false)
  const [authError, setAuthError] = useState('')
  const [items, setItems] = useState<ConversationItem[]>([])
  const [inboxLoaded, setInboxLoaded] = useState(false)
  const [activeId, setActiveId] = useState('')
  const [messages, setMessages] = useState<Msg[]>([])
  const [readUpTo, setReadUpTo] = useState<string | null>(null)
  const [chatLoading, setChatLoading] = useState(false)
  const [draft, setDraft] = useState('')
  const [notice, setNotice] = useState('')
  const [starting, setStarting] = useState(false)

  const listRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const stickToBottom = useRef(true)
  const lastRealTime = useRef('')
  const activeIdRef = useRef('')

  const active = items.find((item) => item.id === activeId) ?? null

  const handleExpired = useCallback(() => {
    clearSession()
    setSession(null)
    setActiveId('')
  }, [])

  // Pick up this wallet's saved sign-in (if any) whenever the wallet changes.
  useEffect(() => {
    setItems([])
    setInboxLoaded(false)
    setActiveId('')
    setMessages([])
    setAuthError('')
    setSession(wallet ? loadSession(wallet) : null)
  }, [wallet])

  useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  useEffect(() => {
    const real = messages.filter((message) => !message.pending && !message.failed)

    lastRealTime.current = real.length ? real[real.length - 1].created_at : ''
  }, [messages])

  useEffect(() => {
    if (!notice) return

    const timer = window.setTimeout(() => setNotice(''), 4000)

    return () => window.clearTimeout(timer)
  }, [notice])

  // Keep the page behind the chat from scrolling.
  useEffect(() => {
    if (!activeId) return

    const previous = document.body.style.overflow

    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = previous
    }
  }, [activeId])

  function openChat(id: string) {
    stickToBottom.current = true
    lastRealTime.current = ''
    setMessages([])
    setReadUpTo(null)
    setChatLoading(true)
    setActiveId(id)
  }

  function closeChat() {
    const closingId = activeIdRef.current

    // A chat I opened but never wrote in should not stay in my list.
    setItems((previous) =>
      previous.filter((item) => item.id !== closingId || item.lastMessage),
    )
    setActiveId('')
    setDraft('')
    window.dispatchEvent(new Event(REFRESH_EVENT))
  }

  // Conversation list: load now, then refresh quietly every few seconds.
  useEffect(() => {
    if (!session) return

    const token = session.token
    let stopped = false
    let timer: number | undefined

    async function load() {
      if (document.visibilityState === 'visible') {
        try {
          const result = await chatRequest<{ conversations: ConversationItem[] }>(
            '/inbox',
            token,
          )

          if (!stopped) {
            setItems((previous) => mergeInbox(previous, result.conversations))
            setInboxLoaded(true)
          }
        } catch (error) {
          if (error instanceof SessionExpiredError) {
            if (!stopped) handleExpired()
            return
          }
        }
      }

      if (!stopped) {
        timer = window.setTimeout(load, INBOX_POLL_MS)
      }
    }

    void load()

    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [session?.token, handleExpired])

  // "Message seller" from a product page: open (or create) that chat.
  useEffect(() => {
    if (!session || !startProductId) return

    let cancelled = false

    setStarting(true)

    chatRequest<{ conversation: ConversationItem }>('/start', session.token, {
      method: 'POST',
      body: JSON.stringify({ productId: startProductId }),
    })
      .then((result) => {
        if (cancelled) return

        setItems((previous) => [
          result.conversation,
          ...previous.filter((item) => item.id !== result.conversation.id),
        ])
        openChat(result.conversation.id)
      })
      .catch((error) => {
        if (cancelled) return

        if (error instanceof SessionExpiredError) {
          handleExpired()
        } else {
          setNotice(friendlyError(error))
        }
      })
      .finally(() => {
        if (!cancelled) setStarting(false)

        onStartHandled()
      })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.token, startProductId])

  // The open chat: fetch everything once, then ask for new messages every ~2s.
  useEffect(() => {
    if (!session || !activeId) return

    const token = session.token
    const id = activeId
    let stopped = false
    let first = true
    let timer: number | undefined

    async function poll() {
      if (first || document.visibilityState === 'visible') {
        try {
          const after = first ? '' : lastRealTime.current
          const query = after ? `?after=${encodeURIComponent(after)}` : ''

          const result = await chatRequest<{
            messages: Msg[]
            readUpTo: string | null
          }>(`/chat/${encodeURIComponent(id)}${query}`, token)

          if (stopped) return

          setMessages((previous) =>
            mergeMessages(previous, result.messages, first),
          )
          setReadUpTo(result.readUpTo)
          setChatLoading(false)

          if (result.messages.some((message) => message.sender_wallet !== wallet)) {
            window.dispatchEvent(new Event(REFRESH_EVENT))
          }

          first = false
        } catch (error) {
          if (stopped) return

          if (error instanceof SessionExpiredError) {
            handleExpired()
            return
          }

          if (first) {
            setChatLoading(false)
            setNotice(friendlyError(error))
            setActiveId('')
            return
          }
        }
      }

      if (!stopped) {
        timer = window.setTimeout(poll, CHAT_POLL_MS)
      }
    }

    void poll()

    return () => {
      stopped = true
      window.clearTimeout(timer)
    }
  }, [session?.token, activeId, wallet, handleExpired])

  // Stay at the bottom when new messages arrive (unless the user scrolled up).
  useLayoutEffect(() => {
    const list = listRef.current

    if (list && stickToBottom.current) {
      list.scrollTop = list.scrollHeight
    }
  }, [messages, activeId, chatLoading, viewport.height])

  function handleScroll() {
    const list = listRef.current

    if (list) {
      stickToBottom.current =
        list.scrollHeight - list.scrollTop - list.clientHeight < 120
    }
  }

  // No signature needed: connecting the wallet is enough.
  useEffect(() => {
    if (wallet && !session && !signingIn && !authError) {
      void handleSignIn()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet, session, authError])

  async function handleSignIn() {
    if (!wallet) return

    setSigningIn(true)
    setAuthError('')

    try {
      const created = await createSession(wallet)

      saveSession(created)
      setSession(created)
      window.dispatchEvent(new Event(REFRESH_EVENT))
    } catch (error) {
      setAuthError(friendlyError(error))
    } finally {
      setSigningIn(false)
    }
  }

  async function sendMessage(retry?: Msg) {
    const conversationId = activeIdRef.current

    if (!session || !conversationId) return

    const text = (retry ? retry.body : draft).trim()

    if (!text) return

    const tempId =
      retry?.id ?? `tmp-${Date.now()}-${Math.random().toString(36).slice(2)}`

    stickToBottom.current = true

    if (retry) {
      setMessages((previous) =>
        previous.map((message) =>
          message.id === tempId
            ? { ...message, pending: true, failed: false }
            : message,
        ),
      )
    } else {
      setDraft('')

      if (inputRef.current) {
        inputRef.current.style.height = 'auto'
      }

      setMessages((previous) => [
        ...previous,
        {
          id: tempId,
          conversation_id: conversationId,
          sender_wallet: wallet,
          body: text,
          created_at: new Date().toISOString(),
          pending: true,
        },
      ])
    }

    try {
      const result = await chatRequest<{ message: Msg }>(
        `/chat/${encodeURIComponent(conversationId)}/send`,
        session.token,
        { method: 'POST', body: JSON.stringify({ body: text }) },
      )

      setMessages((previous) => {
        const withoutTemp = previous.filter((message) => message.id !== tempId)

        return withoutTemp.some((message) => message.id === result.message.id)
          ? withoutTemp
          : [...withoutTemp, result.message]
      })

      setItems((previous) =>
        previous
          .map((item) =>
            item.id === conversationId
              ? {
                  ...item,
                  lastMessage: {
                    body: result.message.body,
                    senderWallet: wallet,
                    createdAt: result.message.created_at,
                    readAt: null,
                  },
                }
              : item,
          )
          .sort(
            (a, b) =>
              Date.parse(b.lastMessage?.createdAt ?? b.updatedAt) -
              Date.parse(a.lastMessage?.createdAt ?? a.updatedAt),
          ),
      )
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        handleExpired()
      } else {
        setNotice(friendlyError(error))
      }

      setMessages((previous) =>
        previous.map((message) =>
          message.id === tempId
            ? { ...message, pending: false, failed: true }
            : message,
        ),
      )
    }
  }

  function isRead(message: Msg) {
    return (
      !!message.read_at ||
      (!!readUpTo &&
        Date.parse(message.created_at) <= Date.parse(readUpTo))
    )
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  const styles = (
    <style>{`
      .wm-page { max-width: 720px; margin: 0 auto; padding: 20px 0 110px; }
      .wm-title { font-size: 26px; font-weight: 800; letter-spacing: -.5px; margin: 0 16px 14px; }
      .wm-box { margin: 20px 16px; border: 1px solid #e6e9e2; border-radius: 18px; padding: 30px 22px; text-align: center; display: grid; gap: 12px; justify-items: center; background: #fff; }
      .wm-box h3 { margin: 0; font-size: 18px; }
      .wm-box p { margin: 0; color: #6f766a; font-size: 14px; line-height: 1.6; }
      .wm-btn { background: #173d2c; color: #c3f17b; border: 0; border-radius: 999px; padding: 14px 26px; font-weight: 800; font-size: 15px; }
      .wm-btn:disabled { opacity: .55; }
      .wm-err { color: #b44c30; font-size: 13px; }
      .wm-row { display: flex; gap: 14px; align-items: center; width: 100%; padding: 12px 16px; background: none; border: 0; border-bottom: 1px solid #f0f2ed; text-align: left; }
      .wm-row:active { background: #f4f6f1; }
      .wm-rowbody { flex: 1; min-width: 0; }
      .wm-rowtop { display: flex; justify-content: space-between; gap: 10px; align-items: baseline; }
      .wm-rowname { font-weight: 800; font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .wm-rowtime { font-size: 12px; color: #7a8076; flex: 0 0 auto; }
      .wm-rowtime.unread { color: #1f8f4e; font-weight: 800; }
      .wm-rowmid { display: flex; gap: 6px; align-items: center; margin-top: 3px; }
      .wm-preview { flex: 1; min-width: 0; color: #5c6358; font-size: 14px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .wm-preview.unread { color: #20251f; font-weight: 700; }
      .wm-badge { background: #1f8f4e; color: #fff; border-radius: 999px; min-width: 22px; height: 22px; padding: 0 6px; display: grid; place-items: center; font-size: 12px; font-weight: 800; }
      .wm-rowsub { font-size: 12px; color: #98a093; margin-top: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .wm-avatar { border-radius: 50%; overflow: hidden; background: #dfe8d6; display: grid; place-items: center; font-weight: 800; color: #173d2c; }
      .wm-avatar img { width: 100%; height: 100%; object-fit: cover; }
      .wm-tick { color: #8a9387; flex: 0 0 auto; }
      .wm-read { color: #34a8e0; }
      .wm-failed { color: #e53935; font-weight: 800; font-size: 13px; }
      .wm-chat { position: fixed; left: 0; right: 0; z-index: 1000; display: flex; flex-direction: column; background: #efeae2; }
      .wm-head { background: #173d2c; color: #fff; display: flex; align-items: center; gap: 10px; padding: 10px 12px; padding-top: max(10px, env(safe-area-inset-top)); flex: 0 0 auto; }
      .wm-back { background: none; border: 0; color: #fff; padding: 6px; display: grid; place-items: center; }
      .wm-headtext { min-width: 0; flex: 1; text-align: left; background: none; border: 0; color: #fff; padding: 0; }
      .wm-headname { font-weight: 800; font-size: 16px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .wm-headsub { font-size: 12px; opacity: .8; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .wm-list { flex: 1; overflow-y: auto; padding: 12px 10px; display: flex; flex-direction: column; gap: 3px; -webkit-overflow-scrolling: touch; }
      .wm-day { align-self: center; background: #fff; color: #5c6358; font-size: 12px; font-weight: 700; border-radius: 8px; padding: 5px 12px; margin: 10px 0 6px; box-shadow: 0 1px 1px rgba(0,0,0,.08); }
      .wm-product { align-self: center; width: min(100%, 420px); display: flex; gap: 12px; align-items: center; background: #fff; border: 0; border-radius: 14px; padding: 10px; margin: 4px 0 10px; text-align: left; box-shadow: 0 1px 2px rgba(0,0,0,.1); }
      .wm-product img, .wm-product .wm-noimg { width: 52px; height: 52px; border-radius: 10px; object-fit: cover; background: #eef1e8; flex: 0 0 52px; display: grid; place-items: center; }
      .wm-product b { display: block; font-size: 14px; }
      .wm-product span { font-size: 13px; color: #5c6358; }
      .wm-product .wm-view { margin-left: auto; color: #1f8f4e; font-weight: 800; font-size: 13px; }
      .wm-bubble { max-width: 82%; padding: 7px 10px 5px; border-radius: 10px; font-size: 15px; line-height: 1.4; white-space: pre-wrap; word-break: break-word; box-shadow: 0 1px 1px rgba(0,0,0,.1); position: relative; }
      .wm-bubble.me { align-self: flex-end; background: #dcf8c6; border-top-right-radius: 3px; }
      .wm-bubble.them { align-self: flex-start; background: #fff; border-top-left-radius: 3px; }
      .wm-bubble.failed { background: #fde4e1; }
      .wm-meta { display: inline-flex; gap: 3px; align-items: center; float: right; margin: 6px 0 -2px 10px; font-size: 11px; color: #7a8076; }
      .wm-retry { font-size: 11px; color: #e53935; font-weight: 700; background: none; border: 0; padding: 0 0 0 4px; }
      .wm-compose { flex: 0 0 auto; display: flex; gap: 8px; align-items: flex-end; padding: 8px 10px; padding-bottom: max(8px, env(safe-area-inset-bottom)); background: #f0f2f5; }
      .wm-compose textarea { flex: 1; resize: none; border: 0; border-radius: 22px; padding: 11px 16px; font-size: 16px; line-height: 1.35; max-height: 120px; outline: none; background: #fff; font-family: inherit; }
      .wm-send { width: 46px; height: 46px; flex: 0 0 46px; border-radius: 50%; border: 0; background: #173d2c; color: #c3f17b; display: grid; place-items: center; }
      .wm-send:disabled { opacity: .45; }
      .wm-toast { position: absolute; left: 50%; transform: translateX(-50%); bottom: 74px; background: #20251f; color: #fff; padding: 9px 16px; border-radius: 999px; font-size: 13px; max-width: 90%; text-align: center; }
      .wm-hint { align-self: center; color: #7a8076; font-size: 13px; padding: 24px; text-align: center; }
    `}</style>
  )

  if (!connected || !wallet) {
    return (
      <section className="wm-page">
        {styles}
        <h1 className="wm-title">Messages</h1>

        <div className="wm-box">
          <MessageCircle size={34} color="#173d2c" />
          <h3>Connect your wallet</h3>
          <p>
            {startProductId
              ? 'Connect your wallet to message this seller.'
              : 'Connect your wallet to see your conversations.'}
          </p>
          <WalletMultiButton />
        </div>
      </section>
    )
  }

  if (!session) {
    return (
      <section className="wm-page">
        {styles}
        <h1 className="wm-title">Messages</h1>

        <div className="wm-box">
          <MessageCircle size={34} color="#173d2c" />
          <h3>Opening your messages</h3>
          <p>
            Getting your chats ready…
          </p>

          <button className="wm-btn" disabled={signingIn} onClick={() => { setAuthError(''); void handleSignIn() }}>
            {signingIn ? 'Please wait…' : 'Try again'}
          </button>

          {authError && <span className="wm-err">{authError}</span>}
        </div>
      </section>
    )
  }

  const chatOverlay = active ? (
    <div
      className="wm-chat"
      style={{ top: viewport.top, height: viewport.height }}
    >
      <div className="wm-head">
        <button className="wm-back" onClick={closeChat} aria-label="Back">
          <ArrowLeft size={22} />
        </button>

        <Avatar
          image={active.other.image}
          label={displayName(active.other)}
          size={40}
        />

        <button
          className="wm-headtext"
          onClick={() =>
            active.product && onOpenProduct && onOpenProduct(active.product.id)
          }
        >
          <div className="wm-headname">{displayName(active.other)}</div>
          <div className="wm-headsub">
            {active.product ? `About ${active.product.name}` : 'SolMart seller'}
          </div>
        </button>
      </div>

      <div className="wm-list" ref={listRef} onScroll={handleScroll}>
        {active.product && (
          <button
            className="wm-product"
            onClick={() =>
              active.product && onOpenProduct && onOpenProduct(active.product.id)
            }
          >
            {active.product.image ? (
              <img src={active.product.image} alt={active.product.name} />
            ) : (
              <span className="wm-noimg">📦</span>
            )}

            <div>
              <b>{active.product.name}</b>
              <span>
                {active.product.price.toLocaleString('en-US', {
                  maximumFractionDigits: 6,
                })}{' '}
                {active.product.currency}
              </span>
            </div>

            <span className="wm-view">View</span>
          </button>
        )}

        {chatLoading && messages.length === 0 && (
          <div className="wm-hint">Loading messages…</div>
        )}

        {!chatLoading && messages.length === 0 && (
          <div className="wm-hint">
            Say hello 👋 Ask about the product, price or delivery.
          </div>
        )}

        {messages.map((message, index) => {
          const mine = message.sender_wallet === wallet
          const previous = messages[index - 1]
          const newDay =
            !previous ||
            !sameDay(new Date(previous.created_at), new Date(message.created_at))

          return (
            <div key={message.id} style={{ display: 'contents' }}>
              {newDay && (
                <div className="wm-day">{dayLabel(message.created_at)}</div>
              )}

              <div
                className={
                  'wm-bubble ' +
                  (mine ? 'me' : 'them') +
                  (message.failed ? ' failed' : '')
                }
              >
                {message.body}

                <span className="wm-meta">
                  {clock(message.created_at)}
                  {mine && <Ticks message={message} read={isRead(message)} />}
                  {message.failed && (
                    <button
                      className="wm-retry"
                      onClick={() => void sendMessage(message)}
                    >
                      Tap to retry
                    </button>
                  )}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      {notice && <div className="wm-toast">{notice}</div>}

      <div className="wm-compose">
        <textarea
          ref={inputRef}
          rows={1}
          value={draft}
          placeholder="Message"
          enterKeyHint="send"
          maxLength={2000}
          onChange={(event) => {
            setDraft(event.target.value)
            event.target.style.height = 'auto'
            event.target.style.height = `${Math.min(event.target.scrollHeight, 120)}px`
          }}
          onFocus={() => {
            stickToBottom.current = true
          }}
          onKeyDown={(event) => {
            if (
              event.key === 'Enter' &&
              !event.shiftKey &&
              window.matchMedia('(pointer: fine)').matches
            ) {
              event.preventDefault()
              void sendMessage()
            }
          }}
        />

        <button
          className="wm-send"
          aria-label="Send message"
          disabled={!draft.trim()}
          onClick={() => void sendMessage()}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  ) : null

  return (
    <section className="wm-page">
      {styles}
      <h1 className="wm-title">Messages</h1>

      {starting && <div className="wm-hint">Opening your chat…</div>}

      {!inboxLoaded && items.length === 0 ? (
        <div className="wm-hint">Loading your chats…</div>
      ) : items.length === 0 ? (
        <div className="wm-box">
          <MessageCircle size={34} color="#173d2c" />
          <h3>No chats yet</h3>
          <p>
            Open any product and tap “Message Seller” to start a chat. When a
            buyer writes to you, it shows up here.
          </p>
        </div>
      ) : (
        <div>
          {items.map((item) => {
            const last = item.lastMessage
            const mine = !!last && last.senderWallet === wallet

            return (
              <button
                key={item.id}
                className="wm-row"
                onClick={() => openChat(item.id)}
              >
                <Avatar
                  image={item.other.image}
                  label={displayName(item.other)}
                  size={52}
                />

                <div className="wm-rowbody">
                  <div className="wm-rowtop">
                    <span className="wm-rowname">{displayName(item.other)}</span>

                    {last && (
                      <span
                        className={'wm-rowtime' + (item.unread ? ' unread' : '')}
                      >
                        {listTime(last.createdAt)}
                      </span>
                    )}
                  </div>

                  <div className="wm-rowmid">
                    {mine && last && (
                      <Ticks
                        message={{
                          id: item.id,
                          conversation_id: item.id,
                          sender_wallet: wallet,
                          body: last.body,
                          created_at: last.createdAt,
                        }}
                        read={!!last.readAt}
                      />
                    )}

                    <span className={'wm-preview' + (item.unread ? ' unread' : '')}>
                      {last ? last.body : 'No messages yet. Say hello!'}
                    </span>

                    {item.unread > 0 && (
                      <span className="wm-badge">{item.unread}</span>
                    )}
                  </div>

                  {item.product && (
                    <div className="wm-rowsub">Re: {item.product.name}</div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      )}

      {notice && !active && (
        <div className="wm-hint" style={{ color: '#b44c30' }}>
          {notice}
        </div>
      )}

      {chatOverlay}
    </section>
  )
}
