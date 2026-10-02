# search-genius

Firefox addon that uses search engines as a genius.

選択したテキストを、あらかじめ登録した最大5個の「オプション付き」で検索できる Firefox アドオンです。

## 概要

テキストを選択して検索するとき、毎回 `site:example.com` や `filetype:pdf` といった検索演算子を手入力するのは面倒です。
このアドオンでは、よく使う検索条件（メニュー名・検索エンジン・プレフィックス）を登録しておき、選択テキストをワンクリックで条件付き検索できます。

## 主な機能

- **オプション付き検索**: 選択テキストの前に任意のプレフィックス（例: `site:stackoverflow.com`）を付けて検索します。
- **最大5個のオプション登録**: 設定ページでメニュー名・検索エンジン・プレフィックスを登録できます。
- **複数の検索エンジンに対応**: オプションごとに検索エンジンを選択できます。
  - DuckDuckGo（デフォルト）
  - Google
  - Google Images（画像検索）
  - Bing
  - Yahoo! JAPAN
  - YouTube
  - Wikipedia（日本語版）
- **カスタム検索エンジン**: 組み込みエンジンに加えて、独自の検索エンジンを登録できます。名前と、クエリを挿入する位置に `%s` を含む検索URL（例: `https://example.com/search?q=%s`）を設定すると、オプションの検索エンジンとして選択できるようになります。
- **環境に応じた呼び出し方法**:
  - デスクトップ版 Firefox: テキスト選択時の**右クリックメニュー**から検索。
  - `contextMenus` 非対応環境（Android版 Firefox / Iceraven 等）: テキスト選択時に表示される**ポップアップパネル**から検索。
- **設定の同期**: 登録したオプションは `storage.sync` に保存され、Firefox アカウントで同期されます。
- **多言語対応（日本語 / 英語）**: ブラウザの表示言語に合わせて UI を自動で切り替えます（`_locales` による i18n）。

## 使い方

### 1. オプションを設定する

アドオンの設定ページ（オプションページ）を開き、検索オプションを登録します。

| 項目 | 説明 |
| --- | --- |
| メニュー名 | 右クリックメニュー／パネルに表示される名前（例: `GitHub`） |
| 検索エンジン | 使用する検索エンジン |
| プレフィックス | 選択テキストの前に付与する検索演算子（例: `site:github.com`） |

「行を追加」で最大5個まで登録でき、「保存」で確定します。

#### カスタム検索エンジンを登録する

設定ページ下部の「カスタム検索エンジン」セクションで、独自の検索エンジンを登録できます。

| 項目 | 説明 |
| --- | --- |
| エンジン名 | 検索エンジンの選択肢に表示される名前（例: `マイ検索`） |
| 検索URL | クエリを挿入する位置に `%s` を含むURL（例: `https://example.com/search?q=%s`） |

「エンジンを追加」で行を追加し、「保存」で確定します。登録したエンジンは、各オプションの「検索エンジン」欄に「カスタム」グループとして表示され、選択できるようになります。検索URLに `%s` が含まれていない場合は保存時にエラーが表示されます。

### 2. 選択テキストを検索する

- **デスクトップ版 Firefox**: ページ上のテキストを選択 → 右クリック → 登録したメニュー名を選択。
- **Android版 Firefox / Iceraven 等**: ページ上のテキストを選択 → 表示されるパネルからメニュー名をタップ。

検索結果は、元のタブの隣に新しいタブで開きます。

## 初期オプション

未設定の場合は、ブラウザの表示言語に応じて以下のオプションが初期値として用意されています。

### 日本語環境

| メニュー名 | プレフィックス | 検索エンジン |
| --- | --- | --- |
| 5ch.io | `site:5ch.io` | DuckDuckGo |
| ja.wikipedia.org | `site:ja.wikipedia.org` | DuckDuckGo |
| 画像検索 | （なし） | Google Images |
| ニコニコ大百科 | `site:dic.nicovideo.jp` | DuckDuckGo |
| PDFのみ | `filetype:pdf` | DuckDuckGo |

### 日本語以外の環境

| メニュー名 | プレフィックス | 検索エンジン |
| --- | --- | --- |
| Stack Overflow | `site:stackoverflow.com` | DuckDuckGo |
| Wikipedia | `site:en.wikipedia.org` | DuckDuckGo |
| GitHub | `site:github.com` | DuckDuckGo |
| Image search | （なし） | Google Images |
| PDF only | `filetype:pdf` | DuckDuckGo |

### 初期カスタム検索エンジン

未設定の場合は、以下のカスタム検索エンジンが初期値として用意されています。

| エンジン名 | 検索URL |
| --- | --- |
| 5ch検索 | `https://find.5ch.io/search?q=%s` |
| ニコニコ大百科検索 | `https://dic.nicovideo.jp/s/al/t/%s/rev_created/desc/1-?query_type=t` |

## ファイル構成

| ファイル | 役割 |
| --- | --- |
| `manifest.json` | アドオンのマニフェスト（Manifest V3） |
| `background.js` | 右クリックメニューの構築、検索 URL の生成、タブを開く処理 |
| `content.js` | `contextMenus` 非対応環境向けの選択パネル |
| `options.html` / `options.js` | 検索オプションの設定ページ |
| `_locales/ja/messages.json` | 日本語の UI 文言 |
| `_locales/en/messages.json` | 英語の UI 文言 |
| `icons/` | アドオンのアイコン |

## 動作要件

- Firefox 109.0 以上（Manifest V3 対応）
- 権限: `contextMenus`, `tabs`, `storage`
- ホスト権限: `http://*/*`, `https://*/*`

## ライセンス

`LICENSE` を参照してください。
