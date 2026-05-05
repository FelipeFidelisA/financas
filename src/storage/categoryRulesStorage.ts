import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CategoryRule {
  id: string;
  keyword: string;
  categoryId: string;
}

const STORAGE_KEY = '@financas:categoryRules';

export async function getAllRules(): Promise<CategoryRule[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    return data ? (JSON.parse(data) as CategoryRule[]) : [];
  } catch {
    return [];
  }
}

export async function saveRule(rule: CategoryRule): Promise<void> {
  const rules = await getAllRules();
  const normalized = rule.keyword.trim().toLowerCase();
  if (rules.some(r => r.keyword.toLowerCase() === normalized)) {
    throw new Error('Regra ja existe para essa palavra-chave');
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify([rule, ...rules]));
}

export async function deleteRule(id: string): Promise<void> {
  const rules = await getAllRules();
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(rules.filter(r => r.id !== id)));
}
