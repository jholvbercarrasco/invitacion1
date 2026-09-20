const SPREADSHEET_ID = "1nFllZ5zUIhYqKNT_vPX8BZJ2H9JSsbdJDyjeUgA_Ykw";
const SHEET_NAME = "Invitados";
const FIRST_DATA_ROW = 8;
const COL_NAME = 1;
const COL_ASSIGNED = 2;
const COL_USED = 3;
const COL_STATUS = 5;
const COL_UPDATED = 6;
const COL_TOKEN = 8;
const DEADLINE = new Date("2026-10-20T23:59:59-05:00");

function doGet(e) {
  try {
    const action = String(e.parameter.action || "get");
    if (action !== "get") return json_({ ok: false, message: "Acción no válida." });
    const record = findGuest_(String(e.parameter.token || ""));
    return json_({ ok: true, invitation: publicInvitation_(record) });
  } catch (error) {
    return json_({ ok: false, message: error.message });
  }
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const action = String(e.parameter.action || "respond");
    if (action !== "respond") return json_({ ok: false, message: "Acción no válida." });
    if (new Date() > DEADLINE) return json_({ ok: false, message: "El plazo de confirmación ha finalizado." });

    const record = findGuest_(String(e.parameter.token || ""));
    const status = String(e.parameter.status || "Confirmado");
    if (!["Confirmado", "No asistirá"].includes(status)) {
      return json_({ ok: false, message: "La respuesta no es válida." });
    }
    const passes = status === "No asistirá" ? 0 : Number(e.parameter.passes);
    if (status === "Confirmado" && (!Number.isInteger(passes) || passes < 1 || passes > record.assigned)) {
      return json_({ ok: false, message: "La cantidad de pases no es válida." });
    }

    record.sheet.getRange(record.row, COL_USED).setValue(passes);
    record.sheet.getRange(record.row, COL_STATUS).setValue(status);
    record.sheet.getRange(record.row, COL_UPDATED).setValue(new Date());
    SpreadsheetApp.flush();

    return json_({
      ok: true,
      invitation: {
        name: record.name,
        maxPasses: record.assigned,
        status,
        confirmed: status === "Confirmado",
        used: passes,
        token: record.token,
      },
    });
  } catch (error) {
    return json_({ ok: false, message: error.message });
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function findGuest_(token) {
  if (!/^[a-f0-9]{24}$/.test(token)) throw new Error("Enlace de invitación no válido.");
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(SHEET_NAME);
  if (!sheet) throw new Error("No se encontró la hoja de invitados.");
  const rowCount = sheet.getLastRow() - FIRST_DATA_ROW + 1;
  if (rowCount < 1) throw new Error("No hay invitados registrados.");
  const tokens = sheet.getRange(FIRST_DATA_ROW, COL_TOKEN, rowCount, 1).getDisplayValues().flat();
  const index = tokens.indexOf(token);
  if (index < 0) throw new Error("Enlace de invitación no válido.");
  const row = FIRST_DATA_ROW + index;
  return {
    sheet,
    row,
    token,
    name: String(sheet.getRange(row, COL_NAME).getDisplayValue()),
    assigned: Number(sheet.getRange(row, COL_ASSIGNED).getValue()),
    status: String(sheet.getRange(row, COL_STATUS).getDisplayValue() || "Pendiente"),
    used: Number(sheet.getRange(row, COL_USED).getValue()) || 0,
  };
}

function publicInvitation_(record) {
  return {
    name: record.name,
    maxPasses: record.assigned,
    status: record.status,
    confirmed: record.status === "Confirmado",
    used: record.used,
    token: record.token,
  };
}

function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
