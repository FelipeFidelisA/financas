import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@financas:theme';

export async function getTheme(): Promise<'light' | 'dark'> {
  try {
    const data = await AsyncStorage.getItem(KEY);
    return (data as 'light' | 'dark') ?? 'light';
  } catch { return 'light'; }
}

export async function saveTheme(theme: 'light' | 'dark'): Promise<void> {
  await AsyncStorage.setItem(KEY, theme);
}
