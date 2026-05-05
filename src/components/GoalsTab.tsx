import React, { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Category } from '../types/category';
import { CategoryGoal } from '../storage/goalStorage';
import { Transaction } from '../types/transaction';
import { formatCurrency } from '../utils/format';
import { Theme } from '../utils/theme';

interface Props {
  categories: Category[];
  goals: CategoryGoal[];
  transactions: Transaction[];
  theme: Theme;
  onSaveGoal: (categoryId: string, limit: number) => void;
  onDeleteGoal: (id: string) => void;
}

export function GoalsTab({ categories, goals, transactions, theme, onSaveGoal, onDeleteGoal }: Props) {
  const [selectedCategoryId, setSelectedCategoryId] = useState(categories[0]?.id ?? '');
  const [limitInput, setLimitInput] = useState('');

  const now = new Date();

  function getMonthSpent(categoryId: string): number {
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        return (
          t.type === 'expense' &&
          t.categoryId === categoryId &&
          d.getMonth() === now.getMonth() &&
          d.getFullYear() === now.getFullYear()
        );
      })
      .reduce((s, t) => s + t.amount, 0);
  }

  function handleSave() {
    const limit = parseFloat(limitInput.replace(',', '.'));
    if (!selectedCategoryId || isNaN(limit) || limit <= 0) {
      Alert.alert('Erro', 'Selecione uma categoria e informe um limite valido.');
      return;
    }
    onSaveGoal(selectedCategoryId, limit);
    setLimitInput('');
  }

  const categoryNameById = new Map(categories.map(c => [c.id, c.name]));

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 160 }}>
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Nova meta mensal</Text>

        <Text style={[styles.label, { color: theme.textSecondary }]}>Categoria</Text>
        <View style={styles.chips}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, { backgroundColor: theme.pill }, selectedCategoryId === cat.id && styles.chipActive]}
              onPress={() => setSelectedCategoryId(cat.id)}
            >
              <Text style={[styles.chipText, { color: theme.pillText }, selectedCategoryId === cat.id && styles.chipTextActive]}>
                {cat.name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: theme.input, color: theme.text }]}
          placeholder="Limite mensal (ex: 500)"
          placeholderTextColor={theme.textMuted}
          keyboardType="numeric"
          value={limitInput}
          onChangeText={setLimitInput}
        />
        <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}>
          <Text style={styles.btnText}>Salvar meta</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.sectionTitle, { color: theme.text }]}>Metas cadastradas</Text>

      {goals.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMuted }]}>Nenhuma meta cadastrada.</Text>
      ) : (
        goals.map(goal => {
          const spent = getMonthSpent(goal.categoryId);
          const pct = Math.min(spent / goal.limitAmount, 1);
          const over = spent > goal.limitAmount;
          const barColor = pct < 0.7 ? '#059669' : pct < 1 ? '#f59e0b' : '#dc2626';

          return (
            <View key={goal.id} style={[styles.goalCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.goalHeader}>
                <Text style={[styles.goalName, { color: theme.text }]}>
                  {categoryNameById.get(goal.categoryId) ?? 'Outros'}
                </Text>
                <TouchableOpacity onPress={() => onDeleteGoal(goal.id)}>
                  <Trash2 size={16} color={theme.textMuted} />
                </TouchableOpacity>
              </View>

              <View style={styles.goalAmounts}>
                <Text style={[styles.goalSpent, { color: over ? '#dc2626' : theme.text }]}>
                  {formatCurrency(spent)}
                </Text>
                <Text style={[styles.goalLimit, { color: theme.textSecondary }]}>
                  de {formatCurrency(goal.limitAmount)}
                </Text>
              </View>

              <View style={[styles.barTrack, { backgroundColor: theme.pill }]}>
                <View style={[styles.barFill, { width: `${pct * 100}%`, backgroundColor: barColor }]} />
              </View>

              {over && (
                <Text style={styles.overText}>
                  ⚠ Limite ultrapassado em {formatCurrency(spent - goal.limitAmount)}
                </Text>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  card: { borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  label: { fontWeight: '600', marginBottom: 8, fontSize: 14 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999 },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  input: { padding: 14, borderRadius: 12, marginBottom: 12, fontSize: 15 },
  btnPrimary: { backgroundColor: '#2563eb', alignItems: 'center', padding: 12, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
  goalCard: { borderRadius: 12, padding: 14, marginBottom: 10, borderWidth: 1 },
  goalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  goalName: { fontSize: 15, fontWeight: '700' },
  goalAmounts: { flexDirection: 'row', alignItems: 'baseline', gap: 6, marginBottom: 8 },
  goalSpent: { fontSize: 18, fontWeight: '700' },
  goalLimit: { fontSize: 13 },
  barTrack: { height: 8, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 6 },
  overText: { color: '#dc2626', fontSize: 12, fontWeight: '600', marginTop: 6 },
  empty: { textAlign: 'center', marginVertical: 16 },
});
