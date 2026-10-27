# SmartShelf

Protótipo IoT de prateleira inteligente com React, Supabase, ESP32 e HX711.

## Fluxo da demonstração

ESP32 alimentado pelo USB do computador → HX711/célula de carga → Wi-Fi 2,4 GHz → Supabase REST/PostgreSQL → painel web (atualiza a cada 15 segundos).

## 1. Executar o painel

Requer Node.js 20 ou 22 e npm.

```bash
npm ci
npm run dev
```

Crie `.env.local` a partir de `.env.example` e configure:

```env
VITE_SUPABASE_URL=https://jcobchoqoahrecsyshtk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_sua_chave
```

A chave publishable pode estar no frontend, mas a autorização real depende das políticas RLS. Nunca use uma chave secret/service_role no navegador ou no ESP32.

## 2. Configurar o ESP32

Arquivo: [hardware/esp32/SmartShelf.ino](hardware/esp32/SmartShelf.ino).

1. Instale a Arduino IDE 2 e o suporte à placa ESP32.
2. Instale a biblioteca **HX711** de Bogdan Necula/Bogde (versão 0.7.5 ou compatível).
3. Na pasta `hardware/esp32`, copie `secrets.h.example` para `secrets.h`.
4. Edite `secrets.h` localmente e preencha SSID, senha do Wi-Fi 2,4 GHz e chave publishable.
5. Não faça commit de `secrets.h`; ele está no `.gitignore`.
6. Selecione a placa e a porta COM, carregue o sketch e abra o Monitor Serial em **115200 baud**.
7. Durante a inicialização, deixe a plataforma vazia para a tara.

O firmware lê a balança a cada 5 segundos e envia para `public.leituras`. O Monitor Serial mostra mensagens `PESO`, conexão Wi-Fi e `OK SUPABASE` ou o código de erro HTTP.

### Ligações

- HX711 DT/DOUT → ESP32 GPIO 4
- HX711 SCK/CLK → ESP32 GPIO 5
- HX711 VCC → 3V3
- HX711 GND → GND
- Célula de carga → terminais apropriados do HX711 conforme identificação do módulo

O USB alimenta o ESP32. A comunicação com Supabase exige Wi-Fi e internet; USB sozinho só permite a leitura local pelo Monitor Serial.

### Calibração

`CALIBRATION_FACTOR = 413.7` é **provisório**, estimado a partir de uma medição anterior de aproximadamente 7 g nesta montagem. Valide com objetos de peso conhecido (por exemplo 100 g e 500 g). A estrutura mecânica, orientação da célula e conexões afetam a precisão. Ajuste `UNIT_WEIGHT_KG = 0.200` ao peso real de uma unidade do produto.

## 3. Supabase

Projeto configurado: `jcobchoqoahrecsyshtk`. O firmware usa os UUIDs de protótipo definidos no sketch:
- Prateleira: `8a073a67-1778-422b-89d7-290b7892df05`
- Produto: `8b4a1468-9c34-48d2-b85d-edd86965cfc7`

As tabelas necessárias são `prateleiras`, `produtos`, `leituras`, `alertas` e `dispositivos`. A inserção de leitura deve passar pela política RLS `INSERT` de `leituras`; o trigger do protótipo pode criar alertas de estoque.

**Segurança:** as políticas atuais são permissivas para demonstração anônima e não são adequadas para produção. O firmware usa validação TLS desabilitada (`setInsecure()`) apenas para protótipo em rede confiável. Para produção, valide certificados TLS e use autenticação de dispositivo/backend com privilégios mínimos.

## 4. Verificações automáticas

O GitHub Actions executa `npm ci` + `npm run build` para o painel e tenta compilar o firmware para ESP32 a cada push/PR. Isso detecta erros de compilação, mas não substitui o teste da balança física, calibração e conectividade real.

## 5. Vercel

Configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY` nas Environment Variables do projeto Vercel e publique o branch `main`.
