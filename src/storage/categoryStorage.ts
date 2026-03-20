import AsyncStorage from '@react-native-async-storage/async-storage';
import { Category } from '../types/category';

const STORAGE_KEY = '@financas:categories';

const defaultCategories: Category[] = [
  { id: 'cat-salario', name: 'Salario', createdAt: Date.now() },
  { id: 'cat-freelance', name: 'Freelance', createdAt: Date.now() },
  { id: 'cat-alimentacao', name: 'Alimentacao', createdAt: Date.now() },
  { id: 'cat-moradia', name: 'Moradia', createdAt: Date.now() },
  { id: 'cat-transporte', name: 'Transporte', createdAt: Date.now() },
  { id: 'cat-lazer', name: 'Lazer', createdAt: Date.now() },
  { id: 'cat-saude', name: 'Saude', createdAt: Date.now() },
  { id: 'cat-outros', name: 'Outros', createdAt: Date.now() },
];

export async function getAllCategories(): Promise<Category[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);

    if (!data) {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(defaultCategories));
      return defaultCategories;
    }

    const parsed = JSON.parse(data) as Category[];
    return parsed.length ? parsed : defaultCategories;
  } catch (error) {
    console.error('Error getting categories:', error);
    return defaultCategories;
  }
}

export async function saveCategory(category: Category): Promise<void> {
  try {
    const categories = await getAllCategories();
    const normalizedName = category.name.trim().toLowerCase();

    const alreadyExists = categories.some(
      c => c.name.trim().toLowerCase() === normalizedName,
    );

    if (alreadyExists) {
      throw new Error('Categoria ja existe');
    }

    const updated = [category, ...categories];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving category:', error);
    throw error;
  }
}

export async function deleteCategory(id: string): Promise<void> {
  try {
    const categories = await getAllCategories();
    const updated = categories.filter(c => c.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error('Error deleting category:', error);
    throw error;
  }
}
