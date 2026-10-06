import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BrowserRouter,
  useLocation,
  Navigate,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";
import {
  LayoutDashboard,
  Warehouse,
  TriangleAlert,
  History,
  Settings,
  Bell,
  Package,
  Layers,
  Activity,
  ArrowUpRight,
  Menu,
  ChevronRight,
  X,
  CheckCircle2,
  Wifi,
  Radio,
  RefreshCw,
  Eye,
  Check,
  SlidersHorizontal,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useSmartShelfData, resolveAlert, refreshData } from "./data/useSmartShelfData";
import { StatusBadge, ProgressBar, IconButton } from "./components/atoms";
import "./styles.css";

function Modal({ children, onClose }) {
  useEffect(() => {
    const close = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", close);
    return () => document.removeEventListener("keydown", close);
  }, [onClose]);
  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <IconButton label="Fechar janela" className="close" onClick={onClose}>
          <X size={18} />
        </IconButton>
        {children}
      </div>
    </div>
  );
}
function ShelfModal({ shelf, onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="modal-kicker">DETALHES DA PRATELEIRA</div>
      <h2>Prateleira {shelf.id}</h2>
      <div className="detail-level">
        <strong>{shelf.level}%</strong>
        <span>Nível atual</span>
      </div>
      <ProgressBar
        value={shelf.level}
        status={shelf.status}
        label={`Nível da prateleira ${shelf.id}`}
      />
      <div className="detail-grid">
        <div>
          <small>Produtos</small>
          <b>{shelf.products} itens</b>
        </div>
        <div>
          <small>Nível mínimo</small>
          <b>{shelf.min}%</b>
        </div>
        <div>
          <small>Último monitoramento</small>
          <b>{shelf.updated}</b>
        </div>
        <div>
          <small>Status</small>
          <StatusBadge status={shelf.status} />
        </div>
      </div>
    </Modal>
  );
}
function AlertModal({ alert, onClose }) {
  return (
    <Modal onClose={onClose}>
      <div className="modal-kicker">DETALHES DO ALERTA</div>
      <h2>
        {alert.shelf} · {alert.message}
      </h2>
      <p className="muted">
        Este alerta foi registrado no banco de dados do SmartShelf.
      </p>
      <div className="detail-grid">
        <div>
          <small>Prateleira</small>
          <b>{alert.shelf}</b>
        </div>
        <div>
          <small>Quando</small>
          <b>{alert.time}</b>
        </div>
        <div>
          <small>Classificação</small>
          <StatusBadge status={alert.severity} />
        </div>
        <div>
          <small>Situação</small>
          <b>{alert.resolved ? "Resolvido" : "Pendente"}</b>
        </div>
      </div>
    </Modal>
  );
}
function Header({ onMenu }) {
  const [open, setOpen] = useState(false);
  return (
    <header>
      <button className="icon-btn menu-mobile" onClick={onMenu}>
        <Menu size={21} />
      </button>
      <div>
        <h1>
          {
            {
              "/dashboard": "Dashboard",
              "/prateleiras": "Prateleiras",
              "/alertas": "Alertas",
              "/historico": "Histórico",
              "/configuracoes": "Configurações",
            }[useLocation().pathname]
          }
        </h1>
        <p className="muted">
          {useLocation().pathname === "/dashboard"
            ? "Visão geral do monitoramento das prateleiras"
            : "Acompanhe e gerencie seus dados de estoque"}
        </p>
      </div>
      <div className="header-actions">
        <button className="notification-btn" onClick={() => setOpen(!open)}>
          <Bell size={19} />
          <i />
        </button>
        <div className="avatar">SS</div>
        <div className="header-user">
          <b>SmartShelf</b>
          <small>Dados do Supabase</small>
        </div>
        {open && <NotificationPanel />}
      </div>
    </header>
  );
}
function NotificationPanel() {
  const { notifications } = useSmartShelfData();
  return (
    <div className="notification-panel">
      <div className="panel-heading">
        <b>Notificações</b>
        <span>{notifications.filter((item) => item.title === "Alerta ativo").length} ativas</span>
      </div>
      {notifications.map((n, i) => (
        <div className="notification" key={i}>
          <span className={`notif-dot ${i === 0 ? "critical" : ""}`}>
            <Bell size={14} />
          </span>
          <div>
            <b>{n.title}</b>
            <small>{n.body}</small>
            <small className="muted">{n.time}</small>
          </div>
        </div>
      ))}
      <button className="text-btn">
        Ver todas as notificações <ChevronRight size={14} />
      </button>
    </div>
  );
}
function Sidebar({ open, onClose }) {
  const { alerts } = useSmartShelfData();
  const links = [
    ["/dashboard", "Dashboard", LayoutDashboard],
    ["/prateleiras", "Prateleiras", Warehouse],
    ["/alertas", "Alertas", TriangleAlert],
    ["/historico", "Histórico", History],
  ];
  return (
    <>
      <aside className={open ? "open" : ""}>
        <div className="sidebar-brand brand">
          <div className="brand-mark">
            <Layers size={19} />
          </div>
          <span>
            Smart<strong>Shelf</strong>
          </span>
        </div>
        <div className="sidebar-label">MENU PRINCIPAL</div>
        {links.map(([to, label, Icon]) => (
          <NavLink
            key={to}
            to={to}
            onClick={onClose}
            className={({ isActive }) => (isActive ? "active" : "")}
          >
            <Icon size={18} />
            {label}
            {label === "Alertas" && <span className="nav-count">{alerts.filter((alert) => !alert.resolved).length}</span>}
          </NavLink>
        ))}
        <div className="sidebar-label system">SISTEMA</div>
        <NavLink
          to="/configuracoes"
          onClick={onClose}
          className={({ isActive }) => (isActive ? "active" : "")}
        >
          <Settings size={18} />
          Configurações
        </NavLink>
        <div className="sidebar-bottom">
          <div className="side-user">
            <div className="avatar">SS</div>
            <div><b>SmartShelf</b><small>Protótipo IoT</small></div>
          </div>
          <button className="logout" onClick={refreshData}>
            <RefreshCw size={17} /> Atualizar dados
          </button>
        </div>
      </aside>
      {open && <div className="sidebar-backdrop" onClick={onClose} />}
    </>
  );
}
function Layout({ children }) {
  const [menu, setMenu] = useState(false);
  return (
    <div className="app-shell">
      <Sidebar open={menu} onClose={() => setMenu(false)} />
      <main>
        <Header onMenu={() => setMenu(true)} />
        {children}
      </main>
    </div>
  );
}
function StatCard({ icon: Icon, label, value, trend, accent }) {
  return (
    <div className="stat-card">
      <div className={`stat-icon ${accent}`}>
        <Icon size={19} />
      </div>
      <div className="stat-content">
        <span>{label}</span>
        <strong>{value}</strong>
        <small className={trend.startsWith("+") ? "positive" : ""}>
          {trend}
        </small>
      </div>
      <ArrowUpRight className="stat-arrow" size={16} />
    </div>
  );
}
function StockChart() {
  const { chart7, chart30 } = useSmartShelfData();
  const [period, setPeriod] = useState("7");
  const data = period === "7" ? chart7 : chart30;
  return (
    <div className="panel chart-panel">
      <div className="panel-title">
        <div>
          <h3>Monitoramento do estoque</h3>
          <p className="muted">Nível médio dos produtos</p>
        </div>
        <div className="segmented">
          <button
            className={period === "7" ? "selected" : ""}
            onClick={() => setPeriod("7")}
          >
            7 dias
          </button>
          <button
            className={period === "30" ? "selected" : ""}
            onClick={() => setPeriod("30")}
          >
            30 dias
          </button>
        </div>
      </div>
      <div className="chart">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="#e7eeeb"
            />
            <XAxis
              dataKey="name"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#84918d" }}
            />
            <YAxis
              domain={[0, 100]}
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 12, fill: "#84918d" }}
              tickFormatter={(v) => `${v}%`}
            />
            <Tooltip
              formatter={(v) => [`${v}%`, "Nível médio"]}
              contentStyle={{ borderRadius: 10, border: "1px solid #e4ece8" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke="#159a75"
              strokeWidth={3}
              dot={{ r: 4, fill: "#fff", stroke: "#159a75", strokeWidth: 2 }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
function RecentAlerts({ onView }) {
  const { alerts } = useSmartShelfData();
  return (
    <div className="panel">
      <div className="panel-title">
        <div>
          <h3>Alertas recentes</h3>
          <p className="muted">Acompanhe os últimos eventos</p>
        </div>
        <NavLink className="text-btn" to="/alertas">
          Ver todos <ChevronRight size={14} />
        </NavLink>
      </div>
      <div className="alert-list">
        {alerts.slice(0, 3).map((a) => (
          <div className="alert-row" key={a.id}>
            <span className={`alert-icon ${a.severity}`}>
              {a.severity === "success" ? (
                <CheckCircle2 size={17} />
              ) : (
                <TriangleAlert size={17} />
              )}
            </span>
            <div className="alert-info">
              <b>Prateleira {a.shelf}</b>
              <span>{a.message}</span>
            </div>
            <div className="alert-time">{a.time}</div>
            <button className="mini-btn" onClick={() => onView(a)}>
              <Eye size={15} /> Visualizar
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
function Dashboard() {
  const [alert, setAlert] = useState(null);
  const { shelves, products, alerts, loading, error, lastUpdated } = useSmartShelfData();
  const lowStockCount = products.filter((product) => product.lowStock).length;
  const activeAlerts = alerts.filter((item) => !item.resolved).length;
  return (
    <div className="content">
      {error && <div className="error connection-error" role="alert"><strong>Falha ao consultar o Supabase.</strong><span>{error}</span><button className="btn outline" onClick={refreshData} disabled={loading}>Tentar novamente</button></div>}
      <div className="stats-grid">
        <StatCard icon={Package} label="Produtos monitorados" value={products.length} trend="Produtos ativos no banco" accent="teal" />
        <StatCard icon={Warehouse} label="Prateleiras monitoradas" value={shelves.length} trend="Prateleiras ativas no banco" accent="blue" />
        <StatCard icon={TriangleAlert} label="Produtos com estoque baixo" value={lowStockCount} trend="Calculado pelas leituras" accent="orange" />
        <StatCard icon={Bell} label="Alertas ativos" value={activeAlerts} trend="Ocorrências não resolvidas" accent="red" />
      </div>
      <div className="iot-banner">
        <div className="iot-icon"><Radio size={20} /></div>
        <div><b>Monitoramento SmartShelf <span className="live-dot" /> {loading ? "Atualizando..." : "Consulta ao Supabase"}</b>
          <p>Os dados são consultados no Supabase e atualizados automaticamente a cada 15 segundos.{lastUpdated ? " Última atualização: " + new Date(lastUpdated).toLocaleTimeString("pt-BR") + "." : ""}</p>
        </div>
        <div className="iot-flow"><span>SENSOR</span><i>→</i><span>ESP32</span><i>→</i><span>SUPABASE</span><i>→</i><span>PAINEL</span></div>
      </div>
      <div className="dashboard-grid">
        <StockChart />
        <div className="panel shelf-status">
          <div className="panel-title"><div><h3>Status das prateleiras</h3><p className="muted">Visão por nível de estoque</p></div><NavLink className="text-btn" to="/prateleiras">Ver todas <ChevronRight size={14} /></NavLink></div>
          {shelves.map((s) => <div className="shelf-row" key={s.rawId}><div className="shelf-name"><span className={"shelf-dot " + s.status} /><b>{s.id}</b><small>{s.products} produtos</small></div><div className="level-wrap"><div className="progress"><i className={s.status} style={{ width: s.level + "%" }} /></div><strong>{s.level}%</strong></div><StatusBadge status={s.status} /></div>)}
          {!shelves.length && !loading && <div className="empty">Nenhuma prateleira cadastrada no Supabase.</div>}
        </div>
      </div>
      <div className="dashboard-grid lower">
        <RecentAlerts onView={setAlert} />
        <div className="panel"><div className="panel-title"><div><h3>Atividade recente</h3><p className="muted">Produtos e últimas leituras recebidas</p></div><Activity size={19} className="muted" /></div>
          <div className="table-scroll"><table><thead><tr><th>Produto</th><th>Prateleira</th><th>Quantidade</th><th>Nível</th><th>Atualização</th></tr></thead><tbody>
            {products.map((p) => <tr key={p.id}><td><b>{p.name}</b></td><td>{p.shelf}</td><td>{p.quantity == null ? "—" : p.quantity}</td><td><span className={"level-text " + (p.lowStock ? "danger" : "")}>{p.level}%</span></td><td className="muted">{p.updated}</td></tr>)}
          </tbody></table></div>{!products.length && !loading && <div className="empty">Nenhum produto cadastrado.</div>}
        </div>
      </div>
      {alert && <AlertModal alert={alert} onClose={() => setAlert(null)} />}
    </div>
  );
}
function Shelves() {
  const { shelves } = useSmartShelfData();
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const shown =
    filter === "all" ? shelves : shelves.filter((s) => s.status === filter);
  return (
    <div className="content">
      <div className="page-intro">
        <div>
          <h2>Prateleiras</h2>
          <p className="muted">
            Gerencie e acompanhe todas as prateleiras inteligentes.
          </p>
        </div>
        <button className="btn outline" onClick={refreshData}>
          <RefreshCw size={16} /> Atualizar dados
        </button>
      </div>
      <div className="filter-tabs">
        {[
          ["all", "Todas"],
          ["normal", "Normal"],
          ["attention", "Atenção"],
          ["critical", "Crítico"],
        ].map(([v, l]) => (
          <button
            key={v}
            className={filter === v ? "active" : ""}
            onClick={() => setFilter(v)}
          >
            {l}
            <span>
              {v === "all"
                ? shelves.length
                : shelves.filter((s) => s.status === v).length}
            </span>
          </button>
        ))}
      </div>
      <div className="shelf-cards">
        {shown.map((s) => (
          <div className="shelf-card" key={s.id}>
            <div className="card-top">
              <div className={`shelf-big-icon ${s.status}`}>
                <Warehouse size={21} />
              </div>
              <StatusBadge status={s.status} />
            </div>
            <h3>Prateleira {s.id}</h3>
            <div className="big-level">{s.level}%</div>
            <div className="progress large">
              <i className={s.status} style={{ width: `${s.level}%` }} />
            </div>
            <div className="shelf-meta">
              <span>
                <Package size={15} /> {s.products} produtos
              </span>
              <span>
                <RefreshCw size={14} /> {s.updated}
              </span>
            </div>
            <button className="btn outline full" onClick={() => setSelected(s)}>
              Ver detalhes <ChevronRight size={15} />
            </button>
          </div>
        ))}
      </div>
      {!shown.length && (
        <div className="empty">
          <SlidersHorizontal size={28} />
          <b>Nenhuma prateleira encontrada</b>
          <span>Tente outro filtro.</span>
        </div>
      )}
      {selected && (
        <ShelfModal shelf={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
function Alerts() {
  const { alerts } = useSmartShelfData();
  const [items, setItems] = useState(alerts);
  useEffect(() => setItems(alerts), [alerts]);
  const [filter, setFilter] = useState("all");
  const [selected, setSelected] = useState(null);
  const shown = items.filter(
    (a) =>
      filter === "all" ||
      (filter === "resolved"
        ? a.resolved
        : a.severity === filter && !a.resolved),
  );
  return (
    <div className="content">
      <div className="page-intro">
        <div>
          <h2>Alertas</h2>
          <p className="muted">
            Acompanhe ocorrências e mantenha seu estoque em dia.
          </p>
        </div>
        <div className="alert-summary">
          <b>{items.filter((a) => !a.resolved).length}</b> alertas pendentes
        </div>
      </div>
      <div className="filter-tabs">
        {[
          ["all", "Todos"],
          ["critical", "Críticos"],
          ["attention", "Atenção"],
          ["resolved", "Resolvidos"],
        ].map(([v, l]) => (
          <button
            key={v}
            className={filter === v ? "active" : ""}
            onClick={() => setFilter(v)}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="panel table-panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Prateleira</th>
                <th>Mensagem</th>
                <th>Status</th>
                <th>Ação</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((a) => (
                <tr key={a.id}>
                  <td className="muted">{a.time}</td>
                  <td>
                    <b>{a.shelf}</b>
                  </td>
                  <td>{a.message}</td>
                  <td>
                    <StatusBadge status={a.resolved ? "success" : a.severity} />
                  </td>
                  <td>
                    <div className="action-row">
                      <button
                        className="mini-btn"
                        onClick={() => setSelected(a)}
                      >
                        <Eye size={15} /> Ver
                      </button>
                      {!a.resolved && (
                        <button
                          className="resolve-btn"
                          onClick={() =>
                            resolveAlert(a.id).catch((error) =>
                              console.error("Erro ao resolver alerta:", error),
                            )
                          }
                        >
                          <Check size={15} /> Resolver
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!shown.length && (
          <div className="empty">Nenhum alerta neste filtro.</div>
        )}
      </div>
      {selected && (
        <AlertModal alert={selected} onClose={() => setSelected(null)} />
      )}
    </div>
  );
}
function HistoryPage() {
  const { history, shelves } = useSmartShelfData();
  const [shelf, setShelf] = useState("Todas");
  const data = history.filter((h) => shelf === "Todas" || h.shelf === shelf);
  return (
    <div className="content">
      <div className="page-intro">
        <div>
          <h2>Histórico de Monitoramento</h2>
          <p className="muted">Consulte as leituras registradas no Supabase.</p>
        </div>
        <div className="history-filters">
          <select>
            <option>Últimos 30 dias</option>
            <option>Últimos 7 dias</option>
          </select>
          <select value={shelf} onChange={(e) => setShelf(e.target.value)}>
            <option>Todas</option>
            {shelves.slice(0, 4).map((s) => (
              <option key={s.id}>{s.id}</option>
            ))}
          </select>
        </div>
      </div>
      <StockChart />
      <div className="panel table-panel history-table">
        <div className="panel-title">
          <h3>Registros de leitura</h3>
          <span className="muted">{data.length} registros</span>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Data</th>
                <th>Horário</th>
                <th>Prateleira</th>
                <th>Produto</th>
                <th>Nível</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.map((h, i) => (
                <tr key={i}>
                  <td>{h.date}</td>
                  <td className="muted">{h.time}</td>
                  <td>
                    <b>{h.shelf}</b>
                  </td>
                  <td>{h.product}</td>
                  <td>{h.level}%</td>
                  <td>
                    <StatusBadge
                      status={
                        h.status === "Normal"
                          ? "normal"
                          : h.status === "Atenção"
                            ? "attention"
                            : "critical"
                      }
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
function SettingsPage() {
  const [saved, setSaved] = useState(false);
  const [name, setName] = useState(
    localStorage.getItem("smartshelf-name") || "Administrador",
  );
  const save = (e) => {
    e.preventDefault();
    localStorage.setItem("smartshelf-name", name);
    setSaved(true);
    setTimeout(() => setSaved(false), 2200);
  };
  return (
    <div className="content">
      <div className="page-intro">
        <div>
          <h2>Configurações</h2>
          <p className="muted">Personalize sua experiência no SmartShelf.</p>
        </div>
      </div>
      <form className="settings-grid" onSubmit={save}>
        <div className="panel settings-section">
          <div className="section-heading">
            <div className="settings-icon">
              <Settings size={18} />
            </div>
            <div>
              <h3>Perfil</h3>
              <p className="muted">Informações da sua conta</p>
            </div>
          </div>
          <label>
            Nome
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </label>
          <label>
            E-mail
            <input value="admin@smartshelf.com" readOnly />
          </label>
        </div>
        <div className="panel settings-section">
          <div className="section-heading">
            <div className="settings-icon">
              <Bell size={18} />
            </div>
            <div>
              <h3>Preferências</h3>
              <p className="muted">Escolha como deseja receber atualizações</p>
            </div>
          </div>
          {[
            "Receber alertas de estoque",
            "Notificações no navegador",
            "Atualização automática dos dados",
          ].map((x, i) => (
            <label className="toggle-row" key={x}>
              <span>
                <b>{x}</b>
                <small>
                  {i === 0
                    ? "Seja avisado quando o estoque estiver baixo"
                    : i === 1
                      ? "Receba novidades importantes do sistema"
                      : "Atualizar leituras a cada 5 minutos"}
                </small>
              </span>
              <input type="checkbox" defaultChecked={i !== 1} />
              <i />
            </label>
          ))}
        </div>
        <div className="settings-actions">
          <button className="btn primary" type="submit">
            {saved ? (
              <>
                <Check size={16} /> Alterações salvas
              </>
            ) : (
              "Salvar alterações"
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
function Protected() {
  return localStorage.getItem("smartshelf-auth") ? (
    <Layout>
      <Routes>
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/prateleiras" element={<Shelves />} />
        <Route path="/alertas" element={<Alerts />} />
        <Route path="/historico" element={<HistoryPage />} />
        <Route path="/configuracoes" element={<SettingsPage />} />
      </Routes>
    </Layout>
  ) : (
    <Navigate to="/login" replace />
  );
}
function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        path="/"
        element={
          <Navigate
            to={
              localStorage.getItem("smartshelf-auth") ? "/dashboard" : "/login"
            }
            replace
          />
        }
      />
      <Route path="*" element={<Protected />} />
    </Routes>
  );
}
createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
);
