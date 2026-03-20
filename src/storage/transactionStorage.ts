import AsyncStorage from '@react-native-async-storage/async-storage';
import { Transaction } from '../types/transaction';

const STORAGE_KEY = '@financas:transactions';

export async function getAllTransactions(): Promise<Transaction[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEY);
    if (!data) {
      return [];
    }

    const parsed = JSON.parse(data) as Array<Transaction & { categoryId?: string }>;
    const normalized = parsed.map(transaction => ({
      ...transaction,
      categoryId: transaction.categoryId ?? 'cat-outros',
    }));

    return normalized;
  } catch (error) {
    console.error('Error getting transactions:', error);
    return [];
  }
}

export async function saveTransaction(newTransaction: Transaction): Promise<void> {
  try {
    const currentTransactions = await getAllTransactions();
    const updatedTransactions = [newTransaction, ...currentTransactions];
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTransactions));
  } catch (error) {
    console.error('Error saving transaction:', error);
    throw error;
  }
}

export async function deleteTransaction(id: string): Promise<void> {
  try {
    const currentTransactions = await getAllTransactions();
    const updatedTransactions = currentTransactions.filter(t => t.id !== id);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTransactions));
  } catch (error) {
    console.error('Error deleting transaction:', error);
    throw error;
  }
}

export async function updateTransaction(updatedTransaction: Transaction): Promise<void> {
  try {
    const currentTransactions = await getAllTransactions();
    const updatedTransactions = currentTransactions.map(transaction =>
      transaction.id === updatedTransaction.id ? updatedTransaction : transaction,
    );
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(updatedTransactions));
  } catch (error) {
    console.error('Error updating transaction:', error);
    throw error;
  }
}
