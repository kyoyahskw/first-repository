/**
 * 個人資産管理Webアプリ - Code.gs
 *
 * ============================================================
 * 【セットアップ手順】
 * 1. Google Spreadsheetを開く（新規 or 既存）
 * 2. メニュー「拡張機能」→「Apps Script」を選択
 * 3. 以下の4ファイルをGASプロジェクトに作成してコードを貼り付け:
 *    - Code.gs        （このファイル）
 *    - Index.html     （HTMLテンプレート）
 *    - Stylesheet.html（CSSスタイル）
 *    - JavaScript.html（フロントエンドJS）
 * 4. 「デプロイ」→「新しいデプロイ」→「種類: ウェブアプリ」
 *    - 次のユーザーとして実行: 自分
 *    - アクセスできるユーザー: 自分のみ
 * 5. 表示されたURLにアクセスして利用開始
 *
 * ※ スプレッドシートにバインドされたスクリプトの場合、
 *   SPREADSHEET_ID は空欄のままでOKです。
 * ============================================================
 */

// ============================================================
// 設定
// ============================================================
// バインドスクリプト（スプレッドシートから起動）の場合は空欄のまま
// スタンドアロンスクリプトの場合はスプレッドシートIDを記入
const SPREADSHEET_ID = '';

// シート名
const SHEET_CATEGORIES = 'Categories';
const SHEET_RECORDS    = 'AssetRecords';

// Categories シート 列インデックス（0始まり）
const CAT = {
  GENRE_ID:   0,  // A: ジャンルID (UUID)
  GENRE_NAME: 1,  // B: ジャンル名
  ITEM_ID:    2,  // C: 項目ID (UUID)
  ITEM_NAME:  3,  // D: 資産項目名
  IS_ACTIVE:  4,  // E: 有効フラグ (TRUE/FALSE)
};

// AssetRecords シート 列インデックス（0始まり）
const REC = {
  MONTH:     0,  // A: 記録年月 (YYYY-MM)
  TIMESTAMP: 1,  // B: 記録日時
  ITEM_ID:   2,  // C: 項目ID (UUID)
  AMOUNT:    3,  // D: 金額
};

// ============================================================
// エントリーポイント
// ============================================================

/**
 * Webアプリのエントリーポイント。
 * スプレッドシートの初期化を行い、Index.html を返す。
 */
function doGet(e) {
  initSpreadsheet_();
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('💰 個人資産管理')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * HTMLテンプレート内でCSSやJSファイルをインクルードするヘルパー。
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ============================================================
// 内部ヘルパー
// ============================================================

function getSpreadsheet_() {
  return SPREADSHEET_ID
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet_(name) {
  const ss = getSpreadsheet_();
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

/**
 * 月の値が Date オブジェクトになってしまった場合に対応するフォーマッタ
 */
function formatMonthValue_(val) {
  if (Object.prototype.toString.call(val) === '[object Date]') {
    return Utilities.formatDate(val, Session.getScriptTimeZone(), 'yyyy-MM');
  }
  return String(val);
}

// ============================================================
// 初期化（シートと初期データの自動生成）
// ============================================================

/**
 * アプリ起動時にシートが存在しない場合は自動生成し、
 * プリセットデータを投入する。
 */
function initSpreadsheet_() {
  const ss = getSpreadsheet_();

  // Categories シート初期化
  if (!ss.getSheetByName(SHEET_CATEGORIES)) {
    const s = ss.insertSheet(SHEET_CATEGORIES);
    s.getRange('A1:E1').setValues([
      ['genre_id', 'genre_name', 'item_id', 'item_name', 'is_active']
    ]);
    s.getRange('A1:E1')
      .setFontWeight('bold')
      .setBackground('#1e3a5f')
      .setFontColor('#ffffff');
    s.setFrozenRows(1);

    // プリセットデータ（ジャンル・項目）
    const preset = [
      ['銀行口座', 'A銀行'],
      ['銀行口座', 'B銀行'],
      ['証券',    'C証券'],
      ['現金',    '財布'],
      ['ポイント', 'Tポイント'],
      ['その他',  'その他'],
    ];
    const genreIds = {};
    const rows = preset.map(([genreName, itemName]) => {
      if (!genreIds[genreName]) genreIds[genreName] = Utilities.getUuid();
      return [genreIds[genreName], genreName, Utilities.getUuid(), itemName, true];
    });
    s.getRange(2, 1, rows.length, 5).setValues(rows);
    s.autoResizeColumns(1, 5);
  }

  // AssetRecords シート初期化
  if (!ss.getSheetByName(SHEET_RECORDS)) {
    const s = ss.insertSheet(SHEET_RECORDS);
    s.getRange('A1:D1').setValues([
      ['record_month', 'recorded_at', 'item_id', 'amount']
    ]);
    s.getRange('A1:D1')
      .setFontWeight('bold')
      .setBackground('#1e3a5f')
      .setFontColor('#ffffff');
    s.setFrozenRows(1);
  }
}

// ============================================================
// データ取得（クライアントから呼び出し可能）
// ============================================================

/**
 * アプリ起動時に必要なデータを一括取得する。
 * @return {{ categories, monthList, currentMonth, allMonthlyData }}
 */
function getInitialData() {
  const categories    = getCategories_();
  const monthList     = getMonthList_();
  const tz            = Session.getScriptTimeZone();
  const currentMonth  = Utilities.formatDate(new Date(), tz, 'yyyy-MM');

  // 今月は必ずリストに含める
  if (!monthList.includes(currentMonth)) monthList.unshift(currentMonth);

  const allMonthlyData = buildAllMonthlyData_(categories);

  return { categories, monthList, currentMonth, allMonthlyData };
}

/**
 * 指定した月のレコード { item_id: amount } を返す。
 * @param {string} month - "YYYY-MM" 形式
 * @return {Object} { item_id: number }
 */
function getMonthRecords(month) {
  const sheet = getSheet_(SHEET_RECORDS);
  const last = sheet.getLastRow();
  if (last < 2) return {};

  const rows = sheet.getRange(2, 1, last - 1, 4).getValues();
  const result = {};
  rows.forEach(r => {
    if (formatMonthValue_(r[REC.MONTH]) === month) {
      result[String(r[REC.ITEM_ID])] = Number(r[REC.AMOUNT]) || 0;
    }
  });
  return result;
}

// --- 内部：全カテゴリ取得 ---
function getCategories_() {
  const sheet = getSheet_(SHEET_CATEGORIES);
  const last = sheet.getLastRow();
  if (last < 2) return [];

  return sheet.getRange(2, 1, last - 1, 5).getValues().map(r => ({
    genre_id:   String(r[CAT.GENRE_ID]),
    genre_name: String(r[CAT.GENRE_NAME]),
    item_id:    String(r[CAT.ITEM_ID]),
    item_name:  String(r[CAT.ITEM_NAME]),
    is_active:  r[CAT.IS_ACTIVE] === true ||
                String(r[CAT.IS_ACTIVE]).toLowerCase() === 'true',
  }));
}

// --- 内部：記録済み月リスト（降順） ---
function getMonthList_() {
  const sheet = getSheet_(SHEET_RECORDS);
  const last = sheet.getLastRow();
  if (last < 2) return [];

  const months = sheet.getRange(2, 1, last - 1, 1).getValues().flat();
  return [
    ...new Set(
      months
        .map(formatMonthValue_)
        .filter(m => /^\d{4}-\d{2}$/.test(m))
    )
  ].sort().reverse();
}

// --- 内部：全月の集計データ構築 ---
function buildAllMonthlyData_(categories) {
  const sheet = getSheet_(SHEET_RECORDS);
  const last = sheet.getLastRow();
  if (last < 2) return [];

  // バッチ取得（ループ内での getValue 呼び出しを避ける）
  const rows = sheet.getRange(2, 1, last - 1, 4).getValues();

  // item_id → genre_name マッピング
  const itemGenreMap = {};
  categories.forEach(c => { itemGenreMap[c.item_id] = c.genre_name; });

  // 月ごとにグループ化
  const monthMap = {};
  rows.forEach(r => {
    const month  = formatMonthValue_(r[REC.MONTH]);
    const itemId = String(r[REC.ITEM_ID]);
    const amount = Number(r[REC.AMOUNT]) || 0;
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    if (!monthMap[month]) monthMap[month] = {};
    monthMap[month][itemId] = amount;
  });

  // 月昇順で集計データを構築
  return Object.keys(monthMap).sort().map(month => {
    const records = monthMap[month];
    const total   = Object.values(records).reduce((s, v) => s + v, 0);
    const genreTotals = {};
    Object.entries(records).forEach(([id, amt]) => {
      const genre = itemGenreMap[id] || '不明';
      genreTotals[genre] = (genreTotals[genre] || 0) + amt;
    });
    return { month, total, genreTotals, records };
  });
}

// ============================================================
// データ保存・削除（クライアントから呼び出し可能）
// ============================================================

/**
 * 指定した月のレコードを保存する。
 * 同月のデータが既に存在する場合は上書き（LockServiceで排他制御）。
 * @param {string} month - "YYYY-MM" 形式
 * @param {Object} records - { item_id: amount }
 */
function saveAssetRecords(month, records) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000); // 最大30秒待機

    const sheet = getSheet_(SHEET_RECORDS);
    const tz    = Session.getScriptTimeZone();
    const ts    = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd HH:mm:ss');
    const last  = sheet.getLastRow();

    // 既存データを読み込み、対象月以外を保持（バッチ処理）
    let keepRows = [];
    if (last > 1) {
      const existing = sheet.getRange(2, 1, last - 1, 4).getValues();
      keepRows = existing.filter(r => formatMonthValue_(r[REC.MONTH]) !== month);
      sheet.getRange(2, 1, last - 1, 4).clearContent();
      if (keepRows.length > 0) {
        sheet.getRange(2, 1, keepRows.length, 4).setValues(keepRows);
      }
    }

    // 新しいデータを追記（バッチ書き込み）
    const newRows = Object.entries(records).map(
      ([id, amt]) => [month, ts, id, Number(amt) || 0]
    );

    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 4).setValues(newRows);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * 指定した月のレコードを全件削除する。
 * @param {string} month - "YYYY-MM" 形式
 */
function deleteMonthRecords(month) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const sheet = getSheet_(SHEET_RECORDS);
    const last  = sheet.getLastRow();
    if (last < 2) return { success: true };

    const existing = sheet.getRange(2, 1, last - 1, 4).getValues();
    const keepRows = existing.filter(r => formatMonthValue_(r[REC.MONTH]) !== month);
    sheet.getRange(2, 1, last - 1, 4).clearContent();
    if (keepRows.length > 0) {
      sheet.getRange(2, 1, keepRows.length, 4).setValues(keepRows);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}

/**
 * マスタ（Categories シート）を全件保存する。
 * @param {Array} categoriesData - [{genre_id, genre_name, item_id, item_name, is_active}]
 */
function saveCategories(categoriesData) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);

    const sheet = getSheet_(SHEET_CATEGORIES);
    const last  = sheet.getLastRow();
    if (last > 1) sheet.getRange(2, 1, last - 1, 5).clearContent();

    if (categoriesData && categoriesData.length > 0) {
      const rows = categoriesData.map(c => [
        c.genre_id, c.genre_name, c.item_id, c.item_name, c.is_active,
      ]);
      sheet.getRange(2, 1, rows.length, 5).setValues(rows);
    }

    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  } finally {
    lock.releaseLock();
  }
}
