// 検索オプション設定ページのロジック
// 最大5個の検索オプション（メニュー名 + プレフィックス）を保存する。

const MAX_OPTIONS = 5;
const STORAGE_KEY = "searchOptions";
const CUSTOM_ENGINES_KEY = "customEngines";

// 選択可能な検索エンジン（background.js と共通の定義）
const SEARCH_ENGINES = [
  { id: "duckduckgo", label: "DuckDuckGo", url: "https://duckduckgo.com/?q=%s" },
  { id: "google", label: "Google", url: "https://www.google.com/search?q=%s" },
  { id: "google-images", label: "Google Images", url: "https://www.google.com/search?tbm=isch&q=%s" },
  { id: "bing", label: "Bing", url: "https://www.bing.com/search?q=%s" },
  { id: "yahoo", label: "Yahoo! JAPAN", url: "https://search.yahoo.co.jp/search?p=%s" },
  { id: "youtube", label: "YouTube", url: "https://www.youtube.com/results?search_query=%s" },
  { id: "wikipedia", label: "Wikipedia", url: "https://ja.wikipedia.org/w/index.php?search=%s" }
];

const DEFAULT_ENGINE = "duckduckgo";

// 初期値（未設定時に使われる）
// ラベルはブラウザの表示言語に合わせてローカライズし、
// 内容（プレフィックス・エンジン）は日本語環境とそれ以外で切り替える
function getDefaultOptions() {
  const isJapanese = browser.i18n.getUILanguage().startsWith("ja");

  if (isJapanese) {
    return [
      { label: browser.i18n.getMessage("option5ch"), prefix: "site:5ch.io", engine: "duckduckgo" },
      { label: browser.i18n.getMessage("optionWikiJp"), prefix: "site:ja.wikipedia.org", engine: "duckduckgo" },
      { label: browser.i18n.getMessage("optionImageSearch"), prefix: "", engine: "google-images" },
      { label: browser.i18n.getMessage("optionNicoNico"), prefix: "site:dic.nicovideo.jp", engine: "duckduckgo" },
      { label: browser.i18n.getMessage("optionPdfOnly"), prefix: "filetype:pdf", engine: "duckduckgo" }
    ];
  }

  return [
    { label: browser.i18n.getMessage("optionStackOverflow"), prefix: "site:stackoverflow.com", engine: "duckduckgo" },
    { label: browser.i18n.getMessage("optionWikipedia"), prefix: "site:en.wikipedia.org", engine: "duckduckgo" },
    { label: browser.i18n.getMessage("optionGitHub"), prefix: "site:github.com", engine: "duckduckgo" },
    { label: browser.i18n.getMessage("optionImageSearch"), prefix: "", engine: "google-images" },
    { label: browser.i18n.getMessage("optionPdfOnly"), prefix: "filetype:pdf", engine: "duckduckgo" }
  ];
}

const tbody = document.getElementById("options-body");
const addRowButton = document.getElementById("add-row");
const saveButton = document.getElementById("save");
const statusEl = document.getElementById("status");
const enginesBody = document.getElementById("engines-body");
const addEngineButton = document.getElementById("add-engine");

// 現在読み込まれているカスタム検索エンジン（保存前の編集内容を保持する）
let customEngines = [];

// data-i18n / data-i18n-html 属性が付いた要素に、現在のロケールの文言を流し込む
function localizePage() {
  document.documentElement.lang = browser.i18n.getUILanguage();
  document.title = browser.i18n.getMessage("optionsPageTitle");

  for (const el of document.querySelectorAll("[data-i18n]")) {
    el.textContent = browser.i18n.getMessage(el.dataset.i18n);
  }
  for (const el of document.querySelectorAll("[data-i18n-html]")) {
    el.innerHTML = browser.i18n.getMessage(el.dataset.i18nHtml);
  }
}

// 1行分の入力欄を生成して tbody に追加する
function addRow(option = { label: "", prefix: "", engine: DEFAULT_ENGINE }) {
  if (tbody.children.length >= MAX_OPTIONS) return;

  const tr = document.createElement("tr");

  const labelCell = document.createElement("td");
  const labelInput = document.createElement("input");
  labelInput.type = "text";
  labelInput.className = "label-input";
  labelInput.placeholder = browser.i18n.getMessage("labelPlaceholder");
  labelInput.value = option.label || "";
  labelCell.appendChild(labelInput);

  const engineCell = document.createElement("td");
  const engineSelect = document.createElement("select");
  engineSelect.className = "engine-select";
  populateEngineSelect(engineSelect, option.engine || DEFAULT_ENGINE);
  engineCell.appendChild(engineSelect);

  const prefixCell = document.createElement("td");
  const prefixInput = document.createElement("input");
  prefixInput.type = "text";
  prefixInput.className = "prefix-input";
  prefixInput.placeholder = browser.i18n.getMessage("prefixPlaceholder");
  prefixInput.value = option.prefix || "";
  prefixCell.appendChild(prefixInput);

  const removeCell = document.createElement("td");
  removeCell.className = "col-remove";
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = browser.i18n.getMessage("removeButton");
  removeButton.addEventListener("click", () => {
    tr.remove();
    updateAddButtonState();
  });
  removeCell.appendChild(removeButton);

  tr.appendChild(labelCell);
  tr.appendChild(engineCell);
  tr.appendChild(prefixCell);
  tr.appendChild(removeCell);
  tbody.appendChild(tr);

  updateAddButtonState();
}

// 行数が上限に達したら「行を追加」ボタンを無効化する
function updateAddButtonState() {
  addRowButton.disabled = tbody.children.length >= MAX_OPTIONS;
}

// 検索エンジンの <select> に、組み込みエンジンとカスタムエンジンの選択肢を流し込む
function populateEngineSelect(select, selectedId) {
  select.innerHTML = "";

  for (const engine of SEARCH_ENGINES) {
    const engineOption = document.createElement("option");
    engineOption.value = engine.id;
    engineOption.textContent = engine.label;
    select.appendChild(engineOption);
  }

  if (customEngines.length) {
    const group = document.createElement("optgroup");
    group.label = browser.i18n.getMessage("customEngineGroupLabel");
    for (const engine of customEngines) {
      const engineOption = document.createElement("option");
      engineOption.value = engine.id;
      engineOption.textContent = engine.label;
      group.appendChild(engineOption);
    }
    select.appendChild(group);
  }

  select.value = selectedId;
  // 保存済みのエンジンが削除済みなどで存在しない場合はデフォルトにフォールバックする
  if (!select.value) select.value = DEFAULT_ENGINE;
}

// カスタムエンジン1行分の入力欄を生成して engines-body に追加する
function addEngineRow(engine = { label: "", url: "" }) {
  const tr = document.createElement("tr");

  const nameCell = document.createElement("td");
  const nameInput = document.createElement("input");
  nameInput.type = "text";
  nameInput.className = "engine-name-input";
  nameInput.placeholder = browser.i18n.getMessage("engineNamePlaceholder");
  nameInput.value = engine.label || "";
  nameCell.appendChild(nameInput);

  const urlCell = document.createElement("td");
  const urlInput = document.createElement("input");
  urlInput.type = "text";
  urlInput.className = "engine-url-input";
  urlInput.placeholder = browser.i18n.getMessage("engineUrlPlaceholder");
  urlInput.value = engine.url || "";
  urlCell.appendChild(urlInput);

  const removeCell = document.createElement("td");
  removeCell.className = "col-remove";
  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.textContent = browser.i18n.getMessage("removeButton");
  removeButton.addEventListener("click", () => tr.remove());
  removeCell.appendChild(removeButton);

  tr.appendChild(nameCell);
  tr.appendChild(urlCell);
  tr.appendChild(removeCell);
  enginesBody.appendChild(tr);
}

// カスタムエンジンの入力内容を配列として取得する（空行は除外）
function collectCustomEngines() {
  const engines = [];
  for (const tr of enginesBody.children) {
    const label = tr.querySelector(".engine-name-input").value.trim();
    const url = tr.querySelector(".engine-url-input").value.trim();
    if (!label && !url) continue;
    engines.push({ label, url });
  }
  return engines;
}

// カスタムエンジンの入力内容を検証する。問題があればエラーメッセージを返す
function validateCustomEngines(engines) {
  for (const engine of engines) {
    if (!engine.label || !engine.url) {
      return browser.i18n.getMessage("invalidEngineUrl");
    }
    if (!engine.url.includes("%s")) {
      return browser.i18n.getMessage("invalidEngineUrl");
    }
  }
  return "";
}

// 保存済みのカスタムエンジンを読み込んで画面に反映する
async function loadCustomEngines() {
  const stored = await browser.storage.sync.get(CUSTOM_ENGINES_KEY);
  customEngines = Array.isArray(stored[CUSTOM_ENGINES_KEY])
    ? stored[CUSTOM_ENGINES_KEY]
    : [];

  enginesBody.innerHTML = "";
  for (const engine of customEngines) {
    addEngineRow(engine);
  }
}

// 現在の入力内容を配列として取得する（空行は除外）
function collectOptions() {
  const options = [];
  for (const tr of tbody.children) {
    const label = tr.querySelector(".label-input").value.trim();
    const prefix = tr.querySelector(".prefix-input").value.trim();
    const engine = tr.querySelector(".engine-select").value || DEFAULT_ENGINE;
    if (!label && !prefix) continue;
    options.push({ label, prefix, engine });
  }
  return options;
}

// 保存済みオプションを読み込んで画面に反映する
async function loadOptions() {
  const stored = await browser.storage.sync.get(STORAGE_KEY);
  const options = Array.isArray(stored[STORAGE_KEY])
    ? stored[STORAGE_KEY]
    : getDefaultOptions();

  tbody.innerHTML = "";
  for (const option of options) {
    addRow(option);
  }
  updateAddButtonState();
}

// 入力内容を保存する
async function saveOptions() {
  const options = collectOptions();
  const engines = collectCustomEngines();

  // カスタムエンジンの検証（URLに %s が含まれているか等）
  const error = validateCustomEngines(engines);
  if (error) {
    statusEl.textContent = error;
    statusEl.classList.add("error");
    return;
  }
  statusEl.classList.remove("error");

  // カスタムエンジンには一意なIDを付与する（既存のIDは維持する）
  const existingIds = new Map(customEngines.map((e) => [e.label + "\n" + e.url, e.id]));
  const savedEngines = engines.map((engine, index) => {
    const key = engine.label + "\n" + engine.url;
    const id = existingIds.get(key) || `custom-${Date.now()}-${index}`;
    return { id, label: engine.label, url: engine.url };
  });

  await browser.storage.sync.set({
    [STORAGE_KEY]: options,
    [CUSTOM_ENGINES_KEY]: savedEngines
  });

  // 保存後のカスタムエンジンを画面に反映する（IDの確定・選択状態の維持）
  customEngines = savedEngines;
  refreshEngineSelects();

  statusEl.textContent = browser.i18n.getMessage("savedStatus");
  setTimeout(() => {
    statusEl.textContent = "";
  }, 2000);
}

// 各オプション行の検索エンジン <select> を、最新のカスタムエンジン一覧で再構築する
function refreshEngineSelects() {
  for (const tr of tbody.children) {
    const select = tr.querySelector(".engine-select");
    const current = select.value;
    populateEngineSelect(select, current);
  }
}

addRowButton.addEventListener("click", () => addRow());
addEngineButton.addEventListener("click", () => addEngineRow());
saveButton.addEventListener("click", saveOptions);

// カスタムエンジンを先に読み込んでから、オプション行を描画する
// （オプション行の <select> にカスタムエンジンを含めるため）
async function init() {
  localizePage();
  await loadCustomEngines();
  await loadOptions();
}

init();

