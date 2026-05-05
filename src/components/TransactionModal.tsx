import React, { useEffect, useState } from 'react';
import {
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Category } from '../types/category';
import { Transaction } from '../types/transaction';

interface Props {
  visible: boolean;
  categories: Category[];
  editingTransaction: Transaction | null;
  onSave: (transaction: Transaction, isEditing: boolean) => void;
  onClose: () => void;
}

function formatDateInput(timestamp: number): string {
  const date = new Date(timestamp);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function parseDateInput(input: string): number | null {
  const match = input.trim().match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const parsed = new Date(year, month - 1, day);
  if (
    parsed.getFullYear() !== year ||
    parsed.getMonth() !== month - 1 ||
    parsed.getDate() !== day
  ) return null;
  return parsed.getTime();
}

export function TransactionModal({ visible, categories, editingTransaction, onSave, onClose }: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'gain' | 'expense'>('expense');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [dateInput, setDateInput] = useState('');

  useEffect(() => {
    if (editingTransaction) {
      setDescription(editingTransaction.description);
      setAmount(String(editingTransaction.amount));
      setType(editingTransaction.type);
      setSelectedCategoryId(editingTransaction.categoryId ?? categories[0]?.id ?? '');
      setDateInput(formatDateInput(editingTransaction.date));
    } else {
      setDescription('');
      setAmount('');
      setType('expense');
      setSelectedCategoryId(categories[0]?.id ?? '');
      setDateInput(formatDateInput(Date.now()));
    }
  }, [visible, editingTransaction, categories]);

  function handleSave() {
    const parsedAmount = Number(amount.replace(',', '.'));
    if (!amount || isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Erro', 'Informe um valor valido maior que zero');
      return;
    }
    const parsedDate = parseDateInput(dateInput);
    if (!parsedDate) {
      Alert.alert('Erro', 'Data invalida. Use o formato DD/MM/AAAA.');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Erro', 'Selecione uma categoria');
      return;
    }
    const categoryName = categories.find(c => c.id === selectedCategoryId)?.name ?? 'Outros';
    onSave(
      {
        id: editingTransaction?.id ?? String(Date.now()),
        description: description.trim() || categoryName,
        amount: parsedAmount,
        type,
        categoryId: selectedCategoryId,
        date: parsedDate,
      },
      !!editingTransaction,
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <View style={styles.overlay}>
        <View style={styles.content}>
          <Text style={styles.title}>{editingTransaction ? 'Editar Transacao' : 'Nova Transacao'}</Text>

          <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TextInput style={styles.input} placeholder="Descricao (ex: Salario, Aluguel)" value={description} onChangeText={setDescription} />
            <TextInput style={styles.input} placeholder="Valor (ex: 150.00)" keyboardType="numeric" value={amount} onChangeText={setAmount} />
            <TextInput style={styles.input} placeholder="Data (DD/MM/AAAA)" value={dateInput} onChangeText={setDateInput} />

            <Text style={styles.label}>Categoria</Text>
            <View style={styles.chips}>
              {categories.map(cat => (
                <TouchableOpacity
                  key={cat.id}
                  style={[styles.chip, selectedCategoryId === cat.id && styles.chipActive]}
                  onPress={() => setSelectedCategoryId(cat.id)}
                >
                  <Text style={[styles.chipText, selectedCategoryId === cat.id && styles.chipTextActive]}>
                    {cat.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.typeRow}>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'gain' && styles.typeBtnGain]}
                onPress={() => setType('gain')}
              >
                <Text style={[styles.typeBtnText, type === 'gain' && styles.typeBtnTextActive]}>Ganho</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.typeBtn, type === 'expense' && styles.typeBtnExpense]}
                onPress={() => setType('expense')}
              >
                <Text style={[styles.typeBtnText, type === 'expense' && styles.typeBtnTextActive]}>Despesa</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttons}>
              <TouchableOpacity style={[styles.btn, styles.btnCancel]} onPress={onClose}>
                <Text style={styles.btnCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.btn, styles.btnSave]} onPress={handleSave}>
                <Text style={styles.btnSaveText}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  content: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 40, maxHeight: '90%' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 20, color: '#1e293b' },
  input: { backgroundColor: '#f1f5f9', padding: 15, borderRadius: 12, marginBottom: 15, fontSize: 16 },
  label: { fontWeight: '700', color: '#334155', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 15 },
  chip: { backgroundColor: '#e2e8f0', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 999 },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { color: '#475569', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  typeRow: { flexDirection: 'row', gap: 10, marginBottom: 25 },
  typeBtn: { flex: 1, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  typeBtnGain: { backgroundColor: '#059669', borderColor: '#059669' },
  typeBtnExpense: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  typeBtnText: { fontWeight: 'bold', color: '#64748b' },
  typeBtnTextActive: { color: '#fff' },
  buttons: { flexDirection: 'row', gap: 10 },
  btn: { flex: 1, padding: 15, borderRadius: 12, alignItems: 'center' },
  btnCancel: { backgroundColor: '#f1f5f9' },
  btnSave: { backgroundColor: '#2563eb' },
  btnCancelText: { fontWeight: 'bold', fontSize: 16, color: '#64748b' },
  btnSaveText: { fontWeight: 'bold', fontSize: 16, color: '#fff' },
});
