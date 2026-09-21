import { useState } from 'react'
import AvatarIcon from './AvatarIcon.jsx'
import ValueDisparityModal from './ValueDisparityModal.jsx'
import CashInput from './CashInput.jsx'
import TradeChatModal from './TradeChatModal.jsx'
import ReportTradeModal from './ReportTradeModal.jsx'
import RateTradeModal from './RateTradeModal.jsx'
import RatingBadge from './RatingBadge.jsx'
import RatingsListModal from './RatingsListModal.jsx'
import { checkValueDisparity } from '../utils/tradeValue.js'
import { formatUSD } from '../utils/currency.js'

const SUSPENDED_MESSAGE = "Your account has been suspended by an admin — you can't trade or message right now."

const STATUS_LABEL = {
  pending: 'Awaiting response',
  accepted: 'Accepted — coordinate the swap',
  declined: 'Declined',
  cancelled: 'Cancelled',
  completed: 'Trade completed',
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function TradeCard({ trade, direction, match, onRespond, onConfirm, onBlock, token, currentAccountId, isSuspended }) {
  const { counterparty, status } = trade
  const [checkingValue, setCheckingValue] = useState(false)
  const [disparity, setDisparity] = useState(null)
  const [cashInput, setCashInput] = useState('')
  const [chatOpen, setChatOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const [reportSubmitted, setReportSubmitted] = useState(false)
  const [rateOpen, setRateOpen] = useState(false)
  const [myRating, setMyRating] = useState(trade.myRating)
  const [viewingRatings, setViewingRatings] = useState(false)
  const [blocking, setBlocking] = useState(false)
  const cashAmount = Number(cashInput) || 0

  const handleBlock = async () => {
    if (!window.confirm(`Block ${counterparty.username}? They won't be able to propose new trades to you, and you won't see them as a match anymore.`)) {
      return
    }
    setBlocking(true)
    await onBlock(counterparty.id)
    setBlocking(false)
  }

  const handleAcceptClick = async () => {
    // No current match data for this counterparty (e.g. the overlapping
    // cards have since changed) — nothing to compare, so just accept.
    if (!match) return onRespond(trade.id, 'accept', cashAmount)

    setCheckingValue(true)
    const result = await checkValueDisparity(match.theyHaveYouWant, match.youHaveTheyWant, {
      yourCash: cashAmount,
      theirCash: trade.theirCash,
    })
    setCheckingValue(false)
    if (result?.imbalanced) setDisparity(result)
    else onRespond(trade.id, 'accept', cashAmount)
  }

  return (
    <div className={`trade-card trade-${status}`}>
      <div className="trade-card-header">
        <span className="match-avatar"><AvatarIcon value={counterparty.avatar} size={32} /></span>
        <span className="trade-summary-text">
          <span className="match-name-row">
            <strong>{counterparty.username}</strong>
            <RatingBadge rating={counterparty.rating} onClick={() => setViewingRatings(true)} />
          </span>
          <span className={`trade-status-badge status-${status}`}>{STATUS_LABEL[status]}</span>
        </span>
      </div>

      {isSuspended && <p className="form-error">{SUSPENDED_MESSAGE}</p>}

      {(trade.myCash > 0 || trade.theirCash > 0) && (
        <p className="trade-hint">
          💵{trade.myCash > 0 ? ` You added ${formatUSD(trade.myCash)}` : ''}
          {trade.myCash > 0 && trade.theirCash > 0 ? ' · ' : ''}
          {trade.theirCash > 0 ? `${counterparty.username} added ${formatUSD(trade.theirCash)}` : ''}
        </p>
      )}

      {status === 'pending' && direction === 'received' && !isSuspended && (
        <div className="trade-actions-column">
          <CashInput value={cashInput} onChange={setCashInput} label="Add cash to your side (optional)" />
          <div className="trade-actions">
            <button type="button" className="button primary" disabled={checkingValue} onClick={handleAcceptClick}>
              {checkingValue ? 'Checking card values…' : 'Accept'}
            </button>
            <button type="button" className="button secondary" onClick={() => onRespond(trade.id, 'decline')}>
              Decline
            </button>
          </div>
        </div>
      )}

      {status === 'pending' && direction === 'sent' && (
        <div className="trade-actions-column">
          <p className="trade-hint">Waiting for {counterparty.username} to respond.</p>
          <button type="button" className="button secondary" onClick={() => onRespond(trade.id, 'cancel')}>
            Cancel proposal
          </button>
        </div>
      )}

      {status === 'accepted' && !trade.confirmedByMe && !isSuspended && (
        <div className="trade-actions">
          <button type="button" className="button primary" onClick={() => onConfirm(trade.id)}>
            Mark trade as complete
          </button>
        </div>
      )}

      {status === 'accepted' && trade.confirmedByMe && !trade.confirmedByThem && (
        <p className="trade-hint">You confirmed it's done — waiting for {counterparty.username} to confirm too.</p>
      )}

      {status === 'completed' && (
        <>
          <p className="trade-hint trade-hint-success">
            ✓ Verified by both sides{trade.completedAt ? ` on ${formatDate(trade.completedAt)}` : ''}.
          </p>
          {myRating === null ? (
            <button type="button" className="button secondary" onClick={() => setRateOpen(true)}>
              Rate this trade
            </button>
          ) : (
            <p className="trade-hint">
              You rated this {myRating ? '👍 good' : '👎 bad'}.{' '}
              <button type="button" className="link-button" onClick={() => setRateOpen(true)}>Change</button>
            </p>
          )}
        </>
      )}

      <div className="trade-footer-actions">
        <button type="button" className="link-button" onClick={() => setChatOpen(true)}>💬 Chat</button>
        <button type="button" className="link-button danger" onClick={() => setReportOpen(true)}>
          ⚠️ Report an issue
        </button>
        <button type="button" className="link-button danger" disabled={blocking} onClick={handleBlock}>
          {blocking ? 'Blocking…' : `🚫 Block ${counterparty.username}`}
        </button>
      </div>

      {reportSubmitted && (
        <p className="trade-hint trade-hint-success">Report submitted — a SwapDeck admin will review it.</p>
      )}

      {chatOpen && (
        <TradeChatModal
          token={token}
          tradeId={trade.id}
          currentAccountId={currentAccountId}
          composeDisabledMessage={isSuspended ? SUSPENDED_MESSAGE : undefined}
          onClose={() => setChatOpen(false)}
        />
      )}

      {reportOpen && (
        <ReportTradeModal
          token={token}
          tradeId={trade.id}
          onClose={() => setReportOpen(false)}
          onSubmitted={() => {
            setReportOpen(false)
            setReportSubmitted(true)
          }}
        />
      )}

      {rateOpen && (
        <RateTradeModal
          token={token}
          tradeId={trade.id}
          counterpartyUsername={counterparty.username}
          existingRating={myRating}
          onClose={() => setRateOpen(false)}
          onRated={(thumbsUp) => {
            setMyRating(thumbsUp)
            setRateOpen(false)
          }}
        />
      )}

      {disparity && (
        <ValueDisparityModal
          theirLabel={`${counterparty.username}'s cards`}
          yourLabel="Your cards"
          theirValue={disparity.theirValue}
          yourValue={disparity.yourValue}
          theirCash={trade.theirCash}
          yourCash={cashAmount}
          disparity={disparity.disparity}
          onCancel={() => setDisparity(null)}
          onConfirm={() => {
            setDisparity(null)
            onRespond(trade.id, 'accept', cashAmount)
          }}
        />
      )}

      {viewingRatings && (
        <RatingsListModal
          token={token}
          accountId={counterparty.id}
          username={counterparty.username}
          onClose={() => setViewingRatings(false)}
        />
      )}
    </div>
  )
}

export default function TradesView({ trades, matches, onRespond, onConfirm, onBlock, token, currentAccountId, isSuspended }) {
  const { sent, received } = trades
  const hasAny = sent.length > 0 || received.length > 0
  const matchByAccountId = (accountId) => matches.find((m) => m.account.id === accountId)

  if (!hasAny) {
    return (
      <div className="view">
        <h1>Trades</h1>
        <div className="empty-state">
          <span className="empty-state-emoji">🤝</span>
          <p>Propose a trade from the Matches tab to get started. Once a trade is accepted, both sides confirm here after the swap happens.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="view">
      <h1>Trades</h1>
      <p className="view-subtitle">A trade only shows as verified once both people confirm it happened.</p>

      {received.length > 0 && (
        <section className="trades-section">
          <h2>Received</h2>
          <div className="trade-list">
            {received.map((trade) => (
              <TradeCard
                key={trade.id}
                trade={trade}
                direction="received"
                match={matchByAccountId(trade.counterparty.id)}
                onRespond={onRespond}
                onConfirm={onConfirm}
                onBlock={onBlock}
                token={token}
                currentAccountId={currentAccountId}
                isSuspended={isSuspended}
              />
            ))}
          </div>
        </section>
      )}

      {sent.length > 0 && (
        <section className="trades-section">
          <h2>Sent</h2>
          <div className="trade-list">
            {sent.map((trade) => (
              <TradeCard
                key={trade.id}
                trade={trade}
                direction="sent"
                match={matchByAccountId(trade.counterparty.id)}
                onRespond={onRespond}
                onConfirm={onConfirm}
                onBlock={onBlock}
                token={token}
                currentAccountId={currentAccountId}
                isSuspended={isSuspended}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
