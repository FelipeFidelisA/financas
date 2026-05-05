import { Transaction } from '../types/transaction';

function parseAmount(raw: string): number {
  const cleaned = raw
    .replace(/[R$\s]/g, '')
    .replace('−', '-')
    .replace(/\./g, '')
    .replace(',', '.');
  return Math.abs(parseFloat(cleaned));
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') { inQuotes = !inQuotes; }
    else if (char === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += char; }
  }
  result.push(current.trim());
  return result;
}

function parseDDMMYYYY(dateStr: string): number | null {
  const [day, month, year] = dateStr.split('/').map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day).getTime();
}

function parseYYYYMMDD(dateStr: string): number | null {
  const [year, month, day] = dateStr.split('-').map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day).getTime();
}

type Format = 'picpay' | 'bb' | 'nubank' | 'inter' | 'c6' | 'bradesco';

function detectFormat(header: string): Format | null {
  const h = header.toLowerCase();
  if (h.includes('origem / destino')) return 'picpay';
  if (h.includes('lancamento') || h.includes('lançamento')) return 'bb';
  if (h.includes('categoria') && h.includes('titulo')) return 'nubank';
  if (h.includes('historico') || h.includes('histórico')) return 'inter';
  if (h.includes('descricao') && h.includes('valor') && h.includes('saldo')) return 'c6';
  if (h.includes('data') && h.includes('historico') && h.includes('docto')) return 'bradesco';
  return null;
}

// PicPay: data,hora,tipo,"origem / destino",valor,"forma de pagamento"
function parsePicPay(lines: string[], cat: string): Transaction[] {
  return lines.slice(1).flatMap((line, i) => {
    const cols = parseCsvLine(line.trim());
    if (cols.length < 5) return [];
    const [dateStr, , , description, valueStr] = cols;
    const amount = parseAmount(valueStr);
    if (!amount || isNaN(amount)) return [];
    const date = parseYYYYMMDD(dateStr);
    if (!date) return [];
    const isExpense = valueStr.includes('−') || valueStr.startsWith('-');
    return [{ id: `csv-pp-${Date.now()}-${i}`, description: description || 'PicPay', amount, type: isExpense ? 'expense' : 'gain', categoryId: cat, date }];
  });
}

// Banco do Brasil: "Data","Lancamento","Detalhes","N documento","Valor","Tipo Lancamento"
function parseBB(lines: string[], cat: string): Transaction[] {
  return lines.slice(1).flatMap((line, i) => {
    const cols = parseCsvLine(line.trim());
    if (cols.length < 6) return [];
    const [dateStr, lancamento, detalhes, , valueStr, tipoLancamento] = cols;
    if (!dateStr || dateStr === '00/00/0000') return [];
    const lower = lancamento.toLowerCase();
    if (lower.includes('saldo') || lower.includes('s a l d o')) return [];
    const amount = parseAmount(valueStr);
    if (!amount || isNaN(amount)) return [];
    const date = parseDDMMYYYY(dateStr);
    if (!date) return [];
    const isExpense = tipoLancamento.toLowerCase().includes('sa') || valueStr.startsWith('-');
    return [{ id: `csv-bb-${Date.now()}-${i}`, description: detalhes?.trim() || lancamento || 'BB', amount, type: isExpense ? 'expense' : 'gain', categoryId: cat, date }];
  });
}

// Nubank: date,category,title,amount
// amount negativo = despesa, positivo = ganho (estorno)
function parseNubank(lines: string[], cat: string): Transaction[] {
  return lines.slice(1).flatMap((line, i) => {
    const cols = parseCsvLine(line.trim());
    if (cols.length < 4) return [];
    const [dateStr, , title, amountStr] = cols;
    const raw = amountStr.replace(',', '.');
    const value = parseFloat(raw);
    if (isNaN(value) || value === 0) return [];
    const date = parseYYYYMMDD(dateStr);
    if (!date) return [];
    return [{ id: `csv-nu-${Date.now()}-${i}`, description: title || 'Nubank', amount: Math.abs(value), type: value > 0 ? 'expense' : 'gain', categoryId: cat, date }];
  });
}

// Inter: Data;Descricao;Valor;Tipo  (separador ;)
function parseInter(lines: string[], cat: string): Transaction[] {
  return lines.slice(1).flatMap((line, i) => {
    const cols = line.trim().split(';').map(s => s.replace(/"/g, '').trim());
    if (cols.length < 4) return [];
    const [dateStr, description, valueStr, tipo] = cols;
    const amount = parseAmount(valueStr);
    if (!amount || isNaN(amount)) return [];
    const date = parseDDMMYYYY(dateStr);
    if (!date) return [];
    const isExpense = tipo.toLowerCase().includes('d') || valueStr.startsWith('-');
    return [{ id: `csv-inter-${Date.now()}-${i}`, description: description || 'Inter', amount, type: isExpense ? 'expense' : 'gain', categoryId: cat, date }];
  });
}

// C6: Data;Descricao;Valor;Saldo  (separador ;)
function parseC6(lines: string[], cat: string): Transaction[] {
  return lines.slice(1).flatMap((line, i) => {
    const cols = line.trim().split(';').map(s => s.replace(/"/g, '').trim());
    if (cols.length < 3) return [];
    const [dateStr, description, valueStr] = cols;
    const raw = valueStr.replace(',', '.').replace(/\./g, '').replace(',', '.');
    const value = parseFloat(raw.replace(',', '.'));
    if (isNaN(value) || value === 0) return [];
    const date = parseDDMMYYYY(dateStr);
    if (!date) return [];
    return [{ id: `csv-c6-${Date.now()}-${i}`, description: description || 'C6', amount: Math.abs(value), type: value < 0 ? 'expense' : 'gain', categoryId: cat, date }];
  });
}

// Bradesco: Data;Historico;Docto;Credito;Debito;Saldo
function parseBradesco(lines: string[], cat: string): Transaction[] {
  return lines.slice(1).flatMap((line, i) => {
    const cols = line.trim().split(';').map(s => s.replace(/"/g, '').trim());
    if (cols.length < 5) return [];
    const [dateStr, historico, , credito, debito] = cols;
    if (!dateStr || dateStr.includes('Saldo') || dateStr.includes('Data')) return [];
    const date = parseDDMMYYYY(dateStr);
    if (!date) return [];
    const creditVal = parseAmount(credito);
    const debitVal = parseAmount(debito);
    if (creditVal > 0) {
      return [{ id: `csv-brad-c-${Date.now()}-${i}`, description: historico || 'Bradesco', amount: creditVal, type: 'gain', categoryId: cat, date }];
    }
    if (debitVal > 0) {
      return [{ id: `csv-brad-d-${Date.now()}-${i}`, description: historico || 'Bradesco', amount: debitVal, type: 'expense', categoryId: cat, date }];
    }
    return [];
  });
}

export function parseCsvTransactions(
  content: string,
  defaultCategoryId: string,
): { transactions: Transaction[]; format: string } | null {
  const lines = content.split('\n').filter(l => l.trim());
  if (lines.length < 2) return null;

  const format = detectFormat(lines[0]);
  if (!format) return null;

  const parsers: Record<Format, (lines: string[], cat: string) => Transaction[]> = {
    picpay: parsePicPay,
    bb: parseBB,
    nubank: parseNubank,
    inter: parseInter,
    c6: parseC6,
    bradesco: parseBradesco,
  };

  const transactions = parsers[format](lines, defaultCategoryId);
  return { transactions, format };
}
