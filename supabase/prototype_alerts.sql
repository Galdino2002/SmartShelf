-- SmartShelf prototype: generate stock and overweight alerts from sensor readings.
-- Run in Supabase SQL Editor if recreating this part of the prototype.
-- Anonymous access is intentionally permissive for the lab prototype only.

drop policy if exists prototype_insert_alertas on public.alertas;
create policy prototype_insert_alertas
  on public.alertas
  for insert
  to anon
  with check (true);

create or replace function public.processar_alertas_leitura()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_capacidade numeric;
  v_peso_unitario numeric;
  v_estoque_minimo integer;
  v_quantidade integer;
  v_tipo varchar;
  v_mensagem text;
begin
  select capacidade_kg
    into v_capacidade
    from public.prateleiras
    where id = new.prateleira_id;

  if v_capacidade is not null and new.peso_kg > v_capacidade then
    if not exists (
      select 1 from public.alertas
      where prateleira_id = new.prateleira_id
        and tipo = 'SOBREPESO'
        and resolvido = false
    ) then
      insert into public.alertas (prateleira_id, produto_id, tipo, mensagem)
      values (
        new.prateleira_id,
        new.produto_id,
        'SOBREPESO',
        'Peso acima da capacidade configurada da prateleira.'
      );
    end if;
  else
    update public.alertas
      set resolvido = true, resolvido_em = now()
      where prateleira_id = new.prateleira_id
        and tipo = 'SOBREPESO'
        and resolvido = false;
  end if;

  if new.produto_id is not null then
    select peso_unitario_kg, estoque_minimo
      into v_peso_unitario, v_estoque_minimo
      from public.produtos
      where id = new.produto_id;

    if v_peso_unitario is not null and v_peso_unitario > 0 then
      v_quantidade := coalesce(
        new.quantidade_estimada,
        floor(new.peso_kg / v_peso_unitario)::integer
      );

      if v_quantidade = 0 then
        v_tipo := 'PRATELEIRA_VAZIA';
        v_mensagem := 'Produto sem unidades estimadas na prateleira.';
      elsif v_quantidade <= coalesce(v_estoque_minimo, 0) then
        v_tipo := 'ESTOQUE_BAIXO';
        v_mensagem := 'Produto abaixo ou no limite do estoque mínimo.';
      else
        v_tipo := null;
      end if;

      if v_tipo is not null then
        if not exists (
          select 1 from public.alertas
          where prateleira_id = new.prateleira_id
            and produto_id = new.produto_id
            and tipo = v_tipo
            and resolvido = false
        ) then
          insert into public.alertas (prateleira_id, produto_id, tipo, mensagem)
          values (new.prateleira_id, new.produto_id, v_tipo, v_mensagem);
        end if;
      else
        update public.alertas
          set resolvido = true, resolvido_em = now()
          where prateleira_id = new.prateleira_id
            and produto_id = new.produto_id
            and tipo in ('ESTOQUE_BAIXO', 'PRATELEIRA_VAZIA')
            and resolvido = false;
      end if;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_processar_alertas_leitura on public.leituras;
create trigger trg_processar_alertas_leitura
  after insert on public.leituras
  for each row
  execute function public.processar_alertas_leitura();
