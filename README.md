# SmartShelf

Protótipo IoT de prateleira inteligente com React, Supabase, ESP32 e HX711. O painel consulta as tabelas do projeto Supabase e atualiza os dados periodicamente.

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

O projeto está configurado para Vercel com Vite e fallback das rotas do React.

1. Importe o repositório no Vercel.
2. Mantenha o framework como Vite.
3. Em Settings → Environment Variables, configure `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`.
4. Publique o projeto.

Não faça commit de `.env.local`.

## 3. Banco de dados Supabase

O painel usa estas tabelas:

- `prateleiras`: nome, localização e capacidade.
- `produtos`: produto, peso unitário e estoque mínimo.
- `leituras`: peso e quantidade estimada enviados pelo sensor.
- `alertas`: ocorrências e estado de resolução.
- `dispositivos`: cadastro do ESP32 e pinos utilizados.

O painel consulta os dados na abertura e atualiza a cada 15 segundos. Isso é atualização periódica via REST, não WebSocket. A interface mostra “Sem leitura” quando o sensor ainda não enviou dados.

O projeto possui registros de protótipo para:
- Prateleira: `8a073a67-1778-422b-89d7-290b7892df05`
- Produto: `8b4a1468-9c34-48d2-b85d-edd86965cfc7`
- Dispositivo ESP32: `f5df0621-c111-48e6-a675-46a88c1c0102`

O produto cadastrado usa peso unitário de 0,200 kg. Ajuste `UNIT_WEIGHT_KG` no firmware se o produto real tiver outro peso.

## 4. Hardware ESP32 + HX711

Ligações usadas:
- HX711 DT/DOUT → GPIO 4 do ESP32.
- HX711 SCK/CLK → GPIO 5 do ESP32.
- HX711 VCC → 3V3 e GND → GND.
- Ligue a célula de carga aos terminais do HX711 de acordo com a identificação do seu sensor e módulo.

O firmware está em `hardware/esp32/SmartShelf.ino`. No Arduino IDE:
1. Instale a biblioteca HX711 compatível com bogde/HX711.
2. Preencha `WIFI_SSID` e `WIFI_PASSWORD`.
3. Preencha `SUPABASE_PUBLISHABLE_KEY` com a chave publishable do projeto SmartShelf.
4. Confirme os UUIDs da prateleira e do produto no início do arquivo.
5. Grave o sketch no ESP32 e abra o Monitor Serial em 115200 baud.

### Calibração

O firmware está configurado provisoriamente com `CALIBRATION_FACTOR = 413.7`, estimado a partir de uma medição de aproximadamente 7 g na montagem atual. **Esse fator ainda precisa ser validado com pesos conhecidos maiores** (por exemplo, 100 g e 500 g). A tolerância depende da montagem física da célula de carga. O código converte gramas para quilogramas antes de inserir em `leituras.peso_kg`.

O ESP32 envia uma leitura a cada 5 segundos. O campo `quantidade_estimada` é calculado dividindo o peso total em kg por `UNIT_WEIGHT_KG` e arredondando para baixo.

### Segurança

A chave publishable é pública, mas as políticas RLS atuais de protótipo permitem leitura anônima e inserção anônima de leituras. Isso facilita a demonstração, mas **não é apropriado para produção**: restrinja as políticas e use autenticação própria do dispositivo/backend antes de expor o sistema a redes não confiáveis.

O sketch usa `WiFiClientSecure::setInsecure()` somente para teste de laboratório. Em produção, valide o certificado TLS e evite depender de uma chave publishable como única proteção de escrita.

## 5. Fluxo

ESP32 + HX711 → Wi-Fi → Supabase REST/PostgreSQL → painel SmartShelf.

## 6. Limites do protótipo

- Sem autenticação de usuários no painel.
- Atualização do painel a cada 15 segundos.
- A calibração física precisa ser validada com a plataforma montada.
- O envio real exige credenciais Wi-Fi válidas e a chave publishable configuradas no firmware.
