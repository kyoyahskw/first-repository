# 💰 個人資産管理アプリ

Google Apps Script（GAS）と Google スプレッドシートをバックエンドに、Alpine.js + Chart.js でリッチなUIを実現した個人向け資産管理 Web アプリです。

## ✨ 機能

- **ダッシュボード** — 総資産額・ジャンル別残高・資産推移グラフ（棒グラフ・ドーナツチャート）を一覧表示
- **月次入力** — ジャンル別アコーディオン形式で各資産項目の金額を入力・保存
- **マスタ管理** — ジャンル・資産項目の追加・編集・表示切替（過去データを保持したまま非表示化）
- **データ削除** — 月単位でレコードを安全に削除（確認ダイアログ付き）

## 🛠️ 技術スタック

| レイヤー | 技術 |
|---|---|
| バックエンド | Google Apps Script (V8), Google Spreadsheet |
| フロントエンド | Alpine.js v3, Chart.js v4 |
| スタイル | Vanilla CSS（カスタムプロパティ使用） |
| アイコン | Font Awesome 6 |
| フォント | Google Fonts / Noto Sans JP |

## 📁 ファイル構成

```
.
├── Code.gs           # GAS サーバーサイドロジック（データ取得・保存・削除）
├── Index.html        # アプリのHTMLテンプレート
├── JavaScript.html   # フロントエンドロジック（Alpine.js）
├── Stylesheet.html   # スタイルシート（CSS）
└── appsscript.json   # GAS プロジェクト設定
```

## 🚀 セットアップ手順

### 1. Google スプレッドシートの準備

1. Google スプレッドシートを新規作成（または既存のものを使用）
2. メニューから **「拡張機能」→「Apps Script」** を選択

### 2. GAS プロジェクトにファイルを配置

以下の4ファイルを GAS プロジェクトに作成し、このリポジトリのコードを貼り付けます：

| GASファイル名 | 対応ファイル |
|---|---|
| `Code.gs` | [Code.gs](./Code.gs) |
| `Index.html` | [Index.html](./Index.html) |
| `JavaScript.html` | [JavaScript.html](./JavaScript.html) |
| `Stylesheet.html` | [Stylesheet.html](./Stylesheet.html) |

> **スタンドアロンスクリプトの場合**  
> `Code.gs` 内の `SPREADSHEET_ID` にスプレッドシートのIDを入力してください。  
> スプレッドシートにバインドされたスクリプトの場合は空欄のままで動作します。

### 3. Webアプリとしてデプロイ

1. GAS エディタ上部の **「デプロイ」→「新しいデプロイ」** をクリック
2. 種類: **「ウェブアプリ」** を選択
3. 以下の設定を入力：
   - **次のユーザーとして実行**: 自分
   - **アクセスできるユーザー**: 自分のみ
4. 「デプロイ」ボタンをクリックし、表示されたURLにアクセス

### 4. 初回起動

初回アクセス時に以下のシートが自動作成されます：

| シート名 | 内容 |
|---|---|
| `Categories` | ジャンル・資産項目マスタ（プリセットデータ付き） |
| `AssetRecords` | 月次資産記録データ |

## 🗂️ データ構造

### Categories シート

| 列 | 内容 |
|---|---|
| `genre_id` | ジャンルID（UUID） |
| `genre_name` | ジャンル名（例: 銀行口座、証券） |
| `item_id` | 資産項目ID（UUID） |
| `item_name` | 資産項目名（例: A銀行、財布） |
| `is_active` | 表示フラグ（TRUE / FALSE） |

### AssetRecords シート

| 列 | 内容 |
|---|---|
| `record_month` | 記録年月（YYYY-MM 形式） |
| `recorded_at` | 記録日時 |
| `item_id` | 資産項目ID（UUID） |
| `amount` | 金額（円） |

## ⚙️ clasp を使ったローカル開発

[clasp](https://github.com/google/clasp) を使用するとローカル環境でコードを管理・デプロイできます。

```bash
# clasp のインストール
npm install -g @google/clasp

# GAS プロジェクトにプッシュ
clasp push

# ブラウザで GAS エディタを開く
clasp open
```

> ⚠️ `.clasp.json` にはスクリプトIDが含まれるため、公開リポジトリへのコミットは避けてください。
