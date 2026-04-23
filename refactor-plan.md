# Plano de Refatoração — Cycle Time Histogram (Azure DevOps Extension)

<aside>
🤖

**Leitor-alvo desta página:** qualquer LLM executor. Esta página é **autossuficiente**: contém contexto, links diretos pros fontes, mapeamentos de API, snippets-referência e Definition of Done binário por fase. Leia TUDO antes de começar.

</aside>

<aside>
🎯

**Objetivo único desta refatoração:** modernizar a extensão `CycleTimeHistogramExtension` do Marketplace do Azure DevOps, migrando do SDK legado `vss-web-extension-sdk` (AMD) para o SDK atual `azure-devops-extension-sdk` (ESM), com TypeScript estrito, webpack, Chart.js 4, e **mantendo HTML/DOM vanilla (sem React, sem azure-devops-ui)**. Feature-parity obrigatória em cada fase.

</aside>

## Contexto essencial pro executor

### Repositório-alvo

- **URL:** [https://github.com/altamir-junior-dias/azure-devops-extension-cycle-time-histogram](https://github.com/altamir-junior-dias/azure-devops-extension-cycle-time-histogram)
- **Default branch:** `main`
- **Linguagem atual:** JavaScript (ES2019) + jQuery
- **Publisher no Marketplace:** `AltamirJuniorDias`
- **Extension ID:** `CycleTimeHistogramExtension`
- **Versão atual:** `1.0.5`
- **Propósito:** widget de dashboard do Azure DevOps que exibe histograma de cycle time de work items, baseado numa Shared Query e em dois campos de data configuráveis, com linhas de percentis opcionais.

### Estrutura atual

```
repo/
├── .gitignore
├── gulpfile.js
├── images/
├── overview.md                    # serve como README também
├── package.json                   # minimalista, só devDependencies
├── vss-extension.json             # manifesto VSS (manifestVersion 1)
└── src/
    ├── configuration.html
    ├── configuration.js          # jQuery + $.Deferred + window.LoadConfiguration
    ├── core/
    │   └── azure-devops-proxy.js # wrapper sobre VSS.SDK (19KB)
    ├── vss-init/
    │   └── index.js              # bootstrap VSS.init + VSS.require + BarPercentileChart
    ├── widget.html
    └── widget.js                 # jQuery + window.LoadWidget
```

### Stack atual vs. Stack alvo

| Camada | Atual | Alvo | SDK Cliente | `vss-web-extension-sdk ^5.141.0` (AMD, `VSS.*`) | `azure-devops-extension-sdk ^4.x` (ESM, `SDK.*`) |
| --- | --- | --- | --- | --- | --- |
| API REST | `TFS/WorkItemTracking/RestClient` via AMD | `azure-devops-extension-api ^4.x` (typed clients) | Linguagem | JavaScript + jQuery + `$.Deferred` | TypeScript 5 estrito + `Promise` / `async/await` |
| UI | jQuery + DOM | Vanilla DOM (`document.getElementById`, `addEventListener`). Sem React, sem azure-devops-ui. | Chart | Chart.js 3.8 + custom controller `BarPercentileChart` | Chart.js 4.x + plugin `percentilesPlugin` (nao controller) |
| Build | Gulp 4 + `del`  • `event-stream` | webpack 5 + ts-loader + copy-webpack-plugin | Publish | `tfx extension create` via gulp task | `tfx-cli` via npm scripts |
| Testes | Nenhum | Jest + ts-jest (so funcoes puras) | Node | (nao declarado) | `engines.node >= 18` |

### Referências oficiais (leia sob demanda)

- Azure DevOps Extension SDK (GitHub): [https://github.com/microsoft/azure-devops-extension-sdk](https://github.com/microsoft/azure-devops-extension-sdk)
- API reference: [https://docs.microsoft.com/en-us/javascript/api/azure-devops-extension-sdk/](https://docs.microsoft.com/en-us/javascript/api/azure-devops-extension-sdk/)
- Extension sample (Microsoft, TypeScript + webpack): [https://github.com/microsoft/azure-devops-extension-sample](https://github.com/microsoft/azure-devops-extension-sample)
- Extension manifest reference: [https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest?view=azure-devops](https://learn.microsoft.com/en-us/azure/devops/extend/develop/manifest?view=azure-devops)
- Dashboard Widget guide: [https://learn.microsoft.com/en-us/azure/devops/extend/develop/add-dashboard-widget?view=azure-devops](https://learn.microsoft.com/en-us/azure/devops/extend/develop/add-dashboard-widget?view=azure-devops)
- Chart.js 4 migration guide: [https://www.chartjs.org/docs/latest/migration/v4-migration.html](https://www.chartjs.org/docs/latest/migration/v4-migration.html)

---

## Princípios de execução (invioláveis)

1. **Feature parity por fase** - ao final de cada fase, a extensão tem que funcionar identicamente ao comportamento anterior. Mudanças cosméticas permitidas; mudanças de UX, nao (salvo onde explicitamente indicado).
2. **Cada fase é publicável** - termine cada fase com um bump de versão e um pacote `.vsix` gerado com sucesso via `tfx extension create`.
3. **Publisher `-dev` separado** - para testes, use um publisher alternativo (ex.: `AltamirJuniorDias-Dev`) e um `id` alternativo no manifest dev (ex.: `CycleTimeHistogramExtension-Dev`). Nunca publique versões de teste no publisher prod.
4. **Commits pequenos** - um commit por mudança lógica. Mensagem no imperativo em inglês: `chore: add README`, `fix: handle empty customSettings`, `refactor: migrate widget to SDK v4`.
5. **Sem dependências novas além das listadas** - se precisar adicionar algo fora da lista, **pare e documente a decisão** como comentário no commit.
6. **Nao toque em funcionalidade a nao ser que a fase peca** - resistência à refatoração oportunista. Escopo é lei.
7. **Rode `npm run build` e verifique que `dist/` é gerado** ao final de cada fase. Se quebrar, corrija antes de seguir.

---

## Fase 0 - Higiene e fundação

**Duração estimada:** meio dia | **Versão final:** `1.1.0` | **Risco:** Baixo

### Objetivos

Arrumar a casa: documentação básica, licença, package.json completo, e 3 bugfixes críticos que existem independentes de qualquer refatoração.

### Passos

1. **Criar `README.md` na raiz** (substitui/estende `overview.md`):
    - Título, badge de versão, screenshot (linkar `images/sample.jpg`).
    - Seção "What is this" - copiar/expandir do `overview.md`.
    - Seção "Configuration" - copiar do `overview.md`.
    - Seção "Development" - vazia nesta fase, será preenchida na Fase 1.
    - Seção "License" - MIT.
2. **Adicionar `LICENSE`** na raiz, padrão MIT com copyright `2023-2026 Altamir Júnior Dias`.
3. **Preencher `package.json`** completo:
    
    ```json
    {
    	"name": "azure-devops-extension-cycle-time-histogram",
    	"version": "1.1.0",
    	"description": "Azure DevOps dashboard widget: Cycle Time Histogram with configurable percentiles",
    	"license": "MIT",
    	"author": "Altamir Junior Dias",
    	"repository": {
    		"type": "git",
    		"url": "https://github.com/altamir-junior-dias/azure-devops-extension-cycle-time-histogram.git"
    	},
    	"engines": { "node": ">=18" },
    	"scripts": {
    		"build": "gulp",
    		"build:dev": "gulp pack"
    	},
    	"devDependencies": { "...preserve existing...": "..." }
    }
    ```
    
    (Na Fase 0 ainda mantemos Gulp. Scripts serao substituídos na Fase 1.)
    
4. **Criar `.editorconfig`**:
    
    ```
    root = true
    [*]
    indent_style = tab
    end_of_line = lf
    charset = utf-8
    trim_trailing_whitespace = true
    insert_final_newline = true
    ```
    
5. **Criar `.nvmrc`** com conteudo `18`.
6. **Revisar `.gitignore`** - garantir que `dist/`, `publish/`, `node_modules/`, `*.vsix`, `.DS_Store`, `.vscode/` estao ignorados.
7. **Bugfix A - titulo hardcoded errado em `src/widget.html`:** trocar `Aging` por `Cycle Time`.
8. **Bugfix B - `JSON.parse` com fallback em `src/widget.js` e `src/configuration.js`:**
    
    Trocar `let settings = JSON.parse(widgetSettings.customSettings.data);` por:
    
    ```jsx
    let raw = widgetSettings.customSettings.data;
    let settings = raw ? JSON.parse(raw) : {};
    ```
    
9. **Bugfix C - `deferred.resolve()` duplicado em `src/configuration.js`:**
    
    No metodo `prepareControls`, remover a chamada `deferred.resolve()` fora do `.then`, mantendo so a dentro do `Promise.all(...).then(_ => deferred.resolve())`.
    
10. **Bump versao no `vss-extension.json`**: `1.0.5` para `1.1.0`.

### Definition of Done (Fase 0)

- [ ]  `README.md` existe e descreve a extensao.
- [ ]  `LICENSE` existe (MIT).
- [ ]  `package.json` tem `name`, `version`, `description`, `repository`, `engines`, `scripts`, `license`, `author`.
- [ ]  `.editorconfig` e `.nvmrc` existem.
- [ ]  `src/widget.html` nao contem a palavra `Aging`.
- [ ]  `grep -R "JSON.parse(widgetSettings" src/` nao retorna nada sem fallback.
- [ ]  `prepareControls` em `configuration.js` tem exatamente um `deferred.resolve()`.
- [ ]  `vss-extension.json` tem `"version": "1.1.0"`.
- [ ]  `npm install && npm run build` produz `publish/*.vsix` sem erros.

---

## Fase 1 - Build moderno (webpack)

**Duração estimada:** 1-2 dias | **Versão final:** `1.2.0` | **Risco:** Baixo

### Objetivos

Substituir Gulp + `del` + `event-stream` por webpack 5. Script de publicação vira npm script puro.

### Passos

1. **Remover dependencias antigas**: `npm uninstall gulp del event-stream`.
2. **Adicionar dependencias novas**:
    
    ```bash
    npm install --save-dev webpack webpack-cli copy-webpack-plugin tfx-cli rimraf cross-env
    ```
    
3. **Criar `webpack.config.js`** na raiz:
    
    ```jsx
    const path = require('path');
    const CopyPlugin = require('copy-webpack-plugin');
    
    module.exports = (env, argv) => ({
    	mode: argv.mode || 'development',
    	entry: {
    		widget: './src/widget.js',
    		configuration: './src/configuration.js',
    		'vss-init': './src/vss-init/index.js',
    		'core-azure-devops-proxy': './src/core/azure-devops-proxy.js'
    	},
    	output: {
    		path: path.resolve(__dirname, 'dist'),
    		filename: '[name].js',
    		clean: true
    	},
    	devtool: argv.mode === 'production' ? false : 'source-map',
    	plugins: [
    		new CopyPlugin({
    			patterns: [
    				{ from: 'src/widget.html', to: 'widget.html' },
    				{ from: 'src/configuration.html', to: 'configuration.html' },
    				{ from: 'node_modules/chart.js/dist/chart.min.js', to: 'lib/chart.min.js' },
    				{ from: 'node_modules/vss-web-extension-sdk/lib', to: 'lib' }
    			]
    		})
    	]
    });
    ```
    
    Atencao: nesta fase nao migramos o SDK ainda, apenas o build. O `vss-web-extension-sdk/lib` continua sendo copiado.
    
4. **Substituir `scripts` no `package.json`**:
    
    ```json
    {
    	"scripts": {
    		"clean": "rimraf dist publish",
    		"build": "npm run clean && webpack --mode production",
    		"build:dev": "npm run clean && webpack --mode development",
    		"package": "npm run build && tfx extension create --manifest-globs vss-extension.json --output-path ./publish --rev-version",
    		"package:dev": "npm run build:dev && tfx extension create --manifest-globs vss-extension-dev.json --output-path ./publish",
    		"publish:dev": "npm run package:dev && tfx extension publish --manifest-globs vss-extension-dev.json"
    	}
    }
    ```
    
5. **Criar `vss-extension-dev.json`** - copiar `vss-extension.json` e trocar:
    - `id`: `CycleTimeHistogramExtension-Dev`
    - `publisher`: `AltamirJuniorDias-Dev`
    - `name`: `Cycle Time Histogram (Dev)`
    - `public`: `false`
6. **Deletar `gulpfile.js`**.
7. **Bump versao**: `1.1.0` para `1.2.0`.
8. **Atualizar README** secao Development com os comandos `npm install`, `npm run build`, `npm run package`, `npm run publish:dev`.

### Definition of Done (Fase 1)

- [ ]  `gulpfile.js` nao existe mais.
- [ ]  `package.json` nao contem `gulp`, `del`, `event-stream`.
- [ ]  `webpack.config.js` existe e tem 4 entries.
- [ ]  `npm run build` gera `dist/widget.js`, `dist/configuration.js`, `dist/vss-init.js`, `dist/core-azure-devops-proxy.js`, `dist/widget.html`, `dist/configuration.html`, `dist/lib/chart.min.js`, `dist/lib/VSS.SDK.min.js`.
- [ ]  `npm run package` gera `publish/*.vsix` sem erros.
- [ ]  `vss-extension-dev.json` existe e aponta pro publisher de teste.
- [ ]  Instalar o `.vsix` num projeto de teste e confirmar feature parity com versao 1.1.0.

---

## Fase 2 - Migracao do SDK (VSS para azure-devops-extension-sdk)

**Duração estimada:** 2-3 dias | **Versão final:** `2.0.0` | **Risco:** Medio (major)

### Objetivos

Saída do SDK legado AMD para o SDK moderno ESM, ainda em JavaScript (TypeScript vem na Fase 3). Feature parity é imperativa.

### Pre-requisitos

- Fase 1 concluída e publicada em dev.
- Ler [https://github.com/microsoft/azure-devops-extension-sdk](https://github.com/microsoft/azure-devops-extension-sdk) (README completo).
- Ler o sample [https://github.com/microsoft/azure-devops-extension-sample](https://github.com/microsoft/azure-devops-extension-sample) - em especial `src/Samples/Dashboard/Widget.tsx` (tirar ideias do padrao, ignorar React).

### Mapa de equivalencias

| Legado (VSS SDK) | Moderno (azure-devops-extension-sdk) | `VSS.init({ explicitNotifyLoaded: true, usePlatformStyles: true })` | `SDK.init({ loaded: false })` |
| --- | --- | --- | --- |
| `VSS.notifyLoadSucceeded()` | `SDK.notifyLoadSucceeded()` | `VSS.ready(cb)` | `SDK.ready().then(cb)` |
| `VSS.register('id', () => widgetImpl)` | `SDK.register(SDK.getContributionId(), () => widgetImpl)` | `VSS.getWebContext()` | `SDK.getWebContext()` ou `await SDK.getService(CommonServiceIds.ProjectPageService)` |
| `VSS.getService(VSS.ServiceIds.ExtensionData)` | `await SDK.getService(CommonServiceIds.ExtensionDataService)` | `VSS.require(['TFS/WorkItemTracking/RestClient'], cb)` | `import { WorkItemTrackingRestClient } from "azure-devops-extension-api/WorkItemTracking"; const client = getClient(WorkItemTrackingRestClient);` |
| `witClient.queryByWiql({ query }, projectId)` | `client.queryByWiql({ query }, projectId)` (mesma assinatura, agora tipada) | `witClient.getWorkItems(ids, fields)` | `client.getWorkItems(ids, undefined, fields)` (atencao: assinatura tem mais params) |
| `witClient.getFields(projectId)` | `client.getFields(projectId)` | `$.Deferred` | `Promise` nativa + `async/await` |
| `TFS/Dashboards/WidgetHelpers` | Importar via SDK se disponivel, ou implementar `{ state: 'Success', statusType: 1 }` manualmente | `field.type == 2` | `field.type === FieldType.DateTime` (enum de `azure-devops-extension-api/WorkItemTracking`) |

### Passos

1. **Remover SDK antigo**:
    
    ```bash
    npm uninstall vss-web-extension-sdk
    npm install --save azure-devops-extension-sdk azure-devops-extension-api
    ```
    
2. **No `vss-extension.json`, remover da secao `files`**:
    
    ```json
    { "path": "node_modules/vss-web-extension-sdk/lib", "addressable": true, "packagePath": "/lib" }
    ```
    
3. **No `webpack.config.js`, remover** a entrada do `CopyPlugin` que copia `vss-web-extension-sdk/lib`.
4. **Remover `src/vss-init/`** inteiro - a inicializacao vira inline em `widget.js` e `configuration.js`.
5. **Reescrever `src/widget.html`** - remover `<script src="vss-init.js">` e referencias a `VSS.SDK.min.js`. Estrutura minima:
    
    ```html
    <!DOCTYPE html>
    <html>
    <head>
    	<meta charset="utf-8" />
    	<script src="widget.js"></script>
    </head>
    <body>
    	<div class="widget">
    		<div class="title-area"><div class="title"><h2 id="title"></h2></div></div>
    		<div class="chart"><canvas id="chart"></canvas></div>
    		<div id="message" style="display:none"></div>
    	</div>
    </body>
    </html>
    ```
    
6. **Reescrever `src/widget.js`** (ainda JS puro nesta fase):
    
    ```jsx
    import * as SDK from "azure-devops-extension-sdk";
    import { getClient } from "azure-devops-extension-api";
    import { WorkItemTrackingRestClient } from "azure-devops-extension-api/WorkItemTracking";
    import Chart from "chart.js/auto";
    import { percentilesPlugin } from "./core/percentiles-plugin.js";
    import { fetchCycleTimeData } from "./core/azure-devops-proxy.js";
    
    Chart.register(percentilesPlugin);
    
    SDK.init({ loaded: false });
    SDK.ready().then(() => {
    	SDK.register(SDK.getContributionId(), () => ({
    		load: async (widgetSettings) => {
    			try {
    				await renderWidget(widgetSettings);
    				return { statusType: 1 };
    			} catch (e) {
    				return { statusType: 3, message: String(e) };
    			}
    		},
    		reload: async (widgetSettings) => {
    			await renderWidget(widgetSettings);
    			return { statusType: 1 };
    		}
    	}));
    	SDK.notifyLoadSucceeded();
    });
    
    async function renderWidget(widgetSettings) {
    	const raw = widgetSettings.customSettings.data;
    	const settings = raw ? JSON.parse(raw) : {};
    	// ... resto da logica migrada de widget.js antigo, usando async/await ...
    }
    ```
    
7. **Reescrever `src/configuration.js`** seguindo o mesmo padrao.
8. **Reescrever `src/core/azure-devops-proxy.js`** como modulo de funcoes exportadas:
    
    ```jsx
    import { getClient } from "azure-devops-extension-api";
    import { WorkItemTrackingRestClient, FieldType } from "azure-devops-extension-api/WorkItemTracking";
    import * as SDK from "azure-devops-extension-sdk";
    
    export async function getSharedQueries() {
    	const client = getClient(WorkItemTrackingRestClient);
    	const projectId = SDK.getWebContext().project.id;
    	const root = await client.getQuery(projectId, 'Shared Queries', 2, 2);
    	return root.children ?? [];
    }
    
    export async function getQueryDateFields(queryId) { /* ... */ }
    export async function getQueryWiql(queryId) { /* ... */ }
    export async function getItems(wiql, asOf) { /* ... */ }
    // Manter logica de batch-50 em getWorkItemsById
    ```
    
9. **Criar `src/core/percentiles-plugin.js`** (placeholder para parity; implementacao final na Fase 4):
    
    ```jsx
    export const percentilesPlugin = {
    	id: 'percentiles',
    	afterDatasetsDraw(chart, args, opts) {
    		// TODO Fase 4: implementacao final
    		// Por ora, porta literal da logica de BarPercentileChart.draw()
    	}
    };
    ```
    
10. **Eliminar jQuery**: trocar `$('#id')` por `document.getElementById('id')`, `$el.on('change', cb)` por `el.addEventListener('change', cb)`.
11. **`npm uninstall jquery`** ao final, se tudo funcionar sem.
12. **Bump versao**: `1.2.0` para `2.0.0` (major - motor trocado).

### Definition of Done (Fase 2)

- [ ]  `package.json` nao contem `vss-web-extension-sdk`.
- [ ]  `package.json` contem `azure-devops-extension-sdk` e `azure-devops-extension-api`.
- [ ]  `src/vss-init/` nao existe mais.
- [ ]  Nenhum arquivo `.js` contem `VSS.init`, `VSS.require`, `VSS.register`, `$.Deferred`.
- [ ]  `vss-extension.json` nao contem entrada `vss-web-extension-sdk/lib`.
- [ ]  `npm run build` gera bundle sem erros.
- [ ]  `npm run package:dev` gera `.vsix` valido.
- [ ]  Widget carrega, configuracao abre, Shared Queries listam, campos de data aparecem, salvar persiste, histograma renderiza, linhas de percentil aparecem.
- [ ]  Nenhum erro no console do browser.

---

## Fase 3 - TypeScript estrito

**Duração estimada:** 2-3 dias | **Versão final:** `2.1.0` | **Risco:** Medio-baixo

### Objetivos

Converter todo JS em TS, com `strict: true`. Type-safe sem reestruturacao arquitetural.

### Passos

1. **Instalar TypeScript toolchain:**
    
    ```bash
    npm install --save-dev typescript ts-loader @types/chart.js
    ```
    
2. **Criar `tsconfig.json`:**
    
    ```json
    {
    	"compilerOptions": {
    		"target": "ES2020",
    		"module": "ESNext",
    		"moduleResolution": "node",
    		"strict": true,
    		"noImplicitAny": true,
    		"exactOptionalPropertyTypes": true,
    		"esModuleInterop": true,
    		"skipLibCheck": true,
    		"forceConsistentCasingInFileNames": true,
    		"sourceMap": true,
    		"outDir": "./dist",
    		"rootDir": "./src",
    		"lib": ["ES2020", "DOM"]
    	},
    	"include": ["src/**/*"]
    }
    ```
    
3. **Atualizar `webpack.config.js`** adicionando `ts-loader`:
    
    ```jsx
    module: { rules: [{ test: /\.ts$/, use: 'ts-loader', exclude: /node_modules/ }] },
    resolve: { extensions: ['.ts', '.js'] }
    ```
    
    Atualizar `entry` para apontar `.ts`.
    
4. **Renomear arquivos**:
    - `src/widget.js` para `src/widget.ts`
    - `src/configuration.js` para `src/configuration.ts`
    - `src/core/azure-devops-proxy.js` para `src/core/AzureDevOpsClient.ts`
    - `src/core/percentiles-plugin.js` para `src/core/percentilesPlugin.ts`
5. **Criar `src/core/types.ts`:**
    
    ```tsx
    export interface CycleTimeSettings {
    	title: string;
    	query: string;
    	cycleTimeStartField: string;
    	cycleTimeEndField: string;
    	percentiles: string; // "50,75,85" - parse on use
    }
    
    export interface HistogramBucket {
    	cycleTime: number;
    	items: number;
    }
    
    export interface QueryNode {
    	id: string;
    	name: string;
    	path: string;
    	isFolder: boolean;
    	children: QueryNode[];
    }
    ```
    
6. **Tipar todas as funcoes exportadas** de `AzureDevOpsClient.ts` com tipos de `azure-devops-extension-api/WorkItemTracking`.
7. **Substituir magic numbers**:
    - `field.type == 2` por `field.type === FieldType.DateTime`
    - `statusType: 1` por enum local `WidgetStatusType.Success` se SDK nao expuser
8. **Substituir parser WIQL por regex robusto:**
    
    ```tsx
    function extractSelectedFields(wiql: string): string[] {
    	const match = /SELECT\s+([\s\S]+?)\s+FROM/i.exec(wiql);
    	if (!match) return [];
    	return match[1]
    		.split(',')
    		.map(s => s.trim().replace(/^\[|\]$/g, ''))
    		.filter(s => s && s.toUpperCase() !== 'SYSTEM.ID');
    }
    ```
    
9. **Rodar `npx tsc --noEmit`** e corrigir todos os erros. Nao suprima com `any` sem comentario justificando.
10. **Bump versao**: `2.0.0` para `2.1.0`.

### Definition of Done (Fase 3)

- [ ]  `src/**/*.js` nao existe mais (so `.ts`).
- [ ]  `npx tsc --noEmit` termina com zero erros.
- [ ]  `grep -R "any" src/` tem ocorrencias apenas em comentarios ou tipos de APIs externas documentados.
- [ ]  `grep -R "field.type == 2" src/` retorna vazio.
- [ ]  `jquery` nao esta em `dependencies` nem `devDependencies`.
- [ ]  `npm run build` e `npm run package:dev` funcionam.
- [ ]  Teste manual: feature parity com 2.0.0.

---

## Fase 4 - Chart.js 4 + testes + percentiles plugin

**Duração estimada:** 1-2 dias | **Versão final:** `3.0.0` | **Risco:** Medio (render)

### Objetivos

Atualizar Chart.js de 3.8 para 4.x, migrar `BarPercentileChart` (controller custom) para plugin idiomatico em v4, e adicionar testes em funcoes puras.

### Por que plugin em vez de controller custom

No Chart.js v4, estender `BarController` ficou mais fragil. Plugins sao o ponto de extensao de primeira classe: declarativos, composave is e documentados. Desenhar linhas verticais sobre um BarChart padrao é exatamente o caso de uso do hook `afterDatasetsDraw`.

### Passos

1. **Atualizar Chart.js:**
    
    ```bash
    npm install chart.js@^4 chartjs-plugin-datalabels@^2.2
    ```
    
2. **Reimplementar `src/core/percentilesPlugin.ts`** como plugin completo:
    
    ```tsx
    import type { Plugin } from 'chart.js';
    
    export interface PercentilesPluginOptions {
    	values: number[];
    	color?: string;
    	lineWidth?: number;
    }
    
    export const percentilesPlugin: Plugin<'bar', PercentilesPluginOptions> = {
    	id: 'percentiles',
    	afterDatasetsDraw(chart, _args, opts) {
    		const { values = [], color = '#ff0000', lineWidth = 2 } = opts ?? {};
    		if (!values.length) return;
    		const meta = chart.getDatasetMeta(0);
    		const bars = meta.data;
    		const totals = (chart.data.datasets[0].data as number[]).reduce((acc, n) => acc + (n ?? 0), 0);
    		if (totals === 0) return;
    		const { ctx, chartArea } = chart;
    		ctx.save();
    		ctx.strokeStyle = color;
    		ctx.fillStyle = color;
    		ctx.lineWidth = lineWidth;
    		ctx.textAlign = 'center';
    		for (const pct of values) {
    			const target = Math.floor((pct / 100) * totals);
    			let running = 0;
    			let idx = 0;
    			while (idx < bars.length) {
    				running += (chart.data.datasets[0].data[idx] as number) ?? 0;
    				if (running >= target) break;
    				idx++;
    			}
    			const bar = bars[idx];
    			if (!bar) continue;
    			ctx.beginPath();
    			ctx.moveTo(bar.x, chartArea.top + 24);
    			ctx.lineTo(bar.x, chartArea.bottom);
    			ctx.stroke();
    			ctx.fillText(`${pct}%`, bar.x, chartArea.top + 12);
    		}
    		ctx.restore();
    	}
    };
    ```
    
3. **Usar plugin no widget:**
    
    ```tsx
    new Chart(canvas, {
    	type: 'bar',
    	data: { /* ... */ },
    	options: {
    		responsive: true,
    		maintainAspectRatio: false,
    		plugins: {
    			legend: { display: false },
    			title: { display: false },
    			tooltip: { enabled: false },
    			percentiles: { values: parsePercentiles(settings.percentiles) }
    		}
    	},
    	plugins: [percentilesPlugin]
    });
    ```
    
4. **Remover `Chart.register(BarPercentileChart)`** - nao e mais necessario.
5. **Configurar Jest + ts-jest:**
    
    ```bash
    npm install --save-dev jest ts-jest @types/jest
    npx ts-jest config:init
    ```
    
6. **Criar testes em `src/__tests__/`:**
    - `cycleTime.test.ts` - dado pares `start/end`, verifica bucketizacao correta.
    - `percentiles.test.ts` - dado distribuicao e lista `[50, 85]`, verifica indice do bucket correto.
    - `wiql.test.ts` - verifica `extractSelectedFields` com casos: simples, com aliases, com comentarios, multi-linha, so `[System.Id]`.
    - `settings.test.ts` - verifica `JSON.parse` com fallback quando `customSettings.data` e `null`, `undefined`, `""`, `"{}"`.
7. **Adicionar `"test": "jest"` no `package.json`**.
8. **Corrigir bug #2** (prepareChart cria Chart em canvas escondido quando `data.length == 0`): adicionar `return` apos mostrar mensagem.
9. **Corrigir bug #3** (cycle time `+1` implicito): extrair para `calcCycleTimeDays(start, end, inclusive=true)`. Documentar no README.
10. **Corrigir bug #4** (comparacao frouxa de `startValue != ''`): usar `isValidDate(v) => v instanceof Date || (typeof v === 'string' && v !== '' && !isNaN(Date.parse(v)))`.
11. **Bump versao**: `2.1.0` para `3.0.0`.

### Definition of Done (Fase 4)

- [ ]  `package.json` tem `chart.js@^4`.
- [ ]  `BarPercentileChart` nao existe em nenhum lugar do codigo.
- [ ]  `percentilesPlugin` esta implementado e testado.
- [ ]  `npm test` passa com 4 ou mais suites e cobertura >= 60% das funcoes puras.
- [ ]  `npm run build` e `npm run package:dev` funcionam.
- [ ]  Feature parity confirmada; linhas de percentil renderizam corretamente; nenhum regression no canvas.

---

## Checklist final de publicacao (apos todas as fases)

- [ ]  `vss-extension.json` com versao `3.0.0` ou superior.
- [ ]  README atualizado com screenshots, instrucoes dev e changelog.
- [ ]  `CHANGELOG.md` com entradas por fase.
- [ ]  Testar em projeto real no Azure DevOps Services de producao.
- [ ]  `tfx extension publish` pro publisher real so apos smoke test completo em `-dev`.
- [ ]  Release no GitHub com tag `v3.0.0` e `.vsix` anexado.

---

## Anexos

### A. Bugs inventariados

| # | Local | Descricao | Corrigido em |
| --- | --- | --- | --- |
| B | `widget.js` / `configuration.js` | `JSON.parse` sem fallback quando `data` e null | Fase 0 |
| 2 | `widget.js prepareChart` | Chart criado em canvas escondido quando sem dados | Fase 4 |
| 4 | `widget.js getData` | Comparacao frouxa de datas (`startValue != ''`) | Fase 4 |
| 7 | `azure-devops-proxy.js` | Parser WIQL fragil por `substring`/`indexOf` | Fase 3 |
| 12 | `vss-init/index.js` | Injecao de `script` tags dinamicamente no DOM | Fase 2 |

### B. Prompt inicial sugerido para o executor LLM

```
Voce e um engenheiro senior Azure DevOps + TypeScript.

Leia esta pagina por completo antes de qualquer acao.

Regras de execucao:
- Execute UMA fase de cada vez, em ordem (0 -> 1 -> 2 -> 3 -> 4).
- Ao final de cada fase, valide TODOS os itens do Definition of Done daquela fase.
- Se qualquer item do DoD falhar, pare e reporte o que falhou antes de prosseguir.
- Nunca adicione dependencias alem das listadas sem justificar em commit.
- Commits pequenos, mensagens no imperativo em ingles (ex: "fix: handle null customSettings").
- Apos cada fase, gere um .vsix em publisher -dev e aguarde confirmacao humana antes de avancar.
- Nao refatore fora do escopo da fase em execucao.

Comece pela Fase 0. Ao final, pergunte se pode avancar para a Fase 1.
```

### C. Comandos uteis de diagnostico

```bash
# Verificar se ainda ha VSS legado
grep -R "VSS\." src/ | grep -v ".ts"

# Verificar se ainda ha jQuery
grep -R "\$\(\|Deferred" src/

# Listar tamanho dos bundles
du -sh dist/*.js

# Validar manifest
npx tfx-cli extension create --manifest-globs vss-extension.json --output-path /tmp --rev-version
```

### D. Decisoes arquiteturais (ADR-lite)

| # | Decisao | Motivo |
| --- | --- | --- |
| 2 | Nao adotar azure-devops-ui | Aumenta escopo; tema nativo pode ser respeitado via CSS vars |
| 4 | Manter jQuery so se Fase 2 exigir; remover em Fase 3 | Reducao de bundle |
| 6 | Publisher `-dev` separado | Evita quebrar usuarios reais durante migracao |

### E. Historico

- Plano criado por Notion AI para Chicao Alcantara em 23/abr/2026.
- Baseado em analise do repositorio em `main@HEAD` (ultimo push em 03/nov/2023).
- Referencia cruzada: `microsoft/azure-devops-extension-sdk` (ultimo push em 08/out/2025) e `microsoft/azure-devops-extension-sample` (branch master).