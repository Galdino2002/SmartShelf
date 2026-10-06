# SmartShelf

Protótipo IoT de prateleira inteligente com React, Supabase, ESP32 e HX711. O painel não usa mais listas de demonstração: ele consulta as tabelas do projeto Supabase.

## 1. Executar o painel

```bash
npm install
npm run dev
```

Configure `.env.local` usando `.env.example`:

```env
VITE_SUPABASE_URL=https://jcobchoqoahrecsyshtk.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sua_chave_publishable
```

A chave publishable pode estar no frontend. **Nunca coloque uma chave `service_role` ou secret key no navegador nem no ESP32.**

## 2. Publicar no Vercel

O projeto já está configurado para Vercel com Vite e fallback das rotas do React.

### Pela dashboard do Vercel

1. Faça push do projeto para o GitHub.
2. No Vercel, selecione **Add New Project** e importe o repositório.
3. Mantenha o framework detectado como **Vite**.
4. Em **Settings → Environment Variables**, adicione:

   - `VITE_SUPABASE_URL`: URL do projeto Supabase.
   - `VITE_SUPABASE_PUBLISHABLE_KEY`: chave publishable do Supabase.

5. Selecione os ambientes desejados (Production, Preview e Development).
6. Clique em **Deploy**.

O `vercel.json` define `npm run build`, publica a pasta `dist` e redireciona rotas como `/dashboard`, `/produtos` e `/historico` para o entrypoint do React. Isso evita erro 404 ao atualizar uma página interna.

### Pela CLI

```bash
npm install
npm run build
npx vercel
npx vercel --prod
```

Não faça commit de `.env.local`. As variáveis do Vercel devem ser cadastradas no painel ou na CLI.

## 3. Banco de dados

O painel lê estas tabelas:

- `prateleiras`: nome, localização e capacidade.
- `produtos`: produto, peso unitário e estoque mínimo.
- `leituras`: peso e quantidade estimada enviados pelo sensor.
- `alertas`: ocorrências registradas e estado de resolução.

O navegador consulta os dados na abertura e atualiza a consulta a cada 15 segundos. Isso é atualização periódica via REST, não WebSocket em tempo real. Resolver um alerta atualiza o registro no Supabase. Um gatilho PostgreSQL cria alertas de estoque vazio, estoque baixo e sobrepeso a partir das novas leituras, evitando repetir alertas enquanto o mesmo problema continuar ativo.

O painel não cria dados de demonstração. Quando não existe leitura, a interface exibe explicitamente “Sem leitura” e mantém peso, quantidade e capacidade de uso sem valores inventados. As páginas disponíveis são Dashboard, Prateleiras, Produtos, Alertas, Histórico e Configurações.

## 4. Hardware

- ESP32 + célula de carga de 5 kg + HX711.
- HX711 DT/DOUT → GPIO 4 do ESP32.
- HX711 SCK/CLK → GPIO 5 do ESP32.
- HX711 VCC → 3V3 e GND → GND.
- A célula de carga deve ser ligada aos terminais E+/E-/A+/A- do módulo HX711 conforme a identificação do seu sensor/módulo.

O firmware está em `hardware/esp32/SmartShelf.ino`. Abra no Arduino IDE, instale a biblioteca **HX711** compatível com bogde/HX711 e preencha Wi-Fi, chave publishable, UUIDs e fator de calibração no início do sketch. A chave publishable é pública; a política de RLS do protótipo permite inserção anônima em `leituras`, então restrinja essas políticas antes de usar em produção.

**Calibração obrigatória:** o fator da célula de carga varia por montagem. Não considere os valores em kg confiáveis até calibrar o HX711 com um peso conhecido. Ajuste também `UNIT_WEIGHT_KG` ao peso real de cada unidade do produto cadastrado.

## 5. Fluxo

ESP32 + HX711 → Wi-Fi → Supabase REST/PostgreSQL → painel SmartShelf.

## 6. Limites do protótipo

- Sem autenticação de usuários; o painel é para demonstração local.
- O navegador atualiza a cada 15 segundos.
- A calibração física e o envio de leituras precisam ser validados com o equipamento montado.
- As políticas de acesso abertas são somente para o protótipo; não reutilize esse conjunto de políticas em produção.
