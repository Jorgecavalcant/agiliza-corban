const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // DB check & backup
  checkDb: () => ipcRenderer.invoke('db:check'),
  backupDb: () => ipcRenderer.invoke('db:backup'),

  // Transactions
  addTransaction: (data) => ipcRenderer.invoke('transaction:add', data),
  getTransactionsToday: () => ipcRenderer.invoke('transaction:today'),
  deleteTransaction: (id) => ipcRenderer.invoke('transaction:delete', id),

  // Summary
  getSummaryToday: () => ipcRenderer.invoke('summary:today'),
  getSummaryMonth: () => ipcRenderer.invoke('summary:month'),
  getZReading: () => ipcRenderer.invoke('summary:zreading'),

  // Settings
  getSetting: (key) => ipcRenderer.invoke('settings:get', key),
  setSetting: (key, value) => ipcRenderer.invoke('settings:set', key, value),

  // Hardware / Painel de Senhas
  listPorts: () => ipcRenderer.invoke('hardware:list-ports'),
  openPort: (portPath, baudRate) => ipcRenderer.invoke('hardware:open-port', portPath, baudRate),
  closePort: () => ipcRenderer.invoke('hardware:close-port'),
  callSenha: () => ipcRenderer.invoke('hardware:call-senha'),
  resetSenhas: () => ipcRenderer.invoke('hardware:reset-senhas'),
  getCurrentSenha: () => ipcRenderer.invoke('hardware:current-senha'),

  // Products
  getProducts: () => ipcRenderer.invoke('products:get'),
  saveProduct: (product) => ipcRenderer.invoke('products:save', product),
  deleteProduct: (id) => ipcRenderer.invoke('products:delete', id),
  reorderProducts: (orderedIds) => ipcRenderer.invoke('products:reorder', orderedIds),

  // Printing
  printReport: () => ipcRenderer.invoke('print:report')
});
