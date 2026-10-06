# SmartShelf

Protótipo de prateleira inteligente com React, Supabase, ESP32 e HX711.

## Desenvolvimento

```bash
npm install
npm run dev
```

Crie um `.env.local` a partir de `.env.example` e informe a chave publishable do projeto Supabase.

## Banco

O dashboard usa as tabelas `prateleiras`, `produtos`, `leituras` e `alertas`.

A tela é atualizada em tempo real quando uma leitura do ESP32 entra em `leituras`.

## Hardware

ESP32 + HX711:
- DT: GPIO 4
- SCK: GPIO 5

Fluxo:

ESP32 + HX711 -> Supabase -> PostgreSQL -> Dashboard SmartShelf
