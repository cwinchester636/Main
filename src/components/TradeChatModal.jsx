import { useEffect, useRef, useState } from 'react'
import { api, ApiError } from '../api/client.js'

const POLL_MS = 4000

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

// readOnly: admin reviewing a reported trade's chat log can read it but
// never post into it — see getMessages/sendMessage in worker/src/routes/
// messages.js, which enforces the same thing server-side regardless of
// what this prop is set to. composeDisabledMessage: same idea for a
// suspended user — still shown the thread, just told why they can't add
// to it, rather than letting them type into a box that'll just 403.
export default function TradeChatModal({
  token,
  tradeId,
  currentAccountId,
  readOnly = false,
  composeDisabledMessage,
  onClose,
}) {
  const [messages, setMessages] = useState(null)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)

  const load = async () => {
    try {
      const { messages: list } = await api.getTradeMessages(token, tradeId)
      setMessages(list)
      setError('')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not load chat.')
    }
  }

  useEffect(() => {
    load()
    const timer = setInterval(load, POLL_MS)
    return () => clearInterval(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tradeId])

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  const handleSend = async () => {
    const text = draft.trim()
    if (!text) return
    setSending(true)
    try {
      await api.sendTradeMessage(token, tradeId, text)
      setDraft('')
      await load()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not send that message.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="sheet-backdrop" onClick={onClose}>
      <div className="sheet chat-sheet" onClick={(e) => e.stopPropagation()}>
        <div className="sheet-header">
          <h2>{readOnly ? 'Chat log' : 'Chat'}</h2>
          <button type="button" className="icon-button" onClick={onClose} aria-label="Close">×</button>
        </div>

        {error && <p className="form-error">{error}</p>}

        <div className="chat-message-list" ref={listRef}>
          {messages === null && <p className="picker-status">Loading chat…</p>}
          {messages?.length === 0 && <p className="empty-hint">No messages yet.</p>}
          {messages?.map((msg) => (
            <div
              key={msg.id}
              className={`chat-bubble${msg.senderAccountId === currentAccountId ? ' mine' : ''}`}
            >
              {msg.senderAccountId !== currentAccountId && (
                <span className="chat-bubble-sender">{msg.senderUsername}</span>
              )}
              <span className="chat-bubble-body">{msg.body}</span>
              <span className="chat-bubble-time">{formatTime(msg.createdAt)}</span>
            </div>
          ))}
        </div>

        {!readOnly && composeDisabledMessage && <p className="trade-hint">{composeDisabledMessage}</p>}

        {!readOnly && !composeDisabledMessage && (
          <div className="chat-compose">
            <input
              type="text"
              className="text-input"
              placeholder="Message…"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSend()
              }}
              maxLength={2000}
            />
            <button type="button" className="button primary" disabled={sending || !draft.trim()} onClick={handleSend}>
              Send
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
