import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '../types/transaction';

export interface RecurringTransaction {
  id: string;
  description: string;
  amount: number;
  type: 'gain' | 'expense';
  categoryId: string;
  frequency: 'monthly' | 'weekly';
  dayOfMonth?: number;   // para monthly
  dayOfWeek?: number;    // para weekly (0=dom)
  active: boolean;
}

const KEY = '@financas:recurring';

export async function getAllRecurring(): Promise<RecurringTransaction[]> {
  try {
    const data = await AsyncStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export async function saveRecurring(r: RecurringTransaction): Promise<void> {
  const all = await getAllRecurring();
  const idx = all.findIndex(x => x.id === r.id);
  if (idx >= 0) all[idx] = r;
  else all.push(r);
  await AsyncStorage.setItem(KEY, JSON.stringify(all));
}

export async function deleteRecurring(id: string): Promise<void> {
  const all = await getAllRecurring();
  await AsyncStorage.setItem(KEY, JSON.stringify(all.filter(r => r.id !== id)));
}

export function generateTransactionsForMonth(
  recurring: RecurringTransaction[],
  year: number,
  month: number,
): Transaction[] {
  const result: Transaction[] = [];
  for (const r of recurring) {
    if (!r.active) continue;
    let date: Date;
    if (r.frequency === 'monthly') {
      const day = Math.min(r.dayOfMonth ?? 1, new Date(year, month, 0).getDate());
      date = new Date(year, month - 1, day);
    } else {
      // próxima ocorrência do dia da semana no mês
      date = new Date(year, month - 1, 1);
      while (date.getDay() !== (r.dayOfWeek ?? 0)) date.setDate(date.getDate() + 1);
    }
    result.push({
      id: `rec-${r.id}-${year}-${month}`,
      description: r.description,
      amount: r.amount,
      type: r.type,
      categoryId: r.categoryId,
      date: date.getTime(),
    });
  }
  return result;
}
