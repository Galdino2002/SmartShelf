import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  AlertTriangle,
  Bell,
  Check,
  ChevronRight,
  Clock3,
  Database,
  History,
  Layers3,
  Menu,
  Package,
  RefreshCw,
  Settings,
  SlidersHorizontal,
  Warehouse,
  Wifi,
  X,
} from "lucide-react";
import {
  BrowserRouter,
  Navigate,
  NavLink,
  Route,
  Routes,
  useLocation,
} from "react-router-dom";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  EmptyState,
  IconButton,
  LoadingState,
  ProgressBar,
  StatusBadge,
} from "./components/atoms";
import {
  refreshData,
  resolveAlert,
  useSmartShelfData,
} from "./data/useSmartShelfData";
import "./styles.css";

const formatTime = (value) =>
  value
    ? new Date(value).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : "Nenhuma leitura registrada";

const formatWeight = (value) =>
  value == null
    ? "—"
    : `${Number(value).toLocaleString("pt-BR", {
        maximumFractionDigits: 3,
      })} kg`;

function PageHeader({ title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <p className="section-kicker">SMARTSHELF / MONITORAMENTO</p>
        <h1>{title}</h1>
        <p className="page-description">{description}</p>
      </div>
      {action}
    </div>
  );
}

function Modal({ title, children, onClose }) {
  useEffect(() => {
    const close = (event) => event.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);

  return (
    <div className="overlay" onClick={onClose}>
      <section
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(event) => event.stopPropagation()}
      >
        <IconButton label="Fechar janela" className="close" onClick={onClose}>
          <X size={18} />
        </IconButton>
        <p className="section-kicker">DETALHES</p>
        <h2 id="modal-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}

function ErrorState({ error, onRetry }) {
  return (
    <div className="error-state" role="alert">
      <AlertTriangle size={20} aria-hidden="true" />
      <div>
        <strong>Não foi possível carregar os dados.</strong>
        <p>{error}</p>
      </div>
      <button className="button secondary" type="button" onClick={onRetry}>
        Tentar novamente
      </button>
    </div>
  );
}

function ConnectionStatus({ loading, error, latestReadingAt, lastUpdated }) {
  const online = !loading && !error;
  return (
    <div className={`connection-status ${online ? "online" : "offline"}`}>
      <span className="status-dot" aria-hidden="true" />
      <span>
        {online
          ? "Sistema online"
          : loading
            ? "Consultando..."
            : "Atenção na conexão"}
      </span>
      <small>
        Última leitura: {formatTime(latestReadingAt)} · Sync:{" "}
        {formatTime(lastUpdated)}
      </small>
    </div>
  );
}

function Header({ onMenu }) {
  const location = useLocation();
  const { alerts, loading, error, latestReadingAt, lastUpdated } =
    useSmartShelfData();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const activeAlerts = alerts.filter((alert) => !alert.resolved).length;
  const titles = {
    "/dashboard": ["Dashboard", "Visão geral do estoque e dos sensores"],
    "/prateleiras": [
      "Prateleiras",
      "Acompanhe ocupação, capacidade e leituras",
    ],
    "/produtos": ["Produtos", "Consulte os produtos monitorados"],
    "/alertas": ["Alertas", "Monitore eventos e resolva ocorrências"],
    "/historico": ["Histórico", "Consulte as leituras reais dos sensores"],
    "/configuracoes": ["Configurações", "Estado da conexão e do hardware"],
  };
  const [title, description] =
    titles[location.pathname] || titles["/dashboard"];

  return (
    <header className="topbar">
      <button
        className="menu-button"
        type="button"
        aria-label="Abrir menu"
        onClick={onMenu}
      >
        <Menu size={20} />
      </button>
      <div className="topbar-title">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="topbar-actions">
        <ConnectionStatus
          loading={loading}
          error={error}
          latestReadingAt={latestReadingAt}
          lastUpdated={lastUpdated}
        />
        <button
          className="icon-button notification-button"
          type="button"
          aria-label={`${activeAlerts} alertas ativos`}
          aria-expanded={notificationsOpen}
          onClick={() => setNotificationsOpen((value) => !value)}
        >
          <Bell size={18} />
          {activeAlerts > 0 && (
            <span className="notification-count">{activeAlerts}</span>
          )}
        </button>
        {notificationsOpen && <NotificationPanel />}
        <button className="avatar" type="button" aria-label="Perfil SmartShelf">
          SS
        </button>
      </div>
    </header>
  );
}

function NotificationPanel() {
  const { notifications } = useSmartShelfData();
  return (
    <div className="notification-panel" role="region" aria-label="Notificações">
      <div className="panel-heading">
        <strong>Notificações</strong>
        <NavLink to="/alertas">Ver alertas</NavLink>
      </div>
      {notifications.length ? (
        notifications.map((notification, index) => (
          <div
            className="notification-item"
            key={`${notification.time}-${index}`}
          >
            <span className={`notification-icon ${notification.severity}`}>
              <Bell size={14} />
            </span>
            <div>
              <strong>{notification.title}</strong>
              <span>{notification.body}</span>
              <small>{notification.time}</small>
            </div>
          </div>
        ))
      ) : (
        <EmptyState
          title="Tudo em dia"
          description="Nenhuma notificação nova."
        />
      )}
    </div>
  );
}

function Sidebar({ open, onClose }) {
  const { alerts, loading, error, lastUpdated } = useSmartShelfData();
  const links = [
    { section: "VISÃO GERAL", items: [["/dashboard", "Dashboard", Activity]] },
    {
      section: "ESTOQUE",
      items: [
        ["/prateleiras", "Prateleiras", Warehouse],
        ["/produtos", "Produtos", Package],
      ],
    },
    {
      section: "MONITORAMENTO",
      items: [
        ["/alertas", "Alertas", AlertTriangle],
        ["/historico", "Histórico", History],
      ],
    },
    {
      section: "SISTEMA",
      items: [["/configuracoes", "Configurações", Settings]],
    },
  ];
  const online = !loading && !error;

  return (
    <>
      <aside
        className={`sidebar ${open ? "open" : ""}`}
        aria-label="Navegação principal"
      >
        <div className="brand-block">
          <div className="brand-mark">
            <Layers3 size={20} />
          </div>
          <div>
            <strong>
              Smart<span>Shelf</span>
            </strong>
            <small>Monitoramento inteligente</small>
          </div>
        </div>
        <nav className="sidebar-nav">
          {links.map(({ section, items }) => (
            <div className="nav-group" key={section}>
              <span className="nav-label">{section}</span>
              {items.map(([to, label, Icon]) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={onClose}
                  className={({ isActive }) =>
                    isActive ? "nav-link active" : "nav-link"
                  }
                >
                  <Icon size={17} />
                  <span>{label}</span>
                  {label === "Alertas" &&
                    alerts.filter((alert) => !alert.resolved).length > 0 && (
                      <b className="nav-count">
                        {alerts.filter((alert) => !alert.resolved).length}
                      </b>
                    )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
        <div className="sidebar-footer">
          <div className="system-card">
            <div className={`status-dot ${online ? "online" : "offline"}`} />
            <div>
              <strong>
                {online
                  ? "Sistema online"
                  : loading
                    ? "Consultando dados"
                    : "Conexão indisponível"}
              </strong>
              <small>Última sincronização: {formatTime(lastUpdated)}</small>
            </div>
          </div>
          <button
            className="refresh-link"
            type="button"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} /> Atualizar
            dados
          </button>
        </div>
      </aside>
      {open && (
        <button
          className="sidebar-backdrop"
          type="button"
          aria-label="Fechar menu"
          onClick={onClose}
        />
      )}
    </>
  );
}

function Layout({ children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <main className="main-content">
        <Header onMenu={() => setMenuOpen(true)} />
        {children}
      </main>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, description, tone }) {
  return (
    <article className={`stat-card tone-${tone}`}>
      <div className="stat-card-icon">
        <Icon size={19} />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    </article>
  );
}

function IoTStatus({ loading, error, latestReadingAt }) {
  const connected = !loading && !error;
  const stages = [
    ["Sensor", latestReadingAt ? "Leitura recebida" : "Aguardando leitura"],
    ["ESP32", latestReadingAt ? "Dados enviados" : "Aguardando leitura"],
    ["Supabase", connected ? "Conectado" : "Sem conexão"],
    ["Dashboard", connected ? "Atualizado" : "Aguardando"],
  ];
  return (
    <section className="panel iot-card">
      <div className="section-heading">
        <div className="section-icon red">
          <Wifi size={18} />
        </div>
        <div>
          <h3>Monitoramento IoT</h3>
          <p>Fluxo real de dados do sensor até o painel</p>
        </div>
      </div>
      <div className="iot-flow">
        {stages.map(([name, status], index) => (
          <div className="iot-stage" key={name}>
            <span
              className={`iot-stage-icon ${status.includes("Aguardando") || status.includes("Sem") ? "waiting" : "connected"}`}
            >
              {index === 0 ? (
                <Wifi size={16} />
              ) : index === 1 ? (
                <Activity size={16} />
              ) : index === 2 ? (
                <Database size={16} />
              ) : (
                <Activity size={16} />
              )}
            </span>
            <strong>{name}</strong>
            <small>{status}</small>
            {index < stages.length - 1 && (
              <ChevronRight className="iot-arrow" size={17} />
            )}
          </div>
        ))}
      </div>
      <div className="iot-reading">
        <Clock3 size={15} /> Última leitura:{" "}
        <strong>{formatTime(latestReadingAt)}</strong>
      </div>
    </section>
  );
}

function StockChart() {
  const { chart7, chart30, loading } = useSmartShelfData();
  const [period, setPeriod] = useState("7");
  const data = period === "7" ? chart7 : chart30;
  return (
    <section className="panel chart-panel">
      <div className="section-heading compact">
        <div>
          <h3>Utilização das prateleiras</h3>
          <p>Percentual calculado a partir de peso e capacidade reais</p>
        </div>
        <div className="segmented">
          {["7", "30"].map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={period === value}
              className={period === value ? "selected" : ""}
              onClick={() => setPeriod(value)}
            >
              {value} dias
            </button>
          ))}
        </div>
      </div>
      <div className={`chart ${!data.length ? "chart-empty" : ""}`}>
        {loading ? (
          <LoadingState label="Carregando leituras..." />
        ) : data.length ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data}>
              <CartesianGrid stroke="#edf1f0" vertical={false} />
              <XAxis
                dataKey="name"
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#84918d", fontSize: 11 }}
              />
              <YAxis
                domain={[0, 100]}
                axisLine={false}
                tickLine={false}
                tick={{ fill: "#84918d", fontSize: 11 }}
                tickFormatter={(value) => `${value}%`}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, "Capacidade utilizada"]}
                contentStyle={{ border: "1px solid #e5e9e8", borderRadius: 10 }}
              />
              <Line
                type="monotone"
                dataKey="value"
                stroke="#d71920"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "#fff", stroke: "#d71920", strokeWidth: 2 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <EmptyState
            icon={Activity}
            title="Aguardando dados do sensor"
            description="O gráfico será exibido após a primeira leitura do ESP32."
          />
        )}
      </div>
    </section>
  );
}

function ShelfSummary({ shelves, loading }) {
  return (
    <section className="panel">
      <div className="section-heading compact">
        <div>
          <h3>Status das prateleiras</h3>
          <p>Capacidade e última leitura por unidade</p>
        </div>
        <NavLink className="text-link" to="/prateleiras">
          Ver todas <ChevronRight size={15} />
        </NavLink>
      </div>
      {loading ? (
        <LoadingState label="Carregando prateleiras..." />
      ) : shelves.length ? (
        shelves.map((shelf) => (
          <div className="shelf-summary" key={shelf.rawId}>
            <div className="shelf-summary-head">
              <div>
                <strong>{shelf.id}</strong>
                <small>{shelf.location}</small>
              </div>
              <StatusBadge status={shelf.status} />
            </div>
            <div className="shelf-summary-info">
              <span>
                Produto: <b>{shelf.primaryProduct || "—"}</b>
              </span>
              <span>
                Capacidade: <b>{shelf.capacity} kg</b>
              </span>
            </div>
            <div className="shelf-summary-info">
              <span>
                Peso: <b>{formatWeight(shelf.weight)}</b>
              </span>
              <span>
                Quantidade:{" "}
                <b>{shelf.hasReading === false ? "—" : shelf.quantity}</b>
              </span>
            </div>
            <div className="progress-row">
              {shelf.level == null ? (
                <span className="no-reading-label">Sem leitura</span>
              ) : (
                <>
                  <ProgressBar
                    value={shelf.level}
                    status={shelf.status}
                    label={`Uso da ${shelf.id}`}
                  />
                  <strong>{shelf.level}%</strong>
                </>
              )}
            </div>
          </div>
        ))
      ) : (
        <EmptyState
          icon={Warehouse}
          title="Nenhuma prateleira cadastrada"
          description="Cadastre uma prateleira no Supabase para começar."
        />
      )}
    </section>
  );
}

function RecentAlerts({ alerts, loading, onView }) {
  const active = alerts.filter((alert) => !alert.resolved);
  return (
    <section className="panel">
      <div className="section-heading compact">
        <div>
          <h3>Alertas recentes</h3>
          <p>Eventos registrados pelo sistema</p>
        </div>
        <NavLink className="text-link" to="/alertas">
          Ver todos <ChevronRight size={15} />
        </NavLink>
      </div>
      {loading ? (
        <LoadingState label="Carregando alertas..." />
      ) : active.length ? (
        active.slice(0, 4).map((alert) => (
          <button
            className="alert-item"
            type="button"
            key={alert.id}
            onClick={() => onView(alert)}
          >
            <span className={`alert-item-icon ${alert.severity}`}>
              <AlertTriangle size={16} />
            </span>
            <span className="alert-item-copy">
              <strong>{alert.type || "Alerta"}</strong>
              <span>{alert.message}</span>
              <small>
                {alert.shelf} · {alert.product} · {alert.time}
              </small>
            </span>
            <ChevronRight size={16} />
          </button>
        ))
      ) : (
        <EmptyState
          icon={Check}
          title="Nenhum alerta ativo"
          description="Seu estoque está operando normalmente."
        />
      )}
    </section>
  );
}

function RecentReadings({ history, loading }) {
  return (
    <section className="panel">
      <div className="section-heading compact">
        <div>
          <h3>Últimas leituras</h3>
          <p>Dados recebidos do ESP32</p>
        </div>
        <NavLink className="text-link" to="/historico">
          Ver histórico <ChevronRight size={15} />
        </NavLink>
      </div>
      {loading ? (
        <LoadingState label="Carregando leituras..." />
      ) : history.length ? (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Horário</th>
                <th>Prateleira</th>
                <th>Produto</th>
                <th>Peso</th>
                <th>Quantidade</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history
                .slice(-5)
                .reverse()
                .map((reading) => (
                  <tr key={reading.id}>
                    <td>{reading.time}</td>
                    <td>
                      <strong>{reading.shelf}</strong>
                    </td>
                    <td>{reading.product}</td>
                    <td>{formatWeight(reading.weight)}</td>
                    <td>
                      {reading.quantity == null
                        ? "—"
                        : `${reading.quantity} un.`}
                    </td>
                    <td>
                      <StatusBadge
                        status={
                          reading.status === "Crítico" ? "critical" : "normal"
                        }
                      />
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          icon={History}
          title="Aguardando primeira leitura"
          description="As leituras aparecerão aqui quando o ESP32 enviar dados."
        />
      )}
    </section>
  );
}

function Dashboard() {
  const {
    shelves,
    products,
    alerts,
    history,
    loading,
    error,
    lastUpdated,
    latestReadingAt,
  } = useSmartShelfData();
  const lowStock = products.filter((product) => product.lowStock).length;
  const activeAlerts = alerts.filter((alert) => !alert.resolved).length;
  const [selectedAlert, setSelectedAlert] = useState(null);
  return (
    <div className="page-content">
      <PageHeader
        title="Dashboard"
        description="Visão geral do estoque e dos sensores"
        action={
          <button
            className="button secondary"
            type="button"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw size={16} className={loading ? "spin" : ""} /> Atualizar
          </button>
        }
      />
      {error && <ErrorState error={error} onRetry={refreshData} />}
      <div className="stats-grid">
        <StatCard
          icon={Warehouse}
          label="Prateleiras"
          value={loading ? "—" : shelves.length}
          description="cadastradas"
          tone="blue"
        />
        <StatCard
          icon={Package}
          label="Produtos"
          value={loading ? "—" : products.length}
          description="monitorados"
          tone="red"
        />
        <StatCard
          icon={SlidersHorizontal}
          label="Estoque baixo"
          value={loading ? "—" : lowStock}
          description="produtos"
          tone="amber"
        />
        <StatCard
          icon={Bell}
          label="Alertas ativos"
          value={loading ? "—" : activeAlerts}
          description="requerem atenção"
          tone="rose"
        />
      </div>
      <IoTStatus
        loading={loading}
        error={error}
        latestReadingAt={latestReadingAt}
      />
      <div className="dashboard-grid primary-grid">
        <StockChart />
        <ShelfSummary shelves={shelves} loading={loading} />
      </div>
      <div className="dashboard-grid secondary-grid">
        <RecentAlerts
          alerts={alerts}
          loading={loading}
          onView={setSelectedAlert}
        />
        <RecentReadings history={history} loading={loading} />
      </div>
      {selectedAlert && (
        <AlertModal
          alert={selectedAlert}
          onClose={() => setSelectedAlert(null)}
        />
      )}
    </div>
  );
}

function AlertModal({ alert, onClose }) {
  return (
    <Modal title={alert.message} onClose={onClose}>
      <div className="detail-list">
        <div>
          <span>Tipo</span>
          <strong>{alert.type || "Alerta"}</strong>
        </div>
        <div>
          <span>Prateleira</span>
          <strong>{alert.shelf}</strong>
        </div>
        <div>
          <span>Produto</span>
          <strong>{alert.product}</strong>
        </div>
        <div>
          <span>Data</span>
          <strong>
            {alert.date
              ? new Date(alert.date).toLocaleString("pt-BR")
              : alert.time}
          </strong>
        </div>
        <div>
          <span>Status</span>
          <StatusBadge status={alert.resolved ? "success" : alert.severity} />
        </div>
      </div>
    </Modal>
  );
}

function ShelfCard({ shelf, onView }) {
  return (
    <article className="shelf-card">
      <div className="shelf-card-head">
        <div className={`shelf-card-icon ${shelf.status}`}>
          <Warehouse size={19} />
        </div>
        <StatusBadge status={shelf.status} />
      </div>
      <h3>{shelf.id}</h3>
      <p className="shelf-location">{shelf.location}</p>
      <div className="shelf-card-details">
        <span>
          Produto <b>{shelf.primaryProduct || "—"}</b>
        </span>
        <span>
          Peso <b>{formatWeight(shelf.weight)}</b>
        </span>
        <span>
          Quantidade <b>{shelf.level == null ? "—" : shelf.quantity}</b>
        </span>
        <span>
          Capacidade <b>{shelf.capacity} kg</b>
        </span>
      </div>
      <div className="progress-row">
        {shelf.level == null ? (
          <span className="no-reading-label">
            Sensor aguardando primeira leitura
          </span>
        ) : (
          <>
            <ProgressBar
              value={shelf.level}
              status={shelf.status}
              label={`Uso da ${shelf.id}`}
            />
            <strong>{shelf.level}%</strong>
          </>
        )}
      </div>
      <small className="last-reading">Última leitura: {shelf.updated}</small>
      <button
        className="button secondary full"
        type="button"
        onClick={() => onView(shelf)}
      >
        Ver detalhes <ChevronRight size={15} />
      </button>
    </article>
  );
}

function ShelvesPage() {
  const { shelves, loading, error } = useSmartShelfData();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const shown =
    filter === "all"
      ? shelves
      : shelves.filter((shelf) => shelf.status === filter);
  return (
    <div className="page-content">
      <PageHeader
        title="Prateleiras"
        description="Ocupação, capacidade e estado dos sensores"
        action={
          <button
            className="button secondary"
            type="button"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        }
      />
      {error && <ErrorState error={error} onRetry={refreshData} />}
      <div
        className="filter-tabs"
        role="group"
        aria-label="Filtrar prateleiras"
      >
        {[
          ["all", "Todas"],
          ["normal", "Normal"],
          ["attention", "Atenção"],
          ["critical", "Crítico"],
          ["no-reading", "Sem leitura"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            className={filter === value ? "active" : ""}
            onClick={() => setFilter(value)}
          >
            {label}
            <span>
              {value === "all"
                ? shelves.length
                : shelves.filter((shelf) => shelf.status === value).length}
            </span>
          </button>
        ))}
      </div>
      <div className="shelf-grid">
        {loading ? (
          <LoadingState label="Carregando prateleiras..." />
        ) : (
          shown.map((shelf) => (
            <ShelfCard key={shelf.rawId} shelf={shelf} onView={setSelected} />
          ))
        )}
      </div>
      {!loading && !shown.length && (
        <EmptyState
          icon={Warehouse}
          title="Nenhuma prateleira encontrada"
          description={
            shelves.length
              ? "Tente outro filtro."
              : "Nenhuma prateleira foi retornada pelo Supabase."
          }
        />
      )}
      {selected && (
        <Modal title={selected.id} onClose={() => setSelected(null)}>
          <div className="detail-level">
            {selected.level == null ? "Sem leitura" : `${selected.level}%`}
          </div>
          <div className="detail-list">
            <div>
              <span>Localização</span>
              <strong>{selected.location}</strong>
            </div>
            <div>
              <span>Produto</span>
              <strong>{selected.primaryProduct || "—"}</strong>
            </div>
            <div>
              <span>Peso</span>
              <strong>{formatWeight(selected.weight)}</strong>
            </div>
            <div>
              <span>Capacidade</span>
              <strong>{selected.capacity} kg</strong>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

function ProductsPage() {
  const { products, loading, error } = useSmartShelfData();
  return (
    <div className="page-content">
      <PageHeader
        title="Produtos"
        description="Produtos ativos relacionados às prateleiras"
        action={
          <button
            className="button secondary"
            type="button"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        }
      />
      {error && <ErrorState error={error} onRetry={refreshData} />}
      <section className="panel table-panel">
        {loading ? (
          <LoadingState label="Carregando produtos..." />
        ) : products.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Produto</th>
                  <th>Código</th>
                  <th>Prateleira</th>
                  <th>Peso atual</th>
                  <th>Quantidade</th>
                  <th>Estoque mínimo</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <strong>{product.name}</strong>
                    </td>
                    <td>{product.code}</td>
                    <td>{product.shelf}</td>
                    <td>{formatWeight(product.weight)}</td>
                    <td>
                      {product.quantity == null
                        ? "—"
                        : `${product.quantity} un.`}
                    </td>
                    <td>{product.minimum || "—"}</td>
                    <td>
                      <StatusBadge
                        status={
                          !product.hasReading
                            ? "no-reading"
                            : product.lowStock
                              ? "critical"
                              : "normal"
                        }
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Package}
            title="Nenhum produto cadastrado"
            description="Os produtos ativos aparecerão aqui após serem cadastrados no Supabase."
          />
        )}
      </section>
    </div>
  );
}

function AlertsPage() {
  const { alerts, loading, error } = useSmartShelfData();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const [resolving, setResolving] = useState(null);
  const [actionError, setActionError] = useState("");
  const shown = alerts.filter(
    (alert) =>
      filter === "all" ||
      (filter === "active" ? !alert.resolved : alert.resolved),
  );
  const handleResolve = async (id) => {
    setActionError("");
    setResolving(id);
    try {
      await resolveAlert(id);
    } catch (resolveError) {
      setActionError(
        resolveError?.message || "Não foi possível resolver o alerta.",
      );
    } finally {
      setResolving(null);
    }
  };
  return (
    <div className="page-content">
      <PageHeader
        title="Alertas"
        description="Monitoramento de eventos do SmartShelf"
        action={
          <button
            className="button secondary"
            type="button"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        }
      />
      {error && <ErrorState error={error} onRetry={refreshData} />}
      {actionError && (
        <div className="error-state" role="alert">
          <AlertTriangle size={20} />
          <span>{actionError}</span>
        </div>
      )}
      <div className="filter-tabs" role="group" aria-label="Filtrar alertas">
        {[
          ["all", "Todos"],
          ["active", "Ativos"],
          ["resolved", "Resolvidos"],
        ].map(([value, label]) => (
          <button
            key={value}
            type="button"
            aria-pressed={filter === value}
            className={filter === value ? "active" : ""}
            onClick={() => setFilter(value)}
          >
            {label}
            <span>
              {value === "all"
                ? alerts.length
                : alerts.filter((alert) =>
                    value === "active" ? !alert.resolved : alert.resolved,
                  ).length}
            </span>
          </button>
        ))}
      </div>
      <section className="panel table-panel">
        {loading ? (
          <LoadingState label="Carregando alertas..." />
        ) : shown.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Tipo</th>
                  <th>Mensagem</th>
                  <th>Prateleira</th>
                  <th>Produto</th>
                  <th>Data</th>
                  <th>Status</th>
                  <th>Ação</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((alert) => (
                  <tr key={alert.id}>
                    <td>{alert.type || "Alerta"}</td>
                    <td>{alert.message}</td>
                    <td>{alert.shelf}</td>
                    <td>{alert.product}</td>
                    <td>
                      {alert.date
                        ? new Date(alert.date).toLocaleString("pt-BR")
                        : alert.time}
                    </td>
                    <td>
                      <StatusBadge
                        status={alert.resolved ? "success" : alert.severity}
                      />
                    </td>
                    <td>
                      <div className="action-row">
                        <button
                          className="button small secondary"
                          type="button"
                          onClick={() => setSelected(alert)}
                        >
                          Ver
                        </button>
                        {!alert.resolved && (
                          <button
                            className="button small danger"
                            type="button"
                            disabled={resolving === alert.id}
                            onClick={() => handleResolve(alert.id)}
                          >
                            <Check size={14} />
                            {resolving === alert.id
                              ? "Salvando..."
                              : "Resolver"}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={Check}
            title={
              filter === "active"
                ? "Nenhum alerta ativo"
                : "Nenhum alerta encontrado"
            }
            description={
              filter === "active"
                ? "Seu estoque está operando normalmente."
                : "Não há registros para este filtro."
            }
          />
        )}
      </section>
      {selected && (
        <AlertModal alert={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}

function HistoryPage() {
  const { history, shelves, products, loading, error } = useSmartShelfData();
  const [period, setPeriod] = useState("30");
  const [shelf, setShelf] = useState("Todas");
  const [product, setProduct] = useState("Todos");
  const cutoff = Date.now() - Number(period) * 86400000;
  const filtered = history.filter(
    (item) =>
      new Date(item.timestamp).getTime() >= cutoff &&
      (shelf === "Todas" || item.shelf === shelf) &&
      (product === "Todos" || item.product === product),
  );
  return (
    <div className="page-content">
      <PageHeader
        title="Histórico"
        description="Leituras reais recebidas dos sensores"
        action={
          <button
            className="button secondary"
            type="button"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        }
      />
      {error && <ErrorState error={error} onRetry={refreshData} />}
      <div className="filters-card">
        <label>
          Período
          <select
            value={period}
            onChange={(event) => setPeriod(event.target.value)}
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
          </select>
        </label>
        <label>
          Prateleira
          <select
            value={shelf}
            onChange={(event) => setShelf(event.target.value)}
          >
            <option>Todas</option>
            {shelves.map((item) => (
              <option key={item.rawId}>{item.id}</option>
            ))}
          </select>
        </label>
        <label>
          Produto
          <select
            value={product}
            onChange={(event) => setProduct(event.target.value)}
          >
            <option>Todos</option>
            {products.map((item) => (
              <option key={item.id}>{item.name}</option>
            ))}
          </select>
        </label>
      </div>
      <section className="panel table-panel">
        <div className="section-heading compact">
          <div>
            <h3>Leituras registradas</h3>
            <p>{filtered.length} registros encontrados</p>
          </div>
        </div>
        {loading ? (
          <LoadingState label="Carregando histórico..." />
        ) : filtered.length ? (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Data/Hora</th>
                  <th>Prateleira</th>
                  <th>Produto</th>
                  <th>Peso</th>
                  <th>Quantidade</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filtered
                  .slice()
                  .reverse()
                  .map((item) => (
                    <tr key={item.id}>
                      <td>
                        {item.date} · {item.time}
                      </td>
                      <td>{item.shelf}</td>
                      <td>{item.product}</td>
                      <td>{formatWeight(item.weight)}</td>
                      <td>
                        {item.quantity == null ? "—" : `${item.quantity} un.`}
                      </td>
                      <td>
                        <StatusBadge
                          status={
                            item.status === "Crítico" ? "critical" : "normal"
                          }
                        />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            icon={History}
            title="Nenhuma leitura encontrada"
            description="Não há leituras para os filtros selecionados."
          />
        )}
      </section>
    </div>
  );
}

function SettingsPage() {
  const { shelves, products, alerts, loading, error, lastUpdated } =
    useSmartShelfData();
  let projectUrl = "Não configurado";
  try {
    projectUrl = new URL(import.meta.env.VITE_SUPABASE_URL).host;
  } catch {
    /* configuração ausente */
  }
  return (
    <div className="page-content">
      <PageHeader
        title="Configurações"
        description="Estado da conexão, hardware e dados do sistema"
        action={
          <button
            className="button secondary"
            type="button"
            onClick={refreshData}
            disabled={loading}
          >
            <RefreshCw size={16} /> Atualizar
          </button>
        }
      />
      {error && <ErrorState error={error} onRetry={refreshData} />}
      <div className="settings-grid">
        <section className="panel settings-section">
          <div className="section-heading">
            <div className="section-icon red">
              <Database size={18} />
            </div>
            <div>
              <h3>Conexão</h3>
              <p>Consulta REST ao projeto Supabase</p>
            </div>
          </div>
          <div className="settings-row">
            <span>Status</span>
            <StatusBadge
              status={error ? "critical" : loading ? "attention" : "normal"}
            />
          </div>
          <div className="settings-row">
            <span>Projeto</span>
            <strong>{projectUrl}</strong>
          </div>
          <div className="settings-row">
            <span>Última consulta</span>
            <strong>{formatTime(lastUpdated)}</strong>
          </div>
          <div className="settings-row">
            <span>Atualização automática</span>
            <strong>A cada 15 segundos</strong>
          </div>
        </section>
        <section className="panel settings-section">
          <div className="section-heading">
            <div className="section-icon blue">
              <Activity size={18} />
            </div>
            <div>
              <h3>Hardware</h3>
              <p>Configuração do protótipo IoT</p>
            </div>
          </div>
          <div className="settings-row">
            <span>Microcontrolador</span>
            <strong>ESP32</strong>
          </div>
          <div className="settings-row">
            <span>Conversor</span>
            <strong>HX711</strong>
          </div>
          <div className="settings-row">
            <span>GPIO DATA</span>
            <strong>4</strong>
          </div>
          <div className="settings-row">
            <span>GPIO CLOCK</span>
            <strong>5</strong>
          </div>
          <div className="settings-row">
            <span>Capacidade padrão</span>
            <strong>5 kg</strong>
          </div>
        </section>
        <section className="panel settings-section">
          <div className="section-heading">
            <div className="section-icon green">
              <Layers3 size={18} />
            </div>
            <div>
              <h3>Banco de dados</h3>
              <p>Registros ativos disponíveis no painel</p>
            </div>
          </div>
          <div className="settings-row">
            <span>Prateleiras</span>
            <strong>{shelves.length}</strong>
          </div>
          <div className="settings-row">
            <span>Produtos</span>
            <strong>{products.length}</strong>
          </div>
          <div className="settings-row">
            <span>Leituras carregadas</span>
            <strong>{loading ? "—" : "Disponíveis no histórico"}</strong>
          </div>
          <div className="settings-row">
            <span>Alertas</span>
            <strong>{alerts.length}</strong>
          </div>
        </section>
      </div>
    </div>
  );
}

function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="/dashboard" element={<Dashboard />} />
      <Route path="/prateleiras" element={<ShelvesPage />} />
      <Route path="/produtos" element={<ProductsPage />} />
      <Route path="/alertas" element={<AlertsPage />} />
      <Route path="/historico" element={<HistoryPage />} />
      <Route path="/configuracoes" element={<SettingsPage />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <Layout>
      <App />
    </Layout>
  </BrowserRouter>,
);
