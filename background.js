// 選択テキストを保存済みオプション付きでDuckDuckGo検索する拡張機能
// 設定ページで登録した最大5個のオプションを、
// 右クリックメニュー（contextMenus対応環境）または
// content.jsの選択パネル（Android等contextMenus非対応環境）から呼び出す。

const STORAGE_KEY = "searchOptions";
const CUSTOM_ENGINES_KEY = "customEngines";
const STACKED_SITE_KEY = "stackedSite";
const MENU_ID_PREFIX = "search-option-";
const STACK_MENU_ID = "stack-current-site";
const UNSTACK_MENU_ID = "unstack-current-site";

// 選択可能な検索エンジン（options.js / content.js と共通の定義）
const SEARCH_ENGINES = {
  duckduckgo: "https://duckduckgo.com/?q=%s",
  google: "https://www.google.com/search?q=%s",
  "google-images": "https://www.google.com/search?tbm=isch&q=%s",
  bing: "https://www.bing.com/search?q=%s",
  yahoo: "https://search.yahoo.co.jp/search?p=%s",
  youtube: "https://www.youtube.com/results?search_query=%s",
  wikipedia: "https://ja.wikipedia.org/w/index.php?search=%s"
};

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

// インスタントサーチ（開いているサイト内を site: で検索する）オプション
// 常に6番目の選択肢として末尾に追加される
function getInstantSearchOption() {
  return {
    label: browser.i18n.getMessage("optionInstantSearch"),
    prefix: "",
    engine: DEFAULT_ENGINE,
    instant: true
  };
}

// オプション配列の末尾にインスタントサーチを必ず含める
// 新たに追加された場合は added: true を返す（呼び出し側で保存するため）
function ensureInstantSearchOption(options) {
  const hasInstant = options.some((option) => option.instant);
  const withoutInstant = options.filter((option) => !option.instant);
  return { options: [...withoutInstant, getInstantSearchOption()], added: !hasInstant };
}

// 初期カスタム検索エンジン（未設定時に使われる）
// ラベルはブラウザの表示言語に合わせてローカライズする
function getDefaultCustomEngines() {
  return [
    {
      id: "custom-5ch-search",
      label: browser.i18n.getMessage("engine5chSearch"),
      url: "https://find.5ch.io/search?q=%s"
    },
    {
      id: "custom-niconico-search",
      label: browser.i18n.getMessage("engineNicoNicoSearch"),
      url: "https://dic.nicovideo.jp/s/al/t/%s/rev_created/desc/1-?query_type=t"
    }
  ];
}

// 保存済みオプションを取得する
// インスタントサーチが未保存だった場合は、6番目の選択肢として上書き保存する
async function getOptions() {
  const stored = await browser.storage.sync.get(STORAGE_KEY);
  const base = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : getDefaultOptions();
  const { options, added } = ensureInstantSearchOption(base);

  if (added) {
    await browser.storage.sync.set({ [STORAGE_KEY]: options });
  }

  return options;
}

// 保存済みカスタム検索エンジンを取得する
async function getCustomEngines() {
  const stored = await browser.storage.sync.get(CUSTOM_ENGINES_KEY);
  return Array.isArray(stored[CUSTOM_ENGINES_KEY]) ? stored[CUSTOM_ENGINES_KEY] : getDefaultCustomEngines();
}

// スタック中のサイト（ホスト名）を取得する。未スタックなら空文字を返す
async function getStackedSite() {
  const stored = await browser.storage.sync.get(STACKED_SITE_KEY);
  return typeof stored[STACKED_SITE_KEY] === "string" ? stored[STACKED_SITE_KEY] : "";
}

// URLからホスト名を取り出す（取得できない場合は空文字）
function extractHostname(url) {
  if (!url) return "";
  try {
    return new URL(url).hostname || "";
  } catch (err) {
    return "";
  }
}

// 現在のタブのサイトをスタックする（同じサイトなら解除するトグル動作）
async function toggleStackedSite(tab) {
  const hostname = extractHostname(tab && tab.url);
  if (!hostname) return;

  const current = await getStackedSite();
  const next = current === hostname ? "" : hostname;
  await browser.storage.sync.set({ [STACKED_SITE_KEY]: next });
}

// ツールバーボタンのバッジとタイトルにスタック状態を反映する
async function updateActionState() {
  if (typeof browser.action === "undefined") return;

  const hostname = await getStackedSite();
  await browser.action.setBadgeText({ text: hostname ? "ON" : "" });
  await browser.action.setBadgeBackgroundColor({ color: "#2e7d32" });
  await browser.action.setTitle({
    title: hostname
      ? browser.i18n.getMessage("actionStackedTitle", [hostname])
      : browser.i18n.getMessage("actionStackSite")
  });
}

// エンジンIDから検索URLテンプレートを解決する
// 組み込みエンジンになければ、カスタムエンジン（storage保存）から探す
async function resolveEngineTemplate(engineId) {
  if (SEARCH_ENGINES[engineId]) return SEARCH_ENGINES[engineId];

  const customEngines = await getCustomEngines();
  const custom = customEngines.find((engine) => engine.id === engineId);
  if (custom && custom.url) return custom.url;

  return SEARCH_ENGINES[DEFAULT_ENGINE];
}

// 開いているページのURLから site: プレフィックスを組み立てる
// （インスタントサーチのフォールバック用。ホスト名が取得できない場合はプレフィックスなし）
function buildSitePrefix(originUrl) {
  if (!originUrl) return "";
  try {
    const hostname = new URL(originUrl).hostname;
    return hostname ? `site:${hostname}` : "";
  } catch (err) {
    return "";
  }
}

// オプションと選択テキストから検索URLを組み立てる
// （contextMenusルート・content.jsルートの両方から利用する共通ロジック）
async function buildSearchUrl(option, selectedText, originUrl) {
  let prefix;
  if (option.instant) {
    // インスタントサーチは、スタックしたサイトを優先して site: を組み立てる。
    // 未スタックの場合は、開いているページのホスト名にフォールバックする。
    const stacked = await getStackedSite();
    prefix = stacked ? `site:${stacked}` : buildSitePrefix(originUrl);
  } else {
    prefix = (option.prefix || "").trim();
  }

  const query = prefix ? `${prefix} ${selectedText}` : selectedText;
  const template = await resolveEngineTemplate(option.engine);
  return template.replace("%s", encodeURIComponent(query));
}

// 検索結果タブを開く
async function openSearchTab(option, selectedText, originIndex, originUrl) {
  try {
    const url = await buildSearchUrl(option, selectedText, originUrl);
    const createProps = { url, active: true };
    // 検索を開いた元タブのすぐ隣に新規タブを開く（originIndexが分かる場合のみ）
    if (typeof originIndex === "number") {
      createProps.index = originIndex + 1;
    }
    await browser.tabs.create(createProps);
  } catch (err) {
    // 失敗を握りつぶさずログに残す（原因調査のため）
    console.error("Search Genius: failed to open search tab", err);
  }
}

// 保存済みオプションから右クリックメニューを再構築する
// contextMenus APIが存在しない環境（Android版Firefox/Iceraven等）では何もしない
async function rebuildMenus() {
  if (typeof browser.contextMenus === "undefined") return;

  await browser.contextMenus.removeAll();

  const options = await getOptions();
  const stacked = await getStackedSite();

  options.forEach((option, index) => {
    let label = option.label || option.prefix || browser.i18n.getMessage("defaultOptionLabel", [String(index + 1)]);
    // インスタントサーチは、スタック中のサイト名をラベルに含めて分かりやすくする
    if (option.instant && stacked) {
      label = browser.i18n.getMessage("optionInstantSearchStacked", [stacked]);
    }
    browser.contextMenus.create({
      id: `${MENU_ID_PREFIX}${index}`,
      title: browser.i18n.getMessage("menuSearchTitle", [label]),
      contexts: ["selection"]
    });
  });

  // ページ上で「このサイトをスタック／解除」するメニュー（選択テキストがなくても使える）
  browser.contextMenus.create({
    id: STACK_MENU_ID,
    title: browser.i18n.getMessage("menuStackSite"),
    contexts: ["page"]
  });
  browser.contextMenus.create({
    id: UNSTACK_MENU_ID,
    title: browser.i18n.getMessage("menuUnstackSite"),
    contexts: ["page"],
    enabled: Boolean(stacked)
  });
}

// メニュークリック時に選択テキストをオプション付きで検索する
// （contextMenus対応環境のみ）
if (typeof browser.contextMenus !== "undefined") {
  browser.contextMenus.onClicked.addListener(async (info, tab) => {
    const menuId = String(info.menuItemId);

    // スタック／解除メニュー
    if (menuId === STACK_MENU_ID) {
      const hostname = extractHostname(tab && tab.url);
      if (hostname) {
        await browser.storage.sync.set({ [STACKED_SITE_KEY]: hostname });
      }
      return;
    }
    if (menuId === UNSTACK_MENU_ID) {
      await browser.storage.sync.set({ [STACKED_SITE_KEY]: "" });
      return;
    }

    const selectedText = info.selectionText;
    if (!selectedText) return;
    if (!menuId.startsWith(MENU_ID_PREFIX)) return;

    const index = Number(menuId.slice(MENU_ID_PREFIX.length));
    // イベントページが再起動した直後はメモリ上の状態が空のことがあるため、
    // クリック時点で保存済みオプションを読み直してから解決する
    const options = await getOptions();
    const option = options[index];
    if (!option) return;

    openSearchTab(option, selectedText, tab.index, tab.url);
  });
}

// ツールバーボタンのクリックで、現在のタブのサイトをスタック／解除する
// （Android等 contextMenus 非対応環境でもスタック操作を行えるようにする）
if (typeof browser.action !== "undefined") {
  browser.action.onClicked.addListener(async (tab) => {
    await toggleStackedSite(tab);
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

  openSearchTab(option, message.selectedText, sender.tab && sender.tab.index, sender.tab && sender.tab.url);
});

// ツールバーのボタンクリックで設定ページを開く
// （action APIが存在しない環境では何もしない）
if (typeof browser.action !== "undefined") {
  browser.action.onClicked.addListener(() => {
    browser.runtime.openOptionsPage();
  });
}

// 設定変更時にメニューを再構築する
// （カスタムエンジンの変更はメニュー表示には影響しないが、URL解決に使うため再構築しておく）
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== "sync") return;

  if (changes[STORAGE_KEY] || changes[CUSTOM_ENGINES_KEY] || changes[STACKED_SITE_KEY]) {
    rebuildMenus();
  }
  // スタック状態が変わったらツールバーボタンの表示も更新する
  if (changes[STACKED_SITE_KEY]) {
    updateActionState();
  }
});

// 起動時にメニューを構築し、ツールバーボタンの状態を反映する
rebuildMenus();
updateActionState();
