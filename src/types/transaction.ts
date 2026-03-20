export type TransactionType = 'gain' | 'expense';

export interface Transaction {
  id: string;
  description: string;
  amount: number;
  type: TransactionType;
  categoryId: string;
  date: number; // timestamp
}
