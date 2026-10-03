// contextMenus APIが非対応の環境（Android版Firefox/Iceraven等）向け:
// テキスト選択時に検索オプション一覧をポップアップパネルとして表示する。
// contextMenus APIが使える環境（デスクトップ等）では
// 右クリックメニューが使えるため、このパネルは有効化しない。
//
// 注意: contextMenus APIはcontent scriptからは参照できないため、
// content script側では利用可否を判定できない。
// background.js に問い合わせて、contextMenus が使えない場合のみパネルを有効化する。

const STORAGE_KEY = "searchOptions";
const STACKED_SITE_KEY = "stackedSite";

// 未設定時に使われる初期値（background.js / options.js と共通の定義）
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
// 常に6番目の選択肢として末尾に追加される（background.js と共通の定義）
function getInstantSearchOption() {
  return {
    label: browser.i18n.getMessage("optionInstantSearch"),
    prefix: "",
    engine: "duckduckgo",
    instant: true
  };
}

// オプション配列の末尾にインスタントサーチを必ず含める
function ensureInstantSearchOption(options) {
  const withoutInstant = options.filter((option) => !option.instant);
  return [...withoutInstant, getInstantSearchOption()];
}

// contextMenus が使えない環境（Android版Firefox/Iceraven等）でのみ選択パネルを有効化する。
// contextMenus APIはcontent scriptからは参照できないため、background.js に問い合わせる。
browser.runtime
  .sendMessage({ type: "isContextMenuSupported" })
  .then((response) => {
    if (response && response.supported === false) {
      initSelectionPanel();
    }
  })
  .catch(() => {
    // 判定できない場合はパネルを有効化しない（デスクトップでの誤表示を防ぐ）
  });

function initSelectionPanel() {
  let selectedText = "";
  let panel = null;

  function removePanel() {
    if (panel) {
      panel.remove();
      panel = null;
    }
  }

  document.addEventListener("selectionchange", () => {
    selectedText = window.getSelection().toString().trim();
  });

  document.addEventListener("touchend", handleSelectionEnd, { passive: true });
  document.addEventListener("mouseup", handleSelectionEnd);
  document.addEventListener("scroll", removePanel, { passive: true });

  async function handleSelectionEnd(event) {
    // パネル自身のタップ／クリックでパネルが消えないようにする
    if (panel && panel.contains(event.target)) return;
    removePanel();

    if (!selectedText) return;

    const selection = window.getSelection();
    if (!selection.rangeCount) return;

    const rect = selection.getRangeAt(0).getBoundingClientRect();
    if (rect.width === 0 && rect.height === 0) return;

    const options = await getOptions();
    if (!options.length) return;

    showPanel(rect, options);
  }

  async function getOptions() {
    try {
      const stored = await browser.storage.sync.get([STORAGE_KEY, STACKED_SITE_KEY]);
      const base = Array.isArray(stored[STORAGE_KEY]) ? stored[STORAGE_KEY] : getDefaultOptions();
      const stacked = typeof stored[STACKED_SITE_KEY] === "string" ? stored[STACKED_SITE_KEY] : "";
      return applyStackedLabel(ensureInstantSearchOption(base), stacked);
    } catch (err) {
      return ensureInstantSearchOption(getDefaultOptions());
    }
  }

  // スタック中のサイトがある場合、インスタントサーチのラベルにサイト名を反映する
  function applyStackedLabel(options, stacked) {
    if (!stacked) return options;
    return options.map((option) =>
      option.instant
        ? { ...option, label: browser.i18n.getMessage("optionInstantSearchStacked", [stacked]) }
        : option
    );
  }

  function showPanel(rect, options) {
    panel = document.createElement("div");
    Object.assign(panel.style, {
      position: "absolute",
      top: `${window.scrollY + rect.bottom + 6}px`,
      left: `${window.scrollX + rect.left}px`,
      zIndex: 2147483647,
      background: "#222",
      color: "#fff",
      borderRadius: "8px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.4)",
      fontSize: "14px",
      overflow: "hidden",
      maxWidth: "80vw"
    });

    options.forEach((option, index) => {
      const item = document.createElement("div");
      const label = option.label || option.prefix || browser.i18n.getMessage("defaultOptionLabel", [String(index + 1)]);
      item.textContent = label;
      Object.assign(item.style, {
        padding: "10px 14px",
        cursor: "pointer",
        borderBottom: index < options.length - 1 ? "1px solid #444" : "none",
        whiteSpace: "nowrap"
      });
      item.addEventListener("click", (ev) => {
        ev.stopPropagation();
        browser.runtime.sendMessage({
          type: "openSearch",
          optionIndex: index,
          selectedText
        });
        removePanel();
      });
      panel.appendChild(item);
    });

    document.body.appendChild(panel);
  }
}
