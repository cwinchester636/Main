import { useState } from 'react'
import AvatarIcon from './AvatarIcon.jsx'
import ValueDisparityModal from './ValueDisparityModal.jsx'
import CashInput from './CashInput.jsx'
import { checkValueDisparity } from '../utils/tradeValue.js'
import { formatUSD } from '../utils/currency.js'

const STATUS_LABEL = {
  pending: 'Awaiting response',
  accepted: 'Accepted — coordinate the swap',
  declined: 'Declined',
  completed: 'Trade completed',
}

function formatDate(ts) {
  return new Date(ts).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function TradeCard({ trade, direction, match, onRespond, onConfirm }) {
  const { counterparty, status } = trade
  const [checkingValue, setCheckingValue] = useState(false)
  const [disparity, setDisparity] = useState(null)
  const [cashInput, setCashInput] = useState('')
  const cashAmount = Number(cashInput) || 0

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
          <strong>{counterparty.username}</strong>
          <span className={`trade-status-badge status-${status}`}>{STATUS_LABEL[status]}</span>
        </span>
      </div>

      {(trade.myCash > 0 || trade.theirCash > 0) && (
        <p className="trade-hint">
          💵{trade.myCash > 0 ? ` You added ${formatUSD(trade.myCash)}` : ''}
          {trade.myCash > 0 && trade.theirCash > 0 ? ' · ' : ''}
          {trade.theirCash > 0 ? `${counterparty.username} added ${formatUSD(trade.theirCash)}` : ''}
        </p>
      )}

      {status === 'pending' && direction === 'received' && (
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
        <p className="trade-hint">Waiting for {counterparty.username} to respond.</p>
      )}

      {status === 'accepted' && !trade.confirmedByMe && (
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
        <p className="trade-hint trade-hint-success">
          ✓ Verified by both sides{trade.completedAt ? ` on ${formatDate(trade.completedAt)}` : ''}.
        </p>
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
    </div>
  )
}

export default function TradesView({ trades, matches, onRespond, onConfirm }) {
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
              />
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
