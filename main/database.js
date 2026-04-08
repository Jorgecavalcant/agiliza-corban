const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const { app } = require('electron');

let db;
let dbPath;

async function initDb() {
  const userDataPath = app.getPath('userData');
  dbPath = path.join(userDataPath, 'agiliza.db');
  
  try {
    const SQL = await initSqlJs({
      // The wasm file is correctly routed via package.json extraResources, so electron finds it
      // For development, it requires path to sql-wasm.wasm
    });
    
    if (fs.existsSync(dbPath)) {
      const filebuffer = fs.readFileSync(dbPath);
      db = new SQL.Database(filebuffer);
    } else {
      db = new SQL.Database();
    }
    
    // Make sure tables exist
    db.run(`
      CREATE TABLE IF NOT EXISTS transactions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        type VARCHAR NOT NULL,
        description VARCHAR NOT NULL,
        amount_cents INTEGER NOT NULL,
        created_at INTEGER NOT NULL
      );
      
      CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR PRIMARY KEY,
        value VARCHAR NOT NULL
      );

      CREATE TABLE IF NOT EXISTS products (
        id VARCHAR PRIMARY KEY,
        label VARCHAR NOT NULL,
        value INTEGER NOT NULL,
        icon VARCHAR DEFAULT 'FileText',
        color VARCHAR DEFAULT 'bg-slate-700 hover:bg-slate-600',
        order_index INTEGER DEFAULT 0
      );
    `);

    try {
      db.run("ALTER TABLE products ADD COLUMN order_index INTEGER DEFAULT 0");
    } catch(e) {
      // Column might already exist, ignore
    }
    
    // Seed default products Se estiver vazio
    const res = db.exec("SELECT count(*) as count FROM products");
    if (res.length === 0 || res[0].values[0][0] === 0) {
      const inserts = [
        ['imp-pb', 'Impressão P&B', 100, 'Printer', 'bg-slate-700 hover:bg-slate-600', 1],
        ['imp-color', 'Impressão Colorida', 200, 'Printer', 'bg-violet-700 hover:bg-violet-600', 2],
        ['boleto', 'Taxa Boleto', 400, 'FileText', 'bg-blue-700 hover:bg-blue-600', 3],
        ['gov-br', 'Acesso Gov.br', 1000, 'QrCode', 'bg-cyan-700 hover:bg-cyan-600', 4],
        ['extrato', 'Extrato Bancário', 300, 'BarChart3', 'bg-indigo-700 hover:bg-indigo-600', 5],
        ['xerox', 'Cópia / Xerox', 100, 'FileText', 'bg-teal-700 hover:bg-teal-600', 6],
        ['digital', 'Digitalização', 150, 'FileText', 'bg-emerald-700 hover:bg-emerald-600', 7],
        ['cartao', 'Débito/Crédito Caixa', 500, 'CreditCard', 'bg-amber-700 hover:bg-amber-600', 8]
      ];
      inserts.forEach(p => {
        db.run("INSERT INTO products (id, label, value, icon, color, order_index) VALUES (?, ?, ?, ?, ?, ?)", p);
      });
    }

    // Save state on start
    saveDb();
    
    console.log('Banco de dados inicializado [sql.js] em:', dbPath);
    return true;
  } catch (error) {
    console.error('Erro no BD (sql.js):', error);
    return false;
  }
}

function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}

function getDb() {
  return db;
}

function backupDb() {
  saveDb();
  if (!fs.existsSync(dbPath)) return false;
  try {
    const backupDir = path.join(app.getPath('documents'), 'Agiliza-Corban-Backups');
    if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });
    
    const date = new Date();
    const ts = date.toISOString().replace(/T/, '_').replace(/\..+/, '').replace(/:/g, '-');
    const backupFile = path.join(backupDir, `agiliza_backup_${ts}.db`);
    
    fs.copyFileSync(dbPath, backupFile);
    return backupFile;
  } catch(e) {
    console.error('Backup error:', e);
    return false;
  }
}

// Intercept exit to save
app.on('before-quit', () => {
    saveDb();
});

module.exports = { initDb, getDb, saveDb, backupDb };
