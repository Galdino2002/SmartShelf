import React from "react";

export const statusLabels = {
  normal: "Normal",
  attention: "Atenção",
  critical: "Crítico",
  success: "Resolvido",
  "no-reading": "Sem leitura",
};

export function StatusBadge({ status }) {
  return (
    <span
      className={`badge ${status}`}
      role="status"
      aria-label={`Status: ${statusLabels[status] || status}`}
    >
      {statusLabels[status] || status}
    </span>
  );
}

export function ProgressBar({ value, status = "normal", label }) {
  return (
    <div
      className="progress large"
      role="progressbar"
      aria-label={label || "Nível de estoque"}
      aria-valuemin="0"
      aria-valuemax="100"
      aria-valuenow={value}
    >
      <i className={status} style={{ width: `${value}%` }} />
    </div>
  );
}

export function IconButton({ label, children, className = "", ...props }) {
  return (
    <button
      type="button"
      className={`icon-btn ${className}`}
      aria-label={label}
      {...props}
    >
      {children}
    </button>
  );
}

export function LoadingState({ label = "Carregando dados..." }) {
  return (
    <div className="loading-state" role="status" aria-live="polite">
      <span className="loading-spinner" aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}

export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="empty-state">
      {Icon && (
        <div className="empty-icon" aria-hidden="true">
          <Icon size={24} />
        </div>
      )}
      <strong>{title}</strong>
      {description && <span>{description}</span>}
      {action}
    </div>
  );
}
