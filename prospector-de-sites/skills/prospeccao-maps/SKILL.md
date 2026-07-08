---
name: prospeccao-maps
description: Esta skill deve ser usada ao prospectar clientes no Google Maps — buscar negócios bem avaliados com sites ruins, qualificar leads, avaliar qualidade de sites de terceiros e montar a planilha de leads. Acione quando o usuário disser "prospectar", "buscar clientes", "achar leads", "clientes com site ruim" ou rodar /prospectar.
---

# Prospecção no Google Maps

Encontrar negócios com boa reputação (que têm dinheiro e clientes) mas com presença digital fraca (que precisam do serviço). O contraste entre a nota alta e o site ruim É o argumento de venda.

## O perfil do lead ideal

- Nota **≥ 4.7** no Google com **≥ 40 avaliações** — o negócio é bom e tem demanda
- **Tem site próprio ATIVO, mas ruim** — requisito eliminatório (ver filtros abaixo)
- **E-mail público** no perfil ou no site — requisito eliminatório
- Nichos que funcionam: profissionais liberais (nutricionistas, psicólogos, advogados, psiquiatras, dentistas, fisioterapeutas) — alto ticket por cliente, site é vitrine de confiança

## Os 3 filtros eliminatórios (aplicar NESTA ordem)

1. **Sem site próprio → PULA.** O serviço vendido é REDESIGN: é preciso existir uma página para redesenhar. Não conta como site próprio: perfil de Instagram/Facebook, link de WhatsApp, página em diretório de terceiros (Doctoralia, iFood, Linktree e afins), site fora do ar ou domínio expirado. Registre o descarte com motivo "sem site próprio" e siga para o próximo.
2. **Site BOM → PULA.** Se a página é moderna, responsiva e bem estruturada, não há dor para resolver. Registre "site já é bom" e siga.
3. **Sem e-mail público → PULA.** A proposta é enviada por e-mail. Procure o e-mail no perfil do Maps, no site (páginas de contato, rodapé, política de privacidade) e via JavaScript (regex de e-mail no HTML). Se não achar em nenhum lugar, registre "sem e-mail público" e BUSQUE OUTRO lead no lugar — a meta de leads qualificados não diminui.

Atenção: "site" que aponta para diretório de terceiros — descarta pelo Filtro 1, mesmo que o perfil do Maps mostre um botão "site".

## Fluxo de execução

1. Abrir o Google Maps e buscar "[nicho] em [cidade]".
2. Percorrer os resultados em ordem, abrindo o painel de cada estabelecimento.
3. Anotar nota e nº de avaliações; aplicar o corte (≥ 4.7 / ≥ 40). Reprovou → próximo.
4. Verificar se há site no perfil; aplicar o Filtro 1.
5. Abrir o site em NOVA ABA e avaliar a qualidade (critérios abaixo); aplicar o Filtro 2.
6. Caçar o e-mail (perfil + site); aplicar o Filtro 3.
7. Coletar os dados do lead qualificado: nome, nota, nº de avaliações, telefone/WhatsApp, e-mail, URL do site, motivo objetivo do site ser ruim, e 2-3 trechos de avaliações reais (matéria-prima da proposta e do redesign).
8. Repetir até bater a meta de leads qualificados do config ou esgotar 25 estabelecimentos avaliados.

## Como avaliar a qualidade de um site (critérios objetivos)

Site RUIM (qualifica o lead) apresenta 2 ou mais destes sinais:

- **Não responsivo**: quebra em tela de celular, texto minúsculo, rolagem horizontal
- **Design datado**: layout de década passada, fontes de sistema, imagens esticadas/pixeladas, cores berrantes
- **Sem hierarquia**: tudo do mesmo tamanho, parágrafos gigantes, nenhum caminho visual
- **Sem CTA claro**: nenhum botão de contato visível na primeira dobra; telefone escondido
- **Lento/pesado**: sliders automáticos, plugins velhos, imagens de MBs
- **Conteúdo abandonado**: copyright antigo, notícias de anos atrás, links quebrados
- **Template genérico mal preenchido**: seções vazias, lorem ipsum, fotos de banco de imagem sem relação

Registrar SEMPRE o motivo específico e verificável (ex.: "não responsivo + sem CTA — telefone só no rodapé") — ele vira o argumento central do e-mail de proposta.

## Saída

Duas entregas obrigatórias:

1. **Planilha do Google Sheets** (via conector do Google Drive, `create_file` com `contentMimeType: text/csv`): TODOS os avaliados — qualificados e descartados com motivo — ranqueados por potencial (melhor nota + pior site primeiro). Colunas: #, Nome, Nota, Avaliações, E-mail, Telefone, Site atual, Motivo, Situação, Status, URL nova.
2. **`leads.md` local** (pasta conectada): cópia de trabalho com os mesmos dados, onde os status evoluem (`novo → redesenhado → publicado → proposta enviada`). A planilha é regenerada a partir dele quando os status mudam.

## Boas práticas

- Nunca reavaliar estabelecimento que já está em `leads.md` (qualificado OU descartado) — a lista só cresce.
- Rodadas novas somam na MESMA planilha do Google (regenerar com o acumulado), nunca criar planilha duplicada por rodada.
- Não coletar dados além dos públicos e necessários para a proposta (nada de raspar CPF, dados pessoais de avaliadores etc.).
- Respeitar o ritmo do navegador: abrir uma aba por site avaliado e fechá-la após a análise, para não degradar a máquina do usuário.
- Se a cidade tiver poucos resultados no nicho, avisar o usuário e sugerir nicho alternativo ou cidade vizinha em vez de forçar leads fracos.
