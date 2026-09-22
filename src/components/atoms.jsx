import React from 'react'

export const statusLabels = { normal: 'Normal', attention: 'Atenção', critical: 'Crítico', success: 'Resolvido' }

export function StatusBadge({ status }) {
  return <span className={`badge ${status}`} role="status">{statusLabels[status] || status}</span>
}

export function ProgressBar({ value, status = 'normal', label }) {
  return (
    <div className="progress large" role="progressbar" aria-label={label || 'Nível de estoque'} aria-valuemin="0" aria-valuemax="100" aria-valuenow={value}>
      <i className={status} style={{ width: `${value}%` }} />
    </div>
  )
}

export function IconButton({ label, children, className = '', ...props }) {
  return <button type="button" className={`icon-btn ${className}`} aria-label={label} {...props}>{children}</button>
}
