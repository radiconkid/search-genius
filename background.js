// 選択テキストを保存済みオプション付きでDuckDuckGo検索する拡張機能
// 設定ページで登録した最大5個のオプションを、
// 右クリックメニュー（contextMenus対応環境）または
// content.jsの選択パネル（Android等contextMenus非対応環境）から呼び出す。

const STORAGE_KEY = "searchOptions";
const MENU_ID_PREFIX = "search-option-";

// 選択可能な検索エンジン（options.js / content.js と共通の定義）
const SEARCH_ENGINES = {
  duckduckgo: "https://duckduckgo.com/?q=%s",
  google: "https://www.google.com/search?q=%s",
  bing: "https://www.bing.com/search?q=%s",
  yahoo: "https://search.yahoo.co.jp/search?p=%s",
  youtube: "https://www.youtube.com/results?search_query=%s",
  wikipedia: "https://ja.wikipedia.org/w/index.php?search=%s"
};

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

// 右クリックメニュー用に、現在構築済みのメニューIDとオプションの対応を保持する
let currentOptions = [];

// 保存済みオプションを取得する
async function getOptions() {
  const stored = await browser.storage.sync.get(STORAGE_KEY);
  return Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : DEFAULT_OPTIONS;
}

// オプションと選択テキストから検索URLを組み立てる
// （contextMenusルート・content.jsルートの両方から利用する共通ロジック）
function buildSearchUrl(option, selectedText) {
  const prefix = (option.prefix || "").trim();
  const query = prefix ? `${prefix} ${selectedText}` : selectedText;
  const template = SEARCH_ENGINES[option.engine] || SEARCH_ENGINES[DEFAULT_ENGINE];
  return template.replace("%s", encodeURIComponent(query));
}

// 検索結果タブを開く
function openSearchTab(option, selectedText, originIndex) {
  const url = buildSearchUrl(option, selectedText);
  const createProps = { url, active: true };
  // 検索を開いた元タブのすぐ隣に新規タブを開く（originIndexが分かる場合のみ）
  if (typeof originIndex === "number") {
    createProps.index = originIndex + 1;
  }
  browser.tabs.create(createProps);
}

// 保存済みオプションから右クリックメニューを再構築する
// contextMenus APIが存在しない環境（Android版Firefox/Iceraven等）では何もしない
async function rebuildMenus() {
  if (typeof browser.contextMenus === "undefined") return;

  await browser.contextMenus.removeAll();

  currentOptions = await getOptions();

  currentOptions.forEach((option, index) => {
    const label = option.label || option.prefix || browser.i18n.getMessage("defaultOptionLabel", [String(index + 1)]);
    browser.contextMenus.create({
      id: `${MENU_ID_PREFIX}${index}`,
      title: browser.i18n.getMessage("menuSearchTitle", [label]),
      contexts: ["selection"]
    });
  });
}

// メニュークリック時に選択テキストをオプション付きで検索する
// （contextMenus対応環境のみ）
if (typeof browser.contextMenus !== "undefined") {
  browser.contextMenus.onClicked.addListener((info, tab) => {
    const selectedText = info.selectionText;
    if (!selectedText) return;

    const menuId = String(info.menuItemId);
    if (!menuId.startsWith(MENU_ID_PREFIX)) return;

    const index = Number(menuId.slice(MENU_ID_PREFIX.length));
    const option = currentOptions[index];
    if (!option) return;

    openSearchTab(option, selectedText, tab.index);
  });
}

// content.js からのメッセージを受け取る
browser.runtime.onMessage.addListener(async (message, sender) => {
  if (!message) return;

  // content.js に contextMenus が利用可能かどうかを伝える。
  // contextMenus APIはcontent scriptからは参照できないため、
  // 実際にAPIを持つbackground側で判定して返す。
  if (message.type === "isContextMenuSupported") {
    return { supported: typeof browser.contextMenus !== "undefined" };
  }

  // content.js（contextMenus非対応環境の選択パネル）からの検索要求
  if (message.type !== "openSearch") return;
  if (!message.selectedText) return;

  const options = await getOptions();
  const option = options[message.optionIndex];
  if (!option) return;

  openSearchTab(option, message.selectedText, sender.tab && sender.tab.index);
});

// 設定変更時にメニューを再構築する
browser.storage.onChanged.addListener((changes, area) => {
  if (area === "sync" && changes[STORAGE_KEY]) {
    rebuildMenus();
  }
});

// 起動時にメニューを構築する
rebuildMenus();
