import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "../lib/supabase";

let state = { shelves: [], products: [], alerts: [], history: [], chart7: [], chart30: [], notifications: [] };
const listeners = new Set();
let started = false;

const notify = () => listeners.forEach((listener) => listener());

const relativeTime = (value) => {
  const minutes = Math.floor(Math.max(0, Date.now() - new Date(value).getTime()) / 60000);
  if (minutes < 1) return "Agora";
  if (minutes < 60) return `${minutes} min atrás`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h atrás`;
  return `${Math.floor(hours / 24)} d atrás`;
};

function build(shelves, products, readings, alerts) {
  const latest = new Map();
  readings.forEach((reading) => latest.set(reading.prateleira_id, reading));

  const mappedShelves = shelves.map((shelf) => {
    const reading = latest.get(shelf.id);
    const shelfProducts = products.filter((product) => product.prateleira_id === shelf.id);
    const minimum = shelfProducts.reduce((sum, product) => sum + Number(product.estoque_minimo || 0), 0);
    const level = Math.round(Math.max(0, Math.min(100, (Number(reading?.peso_kg || 0) / Number(shelf.capacidade_kg || 5)) * 100)));
    const status = level <= 20 ? "critical" : level <= 40 ? "attention" : "normal";
    return { id: shelf.nome, products: shelfProducts.length, level, status, min: minimum, updated: reading ? relativeTime(reading.criado_em) : "Sem leitura", rawId: shelf.id };
  });

  const mappedProducts = products.map((product) => {
    const reading = [...readings].reverse().find((item) => item.produto_id === product.id);
    const shelf = shelves.find((item) => item.id === product.prateleira_id);
    const level = Math.round(Math.max(0, Math.min(100, (Number(reading?.peso_kg || 0) / Number(shelf?.capacidade_kg || 5)) * 100)));
    return { name: product.nome, shelf: shelf?.nome || "—", level, updated: reading ? relativeTime(reading.criado_em) : "Sem leitura" };
  });

  const mappedAlerts = alerts.map((alert) => ({
    id: alert.id,
    shelf: shelves.find((shelf) => shelf.id === alert.prateleira_id)?.nome || "—",
    message: alert.mensagem,
    time: relativeTime(alert.criado_em),
    severity: alert.tipo === "SOBREPESO" || alert.tipo === "SENSOR" ? "critical" : "attention",
    resolved: alert.resolvido,
  }));

  const history = [...readings].reverse().map((reading) => {
    const shelf = shelves.find((item) => item.id === reading.prateleira_id);
    const product = products.find((item) => item.id === reading.produto_id);
    const level = Math.round(Math.max(0, Math.min(100, (Number(reading.peso_kg || 0) / Number(shelf?.capacidade_kg || 5)) * 100)));
    return {
      date: new Date(reading.criado_em).toLocaleDateString("pt-BR"),
      time: new Date(reading.criado_em).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
      shelf: shelf?.nome || "—",
      product: product?.nome || "—",
      level,
      status: level <= 20 ? "Crítico" : level <= 40 ? "Atenção" : "Normal",
    };
  });

  const points = [...readings].slice(-30).map((reading) => ({
    name: new Date(reading.criado_em).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
    value: Math.round(Math.max(0, Math.min(100, (Number(reading.peso_kg || 0) / 5) * 100))),
  }));
  const chart30 = points.length ? points : [{ name: "Agora", value: 0 }];
  const chart7 = chart30.slice(-7);

  state = {
    shelves: mappedShelves,
    products: mappedProducts,
    alerts: mappedAlerts,
    history,
    chart7,
    chart30,
    notifications: mappedAlerts.slice(0, 5).map((alert) => ({
      title: alert.resolved ? "Alerta resolvido" : "Alerta ativo",
      body: `${alert.shelf}: ${alert.message}`,
      time: alert.time,
    })),
  };
  notify();
}

async function load() {
  const [shelves, products, readings, alerts] = await Promise.all([
    supabase.from("prateleiras").select("*").eq("ativo", true).order("criado_em"),
    supabase.from("produtos").select("*").eq("ativo", true).order("criado_em"),
    supabase.from("leituras").select("*").order("criado_em", { ascending: true }).limit(500),
    supabase.from("alertas").select("*").order("criado_em", { ascending: false }).limit(100),
  ]);
  const error = [shelves, products, readings, alerts].find((result) => result.error);
  if (error) {
    console.error("Erro ao carregar SmartShelf:", error.error);
    return;
  }
  build(shelves.data || [], products.data || [], readings.data || [], alerts.data || []);
}

function start() {
  if (started) return;
  started = true;
  load();
  ["prateleiras", "produtos", "leituras", "alertas"].forEach((table) => {
    supabase.channel(`smartshelf-${table}`).on("postgres_changes", { event: "*", schema: "public", table }, load).subscribe();
  });
}

export function useSmartShelfData() {
  useEffect(start, []);
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => listeners.delete(listener); },
    () => state,
    () => state,
  );
}

export async function resolveAlert(id) {
  const { error } = await supabase.from("alertas").update({ resolvido: true, resolvido_em: new Date().toISOString() }).eq("id", id);
  if (error) throw error;
}
