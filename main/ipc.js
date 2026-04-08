const { ipcMain } = require('electron');
const { getDb, saveDb } = require('./database');
const hardware = require('./hardware');

function registerIpcHandlers() {
  ipcMain.handle('db:backup', () => {
    const { backupDb } = require('./database');
    return backupDb();
  });
  // ─── TRANSACTIONS ────────────────────────────────────────────────────────────

  ipcMain.handle('transaction:add', (event, { type, description, amount_cents }) => {
    const db = getDb();
    const now = Date.now();
    db.run(
      'INSERT INTO transactions (type, description, amount_cents, created_at) VALUES (?, ?, ?, ?)',
      [type, description, amount_cents, now]
    );
    saveDb();
    const stmt = db.exec('SELECT last_insert_rowid() as id');
    const id = stmt[0]?.values[0][0];
    return { id, type, description, amount_cents, created_at: now };
  });

  ipcMain.handle('transaction:today', () => {
    const db = getDb();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const stmt = db.exec(
      `SELECT * FROM transactions WHERE created_at >= ${startOfDay.getTime()} ORDER BY created_at DESC`
    );
    if (!stmt.length) return [];
    const cols = stmt[0].columns;
    return stmt[0].values.map(row =>
      Object.fromEntries(cols.map((col, i) => [col, row[i]]))
    );
  });

  ipcMain.handle('transaction:delete', (event, id) => {
    const db = getDb();
    db.run('DELETE FROM transactions WHERE id = ?', [id]);
    saveDb();
    return { success: true };
  });

  // ─── SUMMARY ─────────────────────────────────────────────────────────────────

  ipcMain.handle('summary:today', () => {
    const db = getDb();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const stmt = db.exec(
      `SELECT type, SUM(amount_cents) as total FROM transactions 
       WHERE created_at >= ${startOfDay.getTime()} GROUP BY type`
    );
    if (!stmt.length) return { revenue: 0, withdrawals: 0 };
    const map = {};
    stmt[0].values.forEach(([type, total]) => { map[type] = total; });
    return {
      revenue: (map['RECIPE'] || 0) + (map['AVULSO'] || 0),
      withdrawals: map['SAQUE'] || 0,
    };
  });

  ipcMain.handle('summary:month', () => {
    const db = getDb();
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const stmt = db.exec(
      `SELECT type, SUM(amount_cents) as total FROM transactions 
       WHERE created_at >= ${startOfMonth.getTime()} GROUP BY type`
    );
    if (!stmt.length) return { revenue: 0, withdrawals: 0 };
    const map = {};
    stmt[0].values.forEach(([type, total]) => { map[type] = total; });
    return {
      revenue: (map['RECIPE'] || 0) + (map['AVULSO'] || 0),
      withdrawals: map['SAQUE'] || 0,
    };
  });

  // Z-Reading — Fechamento do dia com contagem por tipo
  ipcMain.handle('summary:zreading', () => {
    const db = getDb();
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const stmt = db.exec(
      `SELECT description, COUNT(*) as qty, SUM(amount_cents) as total 
       FROM transactions 
       WHERE created_at >= ${startOfDay.getTime()} AND type != 'SAQUE'
       GROUP BY description 
       ORDER BY total DESC`
    );
    if (!stmt.length) return [];
    const cols = stmt[0].columns;
    return stmt[0].values.map(row =>
      Object.fromEntries(cols.map((col, i) => [col, row[i]]))
    );
  });

  // ─── SETTINGS ────────────────────────────────────────────────────────────────

  ipcMain.handle('settings:get', (event, key) => {
    const db = getDb();
    const stmt = db.exec(`SELECT value FROM settings WHERE key = '${key}'`);
    if (!stmt.length || !stmt[0].values.length) return null;
    return stmt[0].values[0][0];
  });

  ipcMain.handle('settings:set', (event, key, value) => {
    const db = getDb();
    db.run(
      `INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
      [key, value]
    );
    saveDb();
    return { success: true };
  });

  // ─── HARDWARE / PAINEL DE SENHAS (Sprint 3) ──────────────────────────────────

  ipcMain.handle('hardware:list-ports', async () => {
    return await hardware.listPorts();
  });

  ipcMain.handle('hardware:open-port', (event, portPath, baudRate) => {
    return hardware.openPort(portPath, baudRate || 9600);
  });

  ipcMain.handle('hardware:close-port', () => {
    hardware.closePort();
    return { success: true };
  });

  ipcMain.handle('hardware:call-senha', () => {
    return hardware.chamarProximaSenha();
  });

  ipcMain.handle('hardware:reset-senhas', () => {
    return hardware.resetSenhas();
  });

  ipcMain.handle('hardware:current-senha', () => {
    return hardware.getCurrentSenha();
  });

  // ─── PRODUCTS ────────────────────────────────────────────────────────────────

  ipcMain.handle('products:get', () => {
    const db = getDb();
    const stmt = db.exec(`SELECT * FROM products ORDER BY order_index ASC`);
    if (!stmt.length) return [];
    const cols = stmt[0].columns;
    return stmt[0].values.map(row =>
      Object.fromEntries(cols.map((col, i) => [col, row[i]]))
    );
  });

  ipcMain.handle('products:save', (event, product) => {
    const db = getDb();
    if (product.isNew) {
      db.run(
        'INSERT INTO products (id, label, value, icon, color) VALUES (?, ?, ?, ?, ?)',
        [product.id, product.label, product.value, product.icon, product.color]
      );
    } else {
      db.run(
        'UPDATE products SET label = ?, value = ?, icon = ?, color = ? WHERE id = ?',
        [product.label, product.value, product.icon, product.color, product.id]
      );
    }
    saveDb();
    return { success: true };
  });

  ipcMain.handle('products:delete', (event, id) => {
    const db = getDb();
    db.run('DELETE FROM products WHERE id = ?', [id]);
    saveDb();
    return { success: true };
  });

  ipcMain.handle('products:reorder', (event, orderedIds) => {
    const db = getDb();
    db.run('BEGIN TRANSACTION');
    orderedIds.forEach((id, index) => {
      db.run('UPDATE products SET order_index = ? WHERE id = ?', [index, id]);
    });
    db.run('COMMIT');
    saveDb();
    return { success: true };
  });

  // ─── PRINTING ────────────────────────────────────────────────────────────────
  ipcMain.handle('print:report', (event) => {
    const win = event.sender.getOwnerBrowserWindow();
    win.webContents.print({ silent: false, printBackground: true });
    return { success: true };
  });
}

module.exports = { registerIpcHandlers };
