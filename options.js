// 検索オプション設定ページのロジック
// 最大5個の検索オプション（メニュー名 + プレフィックス）を保存する。

const MAX_OPTIONS = 5;
const STORAGE_KEY = "searchOptions";

// 選択可能な検索エンジン（background.js と共通の定義）
const SEARCH_ENGINES = [
  { id: "duckduckgo", label: "DuckDuckGo", url: "https://duckduckgo.com/?q=%s" },
  { id: "google", label: "Google", url: "https://www.google.com/search?q=%s" },
  { id: "bing", label: "Bing", url: "https://www.bing.com/search?q=%s" },
  { id: "yahoo", label: "Yahoo! JAPAN", url: "https://search.yahoo.co.jp/search?p=%s" },
  { id: "youtube", label: "YouTube", url: "https://www.youtube.com/results?search_query=%s" },
  { id: "wikipedia", label: "Wikipedia", url: "https://ja.wikipedia.org/w/index.php?search=%s" }
];

const DEFAULT_ENGINE = "duckduckgo";

// 初期値（未設定時に使われる）
// ラベルはブラウザの表示言語に合わせてローカライズする
const DEFAULT_OPTIONS = [
  { label: browser.i18n.getMessage("optionStackOverflow"), prefix: "site:stackoverflow.com", engine: "duckduckgo" },
  { label: browser.i18n.getMessage("optionWikipedia"), prefix: "site:ja.wikipedia.org", engine: "duckduckgo" },
  { label: browser.i18n.getMessage("optionGitHub"), prefix: "site:github.com", engine: "duckduckgo" },
  { label: browser.i18n.getMessage("optionPdfOnly"), prefix: "filetype:pdf", engine: "duckduckgo" },
  { label: browser.i18n.getMessage("optionQiita"), prefix: "site:qiita.com", engine: "duckduckgo" }
];

const tbody = document.getElementById("options-body");
const addRowButton = document.getElementById("add-row");
const saveButton = document.getElementById("save");
const statusEl = document.getElementById("status");

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
  for (const engine of SEARCH_ENGINES) {
    const engineOption = document.createElement("option");
    engineOption.value = engine.id;
    engineOption.textContent = engine.label;
    engineSelect.appendChild(engineOption);
  }
  engineSelect.value = option.engine || DEFAULT_ENGINE;
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
    : DEFAULT_OPTIONS;

  tbody.innerHTML = "";
  for (const option of options) {
    addRow(option);
  }
  updateAddButtonState();
}

// 入力内容を保存する
async function saveOptions() {
  const options = collectOptions();
  await browser.storage.sync.set({ [STORAGE_KEY]: options });
  statusEl.textContent = browser.i18n.getMessage("savedStatus");
  setTimeout(() => {
    statusEl.textContent = "";
  }, 2000);
}

addRowButton.addEventListener("click", () => addRow());
saveButton.addEventListener("click", saveOptions);

localizePage();
loadOptions();

