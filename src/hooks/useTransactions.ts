import { useState } from 'react';
import { Alert } from 'react-native';
import { Transaction } from '../types/transaction';
import {
  deleteTransaction,
  getAllTransactions,
  saveTransaction,
  updateTransaction,
} from '../storage/transactionStorage';

export function useTransactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  async function loadTransactions() {
    const data = await getAllTransactions();
    setTransactions(data.sort((a, b) => b.date - a.date));
  }

  async function handleSaveTransaction(transaction: Transaction, isEditing: boolean) {
    if (isEditing) {
      await updateTransaction(transaction);
    } else {
      await saveTransaction(transaction);
    }
    await loadTransactions();
  }

  async function handleDeleteTransaction(id: string) {
    Alert.alert('Excluir', 'Tem certeza que deseja excluir esta transacao?', [
      { text: 'Nao', style: 'cancel' },
      {
        text: 'Sim',
        onPress: async () => {
          await deleteTransaction(id);
          await loadTransactions();
        },
      },
    ]);
  }

  async function handleBulkUpdateCategory(ids: string[], categoryId: string) {
    const all = await getAllTransactions();
    for (const t of all) {
      if (ids.includes(t.id)) {
        await updateTransaction({ ...t, categoryId });
      }
    }
    await loadTransactions();
  }

  return {
    transactions,
    loadTransactions,
    handleSaveTransaction,
    handleDeleteTransaction,
    handleBulkUpdateCategory,
  };
}
