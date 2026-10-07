// ============================================================
// アプリ全体で使う保存先のキーと初期設定
// ============================================================

// localStorage内で勤怠データを保存するときの名前
const STORAGE_KEY = "attendanceApp_data_v1";
const SETTINGS_KEY = "attendanceApp_settings_v1";

// 何も設定されていない初回起動時に使用する勤務時間
const DEFAULT_SETTINGS = {
  startTime: "09:00",
  endTime: "18:15",
  lateStart: "09:15",
  pmLeaveStart: "13:00"
};

// 休日判定に使用する祝日一覧
// 2026～2027年の祝日をJavaScript内に保持
const HOLIDAYS = {
  // 2026
  "2026-01-01": "元日",
  "2026-01-12": "成人の日",
  "2026-02-11": "建国記念の日",
  "2026-02-23": "天皇誕生日",
  "2026-03-20": "春分の日",
  "2026-04-29": "昭和の日",
  "2026-05-03": "憲法記念日",
  "2026-05-04": "みどりの日",
  "2026-05-05": "こどもの日",
  "2026-05-06": "振替休日",
  "2026-07-20": "海の日",
  "2026-08-11": "山の日",
  "2026-09-21": "敬老の日",
  "2026-09-22": "秋分の日",
  "2026-10-12": "スポーツの日",
  "2026-11-03": "文化の日",
  "2026-11-23": "勤労感謝の日",

  // 2027
  "2027-01-01": "元日",
  "2027-01-11": "成人の日",
  "2027-02-11": "建国記念の日",
  "2027-02-23": "天皇誕生日",
  "2027-03-21": "春分の日",
  "2027-03-22": "振替休日",
  "2027-04-29": "昭和の日",
  "2027-05-03": "憲法記念日",
  "2027-05-04": "みどりの日",
  "2027-05-05": "こどもの日",
  "2027-07-19": "海の日",
  "2027-08-11": "山の日",
  "2027-09-20": "敬老の日",
  "2027-09-23": "秋分の日",
  "2027-10-11": "スポーツの日",
  "2027-11-03": "文化の日",
  "2027-11-23": "勤労感謝の日"
};

// 画面に表示する勤務状態の日本語ラベル
const STATUS_LABELS = {
  normal: "通常勤務",
  late: "遅刻",
  pm_leave: "PM休",
  holiday: "休日"
};

// 起動時に保存済みの設定を読み込む
let settings = loadSettings();

// HTMLの読み込みが完了したら、イベント設定と画面描画を開始
document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  renderAll();
});

// ============================================================
// ボタンなどのイベント設定
// ============================================================
function bindEvents() {
  document.getElementById("lateBtn").addEventListener("click", registerLate);
  document.getElementById("pmLeaveBtn").addEventListener("click", registerPmLeave);
  document.getElementById("endBtn").addEventListener("click", registerEndTime);
  document.getElementById("editTodayBtn").addEventListener("click", openEditModal);
  document.getElementById("settingsBtn").addEventListener("click", () => switchView("settingsView"));
  document.getElementById("copyBtn").addEventListener("click", copyAttendance);
  document.getElementById("saveSettingsBtn").addEventListener("click", saveSettingsFromForm);
  document.getElementById("closeModalBtn").addEventListener("click", closeEditModal);
  document.getElementById("saveTodayBtn").addEventListener("click", saveTodayEdit);
  document.getElementById("deleteTodayBtn").addEventListener("click", deleteToday);

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.addEventListener("click", () => switchView(btn.dataset.view));
  });
}

// ============================================================
// 画面切り替え
// ============================================================
function switchView(viewId) {
  document.querySelectorAll(".view").forEach(view => view.classList.remove("active"));
  document.getElementById(viewId).classList.add("active");

  document.querySelectorAll(".nav-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.view === viewId);
  });

  if (viewId === "historyView") {
    renderHistory();
  }

  if (viewId === "settingsView") {
    renderSettings();
  }
}

// 画面に表示する情報をまとめて再描画
function renderAll() {
  renderToday();
  renderHistory();
  renderSettings();
}

// 今日の日付・勤怠状態・開始／終了時刻を画面へ反映
function renderToday() {
  const today = new Date();
  const dateKey = formatDateKey(today);
  const data = getAttendance(dateKey);
  const period = getAttendancePeriod(today);

  document.getElementById("todayText").textContent =
    `${today.getFullYear()}年${today.getMonth() + 1}月${today.getDate()}日（${getDayName(today)}）`;

  document.getElementById("periodText").textContent =
    `勤怠期間：${formatDateJP(period.start)} ～ ${formatDateJP(period.end)}`;

  document.getElementById("todayStatus").textContent =
    data ? STATUS_LABELS[data.status] || "登録済み" : "未登録";

  document.getElementById("todayStart").textContent =
    data?.startTime || "--:--";

  document.getElementById("todayEnd").textContent =
    data?.endTime || "--:--";
}

// 「遅刻」ボタン：開始時刻を入力して遅刻として保存
function registerLate() {
  const existing = getAttendance(formatDateKey(new Date()));
  const startTime = prompt(
    "出勤時刻を入力してください",
    existing?.startTime || settings.lateStart
  );

  if (startTime === null) return;

  if (!isValidTime(startTime)) {
    showToast("時刻はHH:MM形式で入力してください");
    return;
  }

  saveAttendance({
    date: formatDateKey(new Date()),
    startTime,
    endTime: existing?.endTime || null,
    status: "late",
    memo: existing?.memo || ""
  });

  renderAll();
  showToast("遅刻として登録しました");
}

// 「PM休」ボタン：設定したPM休開始時刻で勤怠を保存
function registerPmLeave() {
  const existing = getAttendance(formatDateKey(new Date()));

  if (!confirm("本日をPM休として登録しますか？")) return;

  saveAttendance({
    date: formatDateKey(new Date()),
    startTime: settings.pmLeaveStart,
    endTime: existing?.endTime || null,
    status: "pm_leave",
    memo: existing?.memo || ""
  });

  renderAll();
  showToast("PM休として登録しました");
}

// 「終了時刻を登録」ボタン：現在時刻を15分単位で切り捨てて保存
function registerEndTime() {
  const now = new Date();
  const rounded = roundDownTo15Minutes(now);
  const endTime = formatTime(rounded);
  const dateKey = formatDateKey(now);
  const existing = getAttendance(dateKey);

  saveAttendance({
    date: dateKey,
    startTime: existing?.startTime || settings.startTime,
    endTime,
    status: existing?.status || "normal",
    memo: existing?.memo || ""
  });

  renderAll();
  showToast(`終了時刻 ${endTime} で登録しました`);
}

// 今日の勤怠編集モーダルを開き、現在の値を入力欄へ設定
function openEditModal() {
  const data = getAttendance(formatDateKey(new Date()));

  document.getElementById("editStatus").value = data?.status || "normal";
  document.getElementById("editStart").value = data?.startTime || settings.startTime;
  document.getElementById("editEnd").value = data?.endTime || settings.endTime;
  document.getElementById("editMemo").value = data?.memo || "";

  document.getElementById("editModal").classList.remove("hidden");
}

// 編集モーダルを閉じる
function closeEditModal() {
  document.getElementById("editModal").classList.add("hidden");
}

// 編集モーダルで変更した今日の勤怠を保存
function saveTodayEdit() {
  const startTime = document.getElementById("editStart").value;
  const endTime = document.getElementById("editEnd").value;
  const status = document.getElementById("editStatus").value;
  const memo = document.getElementById("editMemo").value.trim();

  if (startTime && !isValidTime(startTime)) {
    showToast("開始時刻を確認してください");
    return;
  }

  if (endTime && !isValidTime(endTime)) {
    showToast("終了時刻を確認してください");
    return;
  }

  saveAttendance({
    date: formatDateKey(new Date()),
    startTime: startTime || null,
    endTime: endTime || null,
    status,
    memo
  });

  closeEditModal();
  renderAll();
  showToast("勤怠を保存しました");
}

// 今日の勤怠データをlocalStorageから削除
function deleteToday() {
  if (!confirm("今日の勤怠データを削除しますか？")) return;

  const data = loadData();
  delete data[formatDateKey(new Date())];
  saveData(data);

  closeEditModal();
  renderAll();
  showToast("削除しました");
}

// 現在の勤怠期間（X/16～X/15）を一覧表示
function renderHistory() {
  const now = new Date();
  const period = getAttendancePeriod(now);
  const list = createAttendanceList(period.start, period.end);

  document.getElementById("historyPeriod").textContent =
    `${formatDateJP(period.start)} ～ ${formatDateJP(period.end)}`;

  const container = document.getElementById("historyList");
  container.innerHTML = "";

  const header = document.createElement("div");
  header.className = "history-item header";
  header.innerHTML = "<div>日付</div><div>開始</div><div>終了</div>";
  container.appendChild(header);

  list.forEach(item => {
    const row = document.createElement("div");
    row.className = "history-item";

    if (item.isWeekend) row.classList.add("weekend");
    if (item.holiday) row.classList.add("holiday");

    const data = item.attendance;

    row.innerHTML = `
      <div class="history-date">
        ${formatDateJP(item.date)}
        <small>${item.day}${item.holiday ? " ・ " + item.holiday : ""}</small>
        ${data ? `<small class="history-status">${STATUS_LABELS[data.status] || ""}</small>` : ""}
      </div>
      <div>${data?.startTime || ""}</div>
      <div>${data?.endTime || ""}</div>
    `;

    row.addEventListener("click", () => openEditForDate(item.date));
    container.appendChild(row);
  });
}

// 履歴一覧の過去日を簡易編集
function openEditForDate(date) {
  // 「今日の編集」を基本としているため、過去日の編集は簡易的にプロンプトで対応
  const data = getAttendance(date);

  const startTime = prompt("開始時刻（空欄で変更なし）", data?.startTime || "");
  if (startTime === null) return;

  const endTime = prompt("終了時刻（空欄で変更なし）", data?.endTime || "");
  if (endTime === null) return;

  if (startTime && !isValidTime(startTime)) {
    showToast("開始時刻を確認してください");
    return;
  }

  if (endTime && !isValidTime(endTime)) {
    showToast("終了時刻を確認してください");
    return;
  }

  saveAttendance({
    date,
    startTime: startTime || null,
    endTime: endTime || null,
    status: data?.status || "normal",
    memo: data?.memo || ""
  });

  renderHistory();
  renderToday();
  showToast("勤怠を更新しました");
}

// 履歴を「日付[TAB]開始[TAB]終了」の形式でコピー
// 勤怠表へそのまま貼り付けることを想定
function copyAttendance() {
  const now = new Date();
  const period = getAttendancePeriod(now);
  const list = createAttendanceList(period.start, period.end);

  const text = list.map(item => {
    const data = item.attendance;
    return [
      formatDateJP(item.date),
      data?.startTime || "",
      data?.endTime || ""
    ].join("\t");
  }).join("\n");

  if (!navigator.clipboard) {
    showToast("このブラウザではコピー機能を利用できません");
    return;
  }

  navigator.clipboard.writeText(text)
    .then(() => showToast("勤怠表用データをコピーしました"))
    .catch(() => showToast("コピーに失敗しました"));
}

// 保存済みの設定値を設定画面へ表示
function renderSettings() {
  document.getElementById("defaultStart").value = settings.startTime;
  document.getElementById("defaultEnd").value = settings.endTime;
  document.getElementById("lateStart").value = settings.lateStart;
  document.getElementById("pmLeaveStart").value = settings.pmLeaveStart;
}

// 設定画面の入力値をチェックしてlocalStorageへ保存
function saveSettingsFromForm() {
  const newSettings = {
    startTime: document.getElementById("defaultStart").value,
    endTime: document.getElementById("defaultEnd").value,
    lateStart: document.getElementById("lateStart").value,
    pmLeaveStart: document.getElementById("pmLeaveStart").value
  };

  if (Object.values(newSettings).some(v => !isValidTime(v))) {
    showToast("設定時刻を確認してください");
    return;
  }

  settings = newSettings;
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  renderToday();
  showToast("設定を保存しました");
}

// 指定した期間の日付を1日ずつ作り、勤怠データ・土日・祝日情報をまとめる
function createAttendanceList(startDate, endDate) {
  const result = [];
  const current = new Date(startDate);

  while (current <= endDate) {
    const date = new Date(current);
    const key = formatDateKey(date);

    result.push({
      date,
      day: getDayName(date),
      isWeekend: isWeekend(date),
      holiday: HOLIDAYS[key] || "",
      attendance: getAttendance(key)
    });

    current.setDate(current.getDate() + 1);
  }

  return result;
}

// 勤怠期間をX/16～X/15で計算
// 例：10/8なら9/16～10/15、10/20なら10/16～11/15
function getAttendancePeriod(date) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();

  if (day >= 16) {
    return {
      start: new Date(year, month, 16),
      end: new Date(year, month + 1, 15)
    };
  }

  return {
    start: new Date(year, month - 1, 16),
    end: new Date(year, month, 15)
  };
}

// 現在時刻を15分単位で切り捨て
// 例：18:25 → 18:15、18:14 → 18:00
function roundDownTo15Minutes(date) {
  const result = new Date(date);
  result.setMinutes(Math.floor(result.getMinutes() / 15) * 15);
  result.setSeconds(0);
  result.setMilliseconds(0);
  return result;
}

// 土曜日または日曜日かを判定
function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}

// Dateから日本語の曜日名を取得
function getDayName(date) {
  return ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];
}

// Dateを「HH:MM」の文字列へ変換
function formatTime(date) {
  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

// 日付をlocalStorageのキーとして使いやすい「YYYY-MM-DD」に変換
function formatDateKey(date) {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0")
  ].join("-");
}

// 日付を画面表示用の「M/D」に変換
function formatDateJP(dateOrKey) {
  const date = typeof dateOrKey === "string"
    ? new Date(`${dateOrKey}T00:00:00`)
    : dateOrKey;

  return `${date.getMonth() + 1}/${date.getDate()}`;
}

// 入力された時刻がHH:MM形式として正しいか確認
function isValidTime(value) {
  return /^\d{2}:\d{2}$/.test(value) &&
    Number(value.slice(0, 2)) >= 0 &&
    Number(value.slice(0, 2)) <= 23 &&
    Number(value.slice(3, 5)) >= 0 &&
    Number(value.slice(3, 5)) <= 59;
}

// 指定日の勤怠データをlocalStorageから取得
function getAttendance(dateKey) {
  const data = loadData();
  return data[dateKey] || null;
}

// 指定日の勤怠データを保存
// 同じ日付がすでにあれば、その日のデータを上書き
function saveAttendance(record) {
  const data = loadData();
  data[record.date] = record;
  saveData(data);
}

// localStorageから勤怠データ全体を読み込み
// 保存データが壊れている場合は空データとして扱う
function loadData() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

// 勤怠データ全体をJSONへ変換してlocalStorageへ保存
function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// 保存済み設定を読み込み　未保存の項目は初期値で補う
function loadSettings() {
  try {
    return {
      ...DEFAULT_SETTINGS,
      ...(JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {})
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

// トースト表示のタイマー　連続操作時に前のタイマーを解除するために使用
let toastTimer;

// 「保存しました」などの短いメッセージを画面下部に一時表示
function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove("show");
  }, 2200);
}
