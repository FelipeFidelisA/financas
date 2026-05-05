import React, { useMemo, useState } from 'react';
import {
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { CheckSquare, Pencil, Plus, Square, Trash2, TrendingDown, TrendingUp } from 'lucide-react-native';
import { Category } from '../types/category';
import { Transaction } from '../types/transaction';
import { formatCurrency, formatDate } from '../utils/format';

interface Props {
  transactions: Transaction[];
  categories: Category[];
  onAdd: () => void;
  onEdit: (t: Transaction) => void;
  onDelete: (id: string) => void;
  onBulkCategory: (ids: string[], categoryId: string) => void;
}

export function TransactionsTab({ transactions, categories, onAdd, onEdit, onDelete, onBulkCategory }: Props) {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'gain' | 'expense'>('all');
  const [filterCategoryId, setFilterCategoryId] = useState('all');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkCategoryId, setBulkCategoryId] = useState('');

  const categoryNameById = useMemo(
    () => new Map(categories.map(c => [c.id, c.name])),
    [categories],
  );

  const filtered = useMemo(() => {
    return transactions.filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterCategoryId !== 'all' && t.categoryId !== filterCategoryId) return false;
      if (search && !t.description.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [transactions, filterType, filterCategoryId, search]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, t) => {
        if (t.type === 'gain') acc.gains += t.amount;
        else acc.expenses += t.amount;
        acc.balance = acc.gains - acc.expenses;
        return acc;
      },
      { gains: 0, expenses: 0, balance: 0 },
    );
  }, [filtered]);

  // Agrupar por mês
  type ListItem =
    | { kind: 'header'; key: string; label: string; gains: number; expenses: number }
    | { kind: 'transaction'; key: string; data: Transaction };

  const listItems = useMemo<ListItem[]>(() => {
    const items: ListItem[] = [];
    let currentMonth = '';
    let monthGains = 0;
    let monthExpenses = 0;
    let headerIndex = -1;

    for (const t of filtered) {
      const d = new Date(t.date);
      const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const monthLabel = d.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

      if (monthKey !== currentMonth) {
        if (headerIndex >= 0) {
          (items[headerIndex] as any).gains = monthGains;
          (items[headerIndex] as any).expenses = monthExpenses;
        }
        currentMonth = monthKey;
        monthGains = 0;
        monthExpenses = 0;
        headerIndex = items.length;
        items.push({ kind: 'header', key: `header-${monthKey}`, label: monthLabel, gains: 0, expenses: 0 });
      }

      if (t.type === 'gain') monthGains += t.amount;
      else monthExpenses += t.amount;

      if (headerIndex >= 0) {
        (items[headerIndex] as any).gains = monthGains;
        (items[headerIndex] as any).expenses = monthExpenses;
      }

      items.push({ kind: 'transaction', key: t.id, data: t });
    }

    return items;
  }, [filtered]);

  const isSelecting = selectedIds.length > 0;

  function toggleSelect(id: string) {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  }

  function handleApplyBulk() {
    if (!bulkCategoryId) return;
    onBulkCategory(selectedIds, bulkCategoryId);
    setSelectedIds([]);
    setBulkCategoryId('');
  }

  return (
    <>
      {/* Resumo */}
      <View style={styles.summaryRow}>
        <View style={[styles.card, styles.gainCard]}>
          <TrendingUp size={20} color="#059669" />
          <Text style={styles.cardLabel}>Ganhos</Text>
          <Text style={styles.cardValue}>{formatCurrency(totals.gains)}</Text>
        </View>
        <View style={[styles.card, styles.expenseCard]}>
          <TrendingDown size={20} color="#dc2626" />
          <Text style={styles.cardLabel}>Despesas</Text>
          <Text style={styles.cardValue}>{formatCurrency(totals.expenses)}</Text>
        </View>
      </View>

      <View style={[styles.card, styles.balanceCard]}>
        <Text style={[styles.cardLabel, { color: '#94a3b8' }]}>Saldo</Text>
        <Text style={[styles.cardValue, { fontSize: 22, color: '#fff' }]}>{formatCurrency(totals.balance)}</Text>
      </View>

      {/* Busca */}
      <View style={styles.searchRow}>
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar transacao..."
          value={search}
          onChangeText={setSearch}
        />
      </View>

      {/* Filtros tipo */}
      <View style={styles.filterRow}>
        {(['all', 'gain', 'expense'] as const).map(f => (
          <TouchableOpacity
            key={f}
            style={[styles.pill, filterType === f && styles.pillActive]}
            onPress={() => setFilterType(f)}
          >
            <Text style={[styles.pillText, filterType === f && styles.pillTextActive]}>
              {f === 'all' ? 'Todos' : f === 'gain' ? 'Ganhos' : 'Despesas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Filtro categoria */}
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.pill, filterCategoryId === 'all' && styles.pillActive]}
          onPress={() => setFilterCategoryId('all')}
        >
          <Text style={[styles.pillText, filterCategoryId === 'all' && styles.pillTextActive]}>Todas</Text>
        </TouchableOpacity>
        {categories.map(c => (
          <TouchableOpacity
            key={c.id}
            style={[styles.pill, filterCategoryId === c.id && styles.pillActive]}
            onPress={() => setFilterCategoryId(c.id)}
          >
            <Text style={[styles.pillText, filterCategoryId === c.id && styles.pillTextActive]}>{c.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Barra de seleção em lote */}
      {isSelecting && (
        <View style={styles.bulkBar}>
          <Text style={styles.bulkCount}>{selectedIds.length} selecionadas</Text>
          <View style={styles.bulkChips}>
            {categories.map(c => (
              <TouchableOpacity
                key={c.id}
                style={[styles.pill, bulkCategoryId === c.id && styles.pillActive]}
                onPress={() => setBulkCategoryId(c.id)}
              >
                <Text style={[styles.pillText, bulkCategoryId === c.id && styles.pillTextActive]}>{c.name}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <View style={styles.bulkButtons}>
            <TouchableOpacity style={styles.bulkApply} onPress={handleApplyBulk}>
              <Text style={styles.bulkApplyText}>Aplicar categoria</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.bulkCancel} onPress={() => setSelectedIds([])}>
              <Text style={styles.bulkCancelText}>Cancelar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <FlatList
        data={listItems}
        keyExtractor={item => item.key}
        initialNumToRender={15}
        maxToRenderPerBatch={15}
        windowSize={10}
        contentContainerStyle={{ paddingBottom: 160 }}
        renderItem={({ item }) => {
          if (item.kind === 'header') {
            return (
              <View style={styles.monthHeader}>
                <Text style={styles.monthLabel}>
                  {item.label.charAt(0).toUpperCase() + item.label.slice(1)}
                </Text>
                <View style={styles.monthTotals}>
                  <Text style={styles.monthGain}>+{formatCurrency(item.gains)}</Text>
                  <Text style={styles.monthExpense}>-{formatCurrency(item.expenses)}</Text>
                </View>
              </View>
            );
          }

          const t = item.data;
          const isSelected = selectedIds.includes(t.id);

          return (
            <TouchableOpacity
              style={[styles.transactionItem, isSelected && styles.transactionItemSelected]}
              onLongPress={() => toggleSelect(t.id)}
              onPress={() => isSelecting ? toggleSelect(t.id) : undefined}
            >
              {isSelecting && (
                <TouchableOpacity onPress={() => toggleSelect(t.id)} style={{ marginRight: 8 }}>
                  {isSelected
                    ? <CheckSquare size={20} color="#2563eb" />
                    : <Square size={20} color="#94a3b8" />
                  }
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }}>
                <Text style={styles.transactionDesc}>{t.description}</Text>
                <Text style={styles.transactionMeta}>
                  {categoryNameById.get(t.categoryId) ?? 'Outros'} · {formatDate(t.date)}
                </Text>
              </View>
              <View style={styles.transactionRight}>
                {!isSelecting && (
                  <TouchableOpacity onPress={() => onEdit(t)}>
                    <Pencil size={18} color="#64748b" />
                  </TouchableOpacity>
                )}
                <Text style={[styles.transactionAmount, { color: t.type === 'gain' ? '#059669' : '#dc2626' }]}>
                  {t.type === 'gain' ? '+' : '-'} {formatCurrency(t.amount)}
                </Text>
                {!isSelecting && (
                  <TouchableOpacity onPress={() => onDelete(t.id)}>
                    <Trash2 size={18} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              </View>
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={() => (
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Nenhuma transacao encontrada.</Text>
          </View>
        )}
      />

      <TouchableOpacity style={styles.fab} onPress={onAdd}>
        <Plus size={32} color="#fff" />
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  summaryRow: { flexDirection: 'row', padding: 16, gap: 12 },
  card: { backgroundColor: '#fff', padding: 14, borderRadius: 12, elevation: 2 },
  gainCard: { flex: 1, borderLeftWidth: 4, borderLeftColor: '#059669' },
  expenseCard: { flex: 1, borderLeftWidth: 4, borderLeftColor: '#dc2626' },
  balanceCard: { marginHorizontal: 16, marginBottom: 12, alignItems: 'center', backgroundColor: '#1e293b' },
  cardLabel: { fontSize: 13, color: '#64748b', marginTop: 4 },
  cardValue: { fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginTop: 4 },
  searchRow: { paddingHorizontal: 16, marginBottom: 8 },
  searchInput: { backgroundColor: '#fff', padding: 12, borderRadius: 12, fontSize: 15, borderWidth: 1, borderColor: '#e2e8f0' },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 6, marginBottom: 8 },
  pill: { backgroundColor: '#e2e8f0', borderRadius: 20, paddingVertical: 6, paddingHorizontal: 12 },
  pillActive: { backgroundColor: '#2563eb' },
  pillText: { color: '#475569', fontWeight: '600', fontSize: 13 },
  pillTextActive: { color: '#fff' },
  bulkBar: { backgroundColor: '#eff6ff', margin: 16, borderRadius: 12, padding: 12, gap: 8 },
  bulkCount: { fontWeight: '700', color: '#1e40af', marginBottom: 4 },
  bulkChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  bulkButtons: { flexDirection: 'row', gap: 8, marginTop: 4 },
  bulkApply: { flex: 1, backgroundColor: '#2563eb', padding: 10, borderRadius: 8, alignItems: 'center' },
  bulkApplyText: { color: '#fff', fontWeight: '700' },
  bulkCancel: { flex: 1, backgroundColor: '#e2e8f0', padding: 10, borderRadius: 8, alignItems: 'center' },
  bulkCancelText: { color: '#475569', fontWeight: '700' },
  monthHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#f8fafc' },
  monthLabel: { fontWeight: '700', color: '#475569', fontSize: 14 },
  monthTotals: { flexDirection: 'row', gap: 8 },
  monthGain: { color: '#059669', fontWeight: '600', fontSize: 13 },
  monthExpense: { color: '#dc2626', fontWeight: '600', fontSize: 13 },
  transactionItem: { backgroundColor: '#fff', padding: 14, marginHorizontal: 16, marginBottom: 8, borderRadius: 12, flexDirection: 'row', alignItems: 'center' },
  transactionItemSelected: { borderWidth: 2, borderColor: '#2563eb' },
  transactionDesc: { fontSize: 15, fontWeight: '500', color: '#1e293b' },
  transactionMeta: { fontSize: 12, color: '#94a3b8', marginTop: 2 },
  transactionRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  transactionAmount: { fontSize: 15, fontWeight: 'bold' },
  fab: { position: 'absolute', bottom: 88, right: 24, width: 58, height: 58, borderRadius: 29, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  empty: { alignItems: 'center', marginTop: 50 },
  emptyText: { color: '#94a3b8' },
});
