/**
 * Sprint 3 — Módulo de Hardware: Painel de Senhas
 * Integração via Porta Serial/COM com displays de bipe genéricos.
 * Falha silenciosamente (retorna erro) se hardware não estiver conectado.
 */

let SerialPort;
let port = null;
let currentSenha = 0;

// Lazy-load serialport (evita crash se não instalado)
function loadSerialPort() {
  if (!SerialPort) {
    try {
      const sp = require('serialport');
      SerialPort = sp.SerialPort;
    } catch (e) {
      console.warn('[Hardware] serialport não disponível:', e.message);
      return false;
    }
  }
  return true;
}

/**
 * Lista as portas COM disponíveis no sistema
 */
async function listPorts() {
  if (!loadSerialPort()) return [];
  try {
    const { SerialPort: SP } = require('serialport');
    const ports = await SP.list();
    return ports.map(p => ({ path: p.path, manufacturer: p.manufacturer || 'Desconhecido' }));
  } catch (e) {
    return [];
  }
}

/**
 * Abre conexão com a porta COM configurada
 * @param {string} portPath — ex: 'COM3'
 * @param {number} baudRate — padrão 9600
 */
function openPort(portPath, baudRate = 9600) {
  if (!loadSerialPort()) return { success: false, error: 'serialport não instalado' };
  
  if (port && port.isOpen) {
    port.close();
  }
  
  try {
    port = new SerialPort({ path: portPath, baudRate, autoOpen: false });
    port.open((err) => {
      if (err) {
        console.error('[Hardware] Erro ao abrir porta:', err.message);
      } else {
        console.log(`[Hardware] Porta ${portPath} aberta.`);
      }
    });
    return { success: true };
  } catch (e) {
    return { success: false, error: e.message };
  }
}

/**
 * Fecha a porta atual
 */
function closePort() {
  if (port && port.isOpen) {
    port.close();
    port = null;
  }
}

/**
 * Gera próxima senha e envia para o painel
 * Zera diariamente via chamada externa
 */
function chamarProximaSenha() {
  currentSenha += 1;
  const senhaFormatada = String(currentSenha).padStart(3, '0');
  
  if (port && port.isOpen) {
    // Protocolo genérico ASCII: envia "XXX\n" — compatível com maioria dos painéis LED
    port.write(`${senhaFormatada}\n`, (err) => {
      if (err) {
        console.error('[Hardware] Erro ao enviar senha ao painel:', err.message);
      }
    });
  } else {
    console.warn('[Hardware] Porta não aberta. Senha gerada sem envio ao painel:', senhaFormatada);
  }
  
  return { senha: senhaFormatada, numero: currentSenha };
}

/**
 * Zera contador de senhas (chamado na virada do dia ou manualmente)
 */
function resetSenhas() {
  currentSenha = 0;
  console.log('[Hardware] Contador de senhas zerado.');
  return { success: true };
}

function getCurrentSenha() {
  return currentSenha;
}

module.exports = { listPorts, openPort, closePort, chamarProximaSenha, resetSenhas, getCurrentSenha };
