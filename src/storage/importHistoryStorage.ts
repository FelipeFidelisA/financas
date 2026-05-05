import AsyncStorage from '@react-native-async-storage/async-storage';

export interface ImportRecord {
  id: string;
  importedAt: number;
  fileName: string;
  format: string;
  total: number;
  imported: number;
  duplicates: number;
}

const KEY = '@financas:importHistory';

export async function getAllImportHistory(): Promise<ImportRecord[]> {
  try {
    const data = await AsyncStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export async function saveImportRecord(record: ImportRecord): Promise<void> {
  const all = await getAllImportHistory();
  await AsyncStorage.setItem(KEY, JSON.stringify([record, ...all].slice(0, 50)));
}
