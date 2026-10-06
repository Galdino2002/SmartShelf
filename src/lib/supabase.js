const url =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://jcobchoqoahrecsyshtk.supabase.co";
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || "";

const channelNoop = {
  on() {
    return this;
  },
  subscribe() {
    return { unsubscribe() {} };
  },
};

function encodeFilterValue(value) {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "true" : "false";
  return String(value);
}

async function request(table, { method = "GET", query = {}, body } = {}) {
  if (!key) {
    return {
      data: null,
      error: { message: "VITE_SUPABASE_PUBLISHABLE_KEY não configurada." },
    };
  }

  const endpoint = new URL(`${url}/rest/v1/${table}`);
  Object.entries(query).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "")
      endpoint.searchParams.set(k, v);
  });

  try {
    const response = await fetch(endpoint.toString(), {
      method,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
        ...(method === "PATCH" ? { Prefer: "return=representation" } : {}),
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    const text = await response.text();
    const payload = text ? JSON.parse(text) : null;

    if (!response.ok) {
      return {
        data: null,
        error: payload || { message: `Erro HTTP ${response.status}` },
      };
    }

    return { data: payload, error: null };
  } catch (error) {
    return { data: null, error };
  }
}

class QueryBuilder {
  constructor(table) {
    this.table = table;
    this.query = {};
    this.method = "GET";
    this.body = undefined;
  }

  select(columns = "*") {
    this.query.select = columns;
    this.method = "GET";
    return this;
  }

  update(values) {
    this.method = "PATCH";
    this.body = values;
    return this;
  }

  eq(column, value) {
    this.query[column] = `eq.${encodeFilterValue(value)}`;
    return this;
  }

  order(column, options = {}) {
    const ascending = options.ascending !== false;
    this.query.order = `${column}.${ascending ? "asc" : "desc"}`;
    return this;
  }

  limit(value) {
    this.query.limit = String(value);
    return this;
  }

  async execute() {
    return request(this.table, {
      method: this.method,
      query: this.query,
      body: this.body,
    });
  }

  then(resolve, reject) {
    return this.execute().then(resolve, reject);
  }
}

export const supabase = {
  from(table) {
    return new QueryBuilder(table);
  },
  channel() {
    return channelNoop;
  },
};
