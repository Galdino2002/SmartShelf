import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "../lib/supabase";

let state = {
  shelves: [],
  products: [],
  alerts: [],
  history: [],
  chart7: [],
  chart30: [],
  notifications: [],
  loading: true,
  error: null,
  lastUpdated: null,
};
const listeners = new Set();
let started = false;
let pollIntervalId = null;
let loadingPromise = null;

const notify = () => listeners.forEach((listener) => listener());

const relativeTime = (value) => {
  if (!value) return "Sem leitura";
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return "Data indisponível";
  const minutes = Math.floor(Math.max(0, Date.now() - timestamp) / 60000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;
  return `${Math.floor(hours / 24)} d atrás`;
};

const clampPercent = (value) => Math.round(Math.max(0, Math.min(100, value)));

function build(shelves, products, readings, alerts) {
  const latestByShelf = new Map();
  const latestByProduct = new Map();

  readings.forEach((reading) => {
    if (!latestByShelf.has(reading.prateleira_id)) {
      latestByShelf.set(reading.prateleira_id, reading);
    }
    if (reading.produto_id && !latestByProduct.has(reading.produto_id)) {
      latestByProduct.set(reading.produto_id, reading);
    }
  });

  const mappedProducts = products.map((product) => {
    const reading = latestByProduct.get(product.id);
    const shelf = shelves.find((item) => item.id === product.prateleira_id);
    const weight = Number(reading?.peso_kg ?? 0);
    const unitWeight = Number(product.peso_unitario_kg ?? 0);
    const quantity =
      reading?.quantidade_estimada != null
        ? Number(reading.quantidade_estimada)
        : unitWeight > 0
          ? Math.floor(weight / unitWeight)
          : null;
    const level = clampPercent(
      (weight / Number(shelf?.capacidade_kg || 5)) * 100,
    );
    return {
      id: product.id,
      name: product.nome,
      code: product.codigo || "—",
      shelf: shelf?.nome || "—",
      shelfId: product.prateleira_id,
      weight,
      unitWeight,
      quantity,
      minimum: Number(product.estoque_minimo || 0),
      lowStock: quantity != null && quantity <= Number(product.estoque_minimo || 0),
      level,
      updated: reading ? relativeTime(reading.criado_em) : "Sem leitura",
      readingAt: reading?.criado_em || null,
    };
  });

  const mappedShelves = shelves.map((shelf) => {
    const reading = latestByShelf.get(shelf.id);
    const shelfProducts = mappedProducts.filter(
      (product) => product.shelfId === shelf.id,
    );
    const weight = Number(reading?.peso_kg ?? 0);
    const capacity = Number(shelf.capacidade_kg || 5);
    const level = clampPercent((weight / capacity) * 100);
    const hasLowStock = shelfProducts.some((product) => product.lowStock);
    const status = hasLowStock
      ? "critical"
      : level >= 90
        ? "attention"
        : "normal";

    return {
      id: shelf.nome,
      rawId: shelf.id,
      location: shelf.localizacao || "Local não informado",
      capacity,
      weight,
      products: shelfProducts.length,
      quantity: shelfProducts.reduce(
        (sum, product) => sum + (product.quantity ?? 0),
        0,
      ),
      level,
      status,
      min: shelfProducts.reduce((sum, product) => sum + product.minimum, 0),
      updated: reading ? relativeTime(reading.criado_em) : "Sem leitura",
      readingAt: reading?.criado_em || null,
    };
  });

  const mappedAlerts = alerts.map((alert) => ({
    id: alert.id,
    shelf:
      shelves.find((shelf) => shelf.id === alert.prateleira_id)?.nome || "—",
    message: alert.mensagem,
    time: relativeTime(alert.criado_em),
    date: alert.criado_em,
    type: alert.tipo,
    severity:
      alert.tipo === "SOBREPESO" || alert.tipo === "SENSOR"
        ? "critical"
        : "attention",
    resolved: Boolean(alert.resolvido),
  }));

  const shelfById = new Map(shelves.map((shelf) => [shelf.id, shelf]));
  const productById = new Map(products.map((product) => [product.id, product]));
  const history = readings.map((reading) => {
    const shelf = shelfById.get(reading.prateleira_id);
    const product = productById.get(reading.produto_id);
    const capacity = Number(shelf?.capacidade_kg || 5);
    const weight = Number(reading.peso_kg || 0);
    const quantity =
      reading.quantidade_estimada ??
      (Number(product?.peso_unitario_kg || 0) > 0
        ? Math.floor(weight / Number(product.peso_unitario_kg))
        : null);
    const lowStock =
      quantity != null && quantity <= Number(product?.estoque_minimo || 0);

    return {
      id: reading.id,
      date: new Date(reading.criado_em).toLocaleDateString("pt-BR"),
      time: new Date(reading.criado_em).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      timestamp: reading.criado_em,
      shelf: shelf?.nome || "—",
      product: product?.nome || "—",
      weight,
      quantity,
      level: clampPercent((weight / capacity) * 100),
      status: lowStock ? "Crítico" : "Normal",
    };
  });

  const points = readings.map((reading) => {
    const shelf = shelfById.get(reading.prateleira_id);
    return {
      name: new Date(reading.criado_em).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      }),
      value: clampPercent(
        (Number(reading.peso_kg || 0) / Number(shelf?.capacidade_kg || 5)) *
          100,
      ),
    };
  });

  state = {
    shelves: mappedShelves,
    products: mappedProducts,
    alerts: mappedAlerts,
    history,
    chart7: points.slice(-7),
    chart30: points.slice(-30),
    notifications: mappedAlerts.slice(0, 5).map((alert) => ({
      title: alert.resolved ? "Alerta resolvido" : "Alerta ativo",
      body: `${alert.shelf}: ${alert.message}`,
      time: alert.time,
      severity: alert.severity,
    })),
    loading: false,
    error: null,
    lastUpdated: new Date().toISOString(),
  };
  notify();
}

export async function refreshData() {
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    state = { ...state, loading: true, error: null };
    notify();

    const results = await Promise.all([
      supabase
        .from("prateleiras")
        .select("*")
        .eq("ativo", true)
        .order("criado_em"),
      supabase
        .from("produtos")
        .select("*")
        .eq("ativo", true)
        .order("criado_em"),
      supabase
        .from("leituras")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(500),
      supabase
        .from("alertas")
        .select("*")
        .order("criado_em", { ascending: false })
        .limit(100),
    ]);

    const failed = results.find((result) => result.error);
    if (failed) {
      const message =
        failed.error?.message ||
        failed.error?.details ||
        "Não foi possível consultar o Supabase.";
      state = { ...state, loading: false, error: message };
      notify();
      loadingPromise = null;
      return;
    }

    const [shelvesResult, productsResult, readingsResult, alertsResult] =
      results;
    const readings = [...(readingsResult.data || [])].sort(
      (a, b) => new Date(a.criado_em) - new Date(b.criado_em),
    );

    build(
      shelvesResult.data || [],
      productsResult.data || [],
      readings,
      alertsResult.data || [],
    );
    loadingPromise = null;
  })().catch((error) => {
    state = {
      ...state,
      loading: false,
      error: error?.message || "Falha inesperada ao carregar os dados.",
    };
    notify();
    loadingPromise = null;
  });

  return loadingPromise;
}

function start() {
  if (started) return;
  started = true;
  refreshData();
  pollIntervalId = setInterval(refreshData, 15000);
}

export function useSmartShelfData() {
  useEffect(start, []);
  return useSyncExternalStore(
    (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    () => state,
    () => state,
  );
}

export async function resolveAlert(id) {
  const { error } = await supabase
    .from("alertas")
    .update({ resolvido: true, resolvido_em: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
  await refreshData();
}
