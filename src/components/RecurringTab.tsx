import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Category } from '../types/category';
import { RecurringTransaction } from '../storage/recurringStorage';
import { Transaction } from '../types/transaction';
import { formatCurrency } from '../utils/format';
import { Theme } from '../utils/theme';

interface Props {
  categories: Category[];
  recurring: RecurringTransaction[];
  transactions: Transaction[];
  theme: Theme;
  onSave: (r: RecurringTransaction) => void;
  onDelete: (id: string) => void;
}

export function RecurringTab({ categories, recurring, transactions, theme, onSave, onDelete }: Props) {
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'gain' | 'expense'>('expense');
  const [categoryId, setCategoryId] = useState(categories[0]?.id ?? '');
  const [frequency, setFrequency] = useState<'monthly' | 'weekly'>('monthly');
  const [day, setDay] = useState('1');

  const categoryNameById = useMemo(() => new Map(categories.map(c => [c.id, c.name])), [categories]);

  const now = new Date();
  const currentMonthBalance = useMemo(() => {
    return transactions
      .filter(t => {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, t) => s + (t.type === 'gain' ? t.amount : -t.amount), 0);
  }, [transactions]);

  const projectedBalance = useMemo(() => {
    const today = now.getDate();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    let projection = currentMonthBalance;

    for (const r of recurring) {
      if (!r.active) continue;
      let targetDay = 1;
      if (r.frequency === 'monthly') targetDay = r.dayOfMonth ?? 1;
      else {
        // próxima ocorrência do dia da semana
        const d = new Date(now.getFullYear(), now.getMonth(), 1);
        while (d.getDay() !== (r.dayOfWeek ?? 0)) d.setDate(d.getDate() + 1);
        targetDay = d.getDate();
      }
      if (targetDay > today && targetDay <= daysInMonth) {
        projection += r.type === 'gain' ? r.amount : -r.amount;
      }
    }
    return projection;
  }, [recurring, currentMonthBalance, now]);

  function handleSave() {
    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (!description.trim() || isNaN(parsedAmount) || parsedAmount <= 0 || !categoryId) return;
    onSave({
      id: `rec-${Date.now()}`,
      description: description.trim(),
      amount: parsedAmount,
      type,
      categoryId,
      frequency,
      dayOfMonth: frequency === 'monthly' ? parseInt(day) : undefined,
      dayOfWeek: frequency === 'weekly' ? parseInt(day) : undefined,
      active: true,
    });
    setDescription('');
    setAmount('');
    setDay('1');
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 160 }}>

      {/* Projeção */}
      <View style={[styles.projCard, { backgroundColor: '#1e293b' }]}>
        <Text style={styles.projLabel}>Projecao de saldo (fim do mes)</Text>
        <Text style={[styles.projValue, { color: projectedBalance >= 0 ? '#059669' : '#dc2626' }]}>
          {formatCurrency(projectedBalance)}
        </Text>
        <Text style={styles.projSub}>Saldo atual do mes: {formatCurrency(currentMonthBalance)}</Text>
      </View>

      {/* Formulário */}
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Text style={[styles.sectionTitle, { color: theme.text }]}>Nova recorrente</Text>

        <TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.text }]} placeholder="Descricao" placeholderTextColor={theme.textMuted} value={description} onChangeText={setDescription} />
        <TextInput style={[styles.input, { backgroundColor: theme.input, color: theme.text }]} placeholder="Valor" placeholderTextColor={theme.textMuted} keyboardType="numeric" value={amount} onChangeText={setAmount} />

        <Text style={[styles.label, { color: theme.textSecondary }]}>Tipo</Text>
        <View style={styles.row}>
          {(['expense', 'gain'] as const).map(t => (
            <TouchableOpacity key={t} style={[styles.typeBtn, type === t && (t === 'gain' ? styles.typeBtnGain : styles.typeBtnExpense)]} onPress={() => setType(t)}>
              <Text style={[styles.typeBtnText, type === t && { color: '#fff' }]}>{t === 'gain' ? 'Ganho' : 'Despesa'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.label, { color: theme.textSecondary }]}>Frequencia</Text>
        <View style={styles.row}>
          {(['monthly', 'weekly'] as const).map(f => (
            <TouchableOpacity key={f} style={[styles.typeBtn, frequency === f && styles.typeBtnActive]} onPress={() => setFrequency(f)}>
              <Text style={[styles.typeBtnText, frequency === f && { color: '#fff' }]}>{f === 'monthly' ? 'Mensal' : 'Semanal'}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TextInput
          style={[styles.input, { backgroundColor: theme.input, color: theme.text }]}
          placeholder={frequency === 'monthly' ? 'Dia do mes (1-31)' : 'Dia da semana (0=Dom, 6=Sab)'}
          placeholderTextColor={theme.textMuted}
          keyboardType="numeric"
          value={day}
          onChangeText={setDay}
        />

        <Text style={[styles.label, { color: theme.textSecondary }]}>Categoria</Text>
        <View style={styles.chips}>
          {categories.map(cat => (
            <TouchableOpacity key={cat.id} style={[styles.chip, { backgroundColor: theme.pill }, categoryId === cat.id && styles.chipActive]} onPress={() => setCategoryId(cat.id)}>
              <Text style={[styles.chipText, { color: theme.pillText }, categoryId === cat.id && styles.chipTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <TouchableOpacity style={styles.btnPrimary} onPress={handleSave}>
          <Text style={styles.btnText}>Salvar recorrente</Text>
        </TouchableOpacity>
      </View>

      {/* Lista */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Recorrentes cadastradas</Text>
      {recurring.length === 0 ? (
        <Text style={[styles.empty, { color: theme.textMuted }]}>Nenhuma recorrente cadastrada.</Text>
      ) : (
        recurring.map(r => (
          <View key={r.id} style={[styles.recCard, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.recName, { color: theme.text }]}>{r.description}</Text>
              <Text style={[styles.recMeta, { color: theme.textSecondary }]}>
                {categoryNameById.get(r.categoryId) ?? 'Outros'} · {r.frequency === 'monthly' ? `Todo dia ${r.dayOfMonth}` : `Toda semana (dia ${r.dayOfWeek})`}
              </Text>
            </View>
            <Text style={[styles.recAmount, { color: r.type === 'gain' ? '#059669' : '#dc2626' }]}>
              {r.type === 'gain' ? '+' : '-'}{formatCurrency(r.amount)}
            </Text>
            <TouchableOpacity onPress={() => onDelete(r.id)} style={{ marginLeft: 8 }}>
              <Trash2 size={16} color={theme.textMuted} />
            </TouchableOpacity>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  projCard: { borderRadius: 12, padding: 16, marginBottom: 16, alignItems: 'center' },
  projLabel: { color: '#94a3b8', fontSize: 13, marginBottom: 4 },
  projValue: { fontSize: 28, fontWeight: '700' },
  projSub: { color: '#64748b', fontSize: 12, marginTop: 4 },
  card: { borderRadius: 12, padding: 14, marginBottom: 16, borderWidth: 1 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 12 },
  label: { fontWeight: '600', marginBottom: 8, fontSize: 14 },
  input: { padding: 14, borderRadius: 12, marginBottom: 12, fontSize: 15 },
  row: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  typeBtn: { flex: 1, padding: 10, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0', alignItems: 'center' },
  typeBtnGain: { backgroundColor: '#059669', borderColor: '#059669' },
  typeBtnExpense: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  typeBtnActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  typeBtnText: { fontWeight: '600', color: '#64748b' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999 },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  btnPrimary: { backgroundColor: '#2563eb', alignItems: 'center', padding: 12, borderRadius: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
  recCard: { borderRadius: 12, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  recName: { fontSize: 15, fontWeight: '600' },
  recMeta: { fontSize: 12, marginTop: 2 },
  recAmount: { fontSize: 15, fontWeight: '700' },
  empty: { textAlign: 'center', marginVertical: 16 },
});
