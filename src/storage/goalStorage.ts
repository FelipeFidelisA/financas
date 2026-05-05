import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CategoryGoal {
  id: string;
  categoryId: string;
  limitAmount: number;
  period: 'month';
}

const KEY = '@financas:goals';

export async function getAllGoals(): Promise<CategoryGoal[]> {
  try {
    const data = await AsyncStorage.getItem(KEY);
    return data ? JSON.parse(data) : [];
  } catch { return []; }
}

export async function saveGoal(goal: CategoryGoal): Promise<void> {
  const goals = await getAllGoals();
  const existing = goals.findIndex(g => g.categoryId === goal.categoryId);
  if (existing >= 0) goals[existing] = goal;
  else goals.push(goal);
  await AsyncStorage.setItem(KEY, JSON.stringify(goals));
}

export async function deleteGoal(id: string): Promise<void> {
  const goals = await getAllGoals();
  await AsyncStorage.setItem(KEY, JSON.stringify(goals.filter(g => g.id !== id)));
}
