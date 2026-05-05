import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { Transaction } from '../types/transaction';
import { formatCurrency } from '../utils/format';
import { Theme } from '../utils/theme';

const PIE_COLORS = ['#2563eb','#dc2626','#059669','#f59e0b','#7c3aed','#0d9488','#db2777','#475569'];

interface Props {
  transactions: Transaction[];
  categoryNameById: Map<string, string>;
  theme: Theme;
}

type TypeFilter = 'all' | 'gain' | 'expense';
type PeriodFilter = 'all' | 'month';

export function ChartsTab({ transactions, categoryNameById, theme }: Props) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');

  const filtered = useMemo(() => {
    const now = new Date();
    return transactions.filter(t => {
      if (typeFilter !== 'all' && t.type !== typeFilter) return false;
      if (periodFilter === 'month') {
        const d = new Date(t.date);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      }
      return true;
    });
  }, [transactions, typeFilter, periodFilter]);

  const chartData = useMemo(() => {
    const map = new Map<string, { categoryName: string; gains: number; expenses: number }>();
    for (const t of filtered) {
      const id = t.categoryId ?? 'cat-outros';
      const name = categoryNameById.get(id) ?? 'Outros';
      const cur = map.get(id) ?? { categoryName: name, gains: 0, expenses: 0 };
      if (t.type === 'gain') cur.gains += t.amount;
      else cur.expenses += t.amount;
      map.set(id, cur);
    }
    const list = Array.from(map.values());
    return {
      topExpenses: [...list].filter(i => i.expenses > 0).sort((a, b) => b.expenses - a.expenses).slice(0, 5),
      topGains: [...list].filter(i => i.gains > 0).sort((a, b) => b.gains - a.gains).slice(0, 5),
    };
  }, [filtered, categoryNameById]);

  const pieData = useMemo(() => {
    const map = new Map<string, { categoryName: string; amount: number }>();
    for (const t of filtered) {
      const id = t.categoryId ?? 'cat-outros';
      const name = categoryNameById.get(id) ?? 'Outros';
      const cur = map.get(id) ?? { categoryName: name, amount: 0 };
      cur.amount += t.amount;
      map.set(id, cur);
    }
    let rows = Array.from(map.values()).filter(i => i.amount > 0).sort((a, b) => b.amount - a.amount);
    const total = rows.reduce((s, i) => s + i.amount, 0);
    const large: typeof rows = [];
    let smallTotal = 0;
    for (const item of rows) {
      if (total && item.amount / total >= 0.05) large.push(item);
      else smallTotal += item.amount;
    }
    if (smallTotal > 0) large.push({ categoryName: 'Outros', amount: smallTotal });
    rows = large;
    const radius = 68;
    const circumference = 2 * Math.PI * radius;
    let offset = 0;
    const segments = rows.map((item, i) => {
      const pct = total ? item.amount / total : 0;
      const len = pct * circumference;
      const seg = { ...item, color: PIE_COLORS[i % PIE_COLORS.length], percentage: pct, segmentLength: len, offset };
      offset += len;
      return seg;
    });
    return { total, radius, circumference, segments };
  }, [filtered, categoryNameById]);

  // Evolução mensal — últimos 6 meses
  const monthlyEvolution = useMemo(() => {
    const now = new Date();
    const months: { label: string; gains: number; expenses: number; balance: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString('pt-BR', { month: 'short' });
      const monthTx = transactions.filter(t => {
        const td = new Date(t.date);
        return td.getMonth() === d.getMonth() && td.getFullYear() === d.getFullYear();
      });
      const gains = monthTx.filter(t => t.type === 'gain').reduce((s, t) => s + t.amount, 0);
      const expenses = monthTx.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
      months.push({ label, gains, expenses, balance: gains - expenses });
    }
    return months;
  }, [transactions]);

  // Comparativo mês atual vs anterior
  const comparison = useMemo(() => {
    const now = new Date();
    const thisMonth = transactions.filter(t => {
      const d = new Date(t.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = transactions.filter(t => {
      const d = new Date(t.date);
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === prev.getMonth() && d.getFullYear() === prev.getFullYear();
    });

    const thisExpenses = thisMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const lastExpenses = lastMonth.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const thisGains = thisMonth.filter(t => t.type === 'gain').reduce((s, t) => s + t.amount, 0);
    const lastGains = lastMonth.filter(t => t.type === 'gain').reduce((s, t) => s + t.amount, 0);

    const expenseDiff = lastExpenses > 0 ? ((thisExpenses - lastExpenses) / lastExpenses) * 100 : 0;
    const gainDiff = lastGains > 0 ? ((thisGains - lastGains) / lastGains) * 100 : 0;

    // Por categoria
    const catMap = new Map<string, { name: string; thisMonth: number; lastMonth: number }>();
    for (const t of [...thisMonth, ...lastMonth]) {
      if (t.type !== 'expense') continue;
      const id = t.categoryId ?? 'cat-outros';
      const name = categoryNameById.get(id) ?? 'Outros';
      const cur = catMap.get(id) ?? { name, thisMonth: 0, lastMonth: 0 };
      if (thisMonth.includes(t)) cur.thisMonth += t.amount;
      else cur.lastMonth += t.amount;
      catMap.set(id, cur);
    }
    const catComparison = Array.from(catMap.values())
      .filter(c => c.thisMonth > 0 || c.lastMonth > 0)
      .sort((a, b) => b.thisMonth - a.thisMonth)
      .slice(0, 5);

    return { thisExpenses, lastExpenses, expenseDiff, thisGains, lastGains, gainDiff, catComparison };
  }, [transactions, categoryNameById]);

  // Mini gráfico de linha para evolução
  const lineChart = useMemo(() => {
    const W = 280;
    const H = 80;
    const maxVal = Math.max(...monthlyEvolution.map(m => Math.max(m.gains, m.expenses)), 1);
    const points = (key: 'gains' | 'expenses') =>
      monthlyEvolution.map((m, i) => {
        const x = (i / (monthlyEvolution.length - 1)) * (W - 20) + 10;
        const y = H - (m[key] / maxVal) * (H - 10) - 5;
        return `${x},${y}`;
      }).join(' ');
    return { W, H, gainPoints: points('gains'), expensePoints: points('expenses') };
  }, [monthlyEvolution]);

  function renderBars(items: { categoryName: string; gains: number; expenses: number }[], key: 'gains' | 'expenses', color: string) {
    const max = Math.max(...items.map(i => i[key]), 1);
    return items.map(item => (
      <View key={`${key}-${item.categoryName}`} style={styles.barRow}>
        <View style={styles.barLabel}>
          <Text style={[styles.barName, { color: theme.text }]}>{item.categoryName}</Text>
          <Text style={[styles.barVal, { color: theme.textSecondary }]}>{formatCurrency(item[key])}</Text>
        </View>
        <View style={[styles.barTrack, { backgroundColor: theme.pill }]}>
          <View style={[styles.barFill, { width: `${(item[key] / max) * 100}%`, backgroundColor: color }]} />
        </View>
      </View>
    ));
  }

  return (
    <ScrollView style={[styles.container, { backgroundColor: theme.bg }]} contentContainerStyle={{ paddingBottom: 160 }}>
      {/* Filtros */}
      <Text style={[styles.sectionTitle, { color: theme.text }]}>Filtros</Text>
      <View style={styles.filterRow}>
        {(['all', 'expense', 'gain'] as TypeFilter[]).map(f => (
          <TouchableOpacity key={f} style={[styles.pill, { backgroundColor: theme.pill }, typeFilter === f && styles.pillActive]} onPress={() => setTypeFilter(f)}>
            <Text style={[styles.pillText, { color: theme.pillText }, typeFilter === f && styles.pillTextActive]}>
              {f === 'all' ? 'Todos' : f === 'gain' ? 'Ganhos' : 'Despesas'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
      <View style={styles.filterRow}>
        {(['all', 'month'] as PeriodFilter[]).map(f => (
          <TouchableOpacity key={f} style={[styles.pill, { backgroundColor: theme.pill }, periodFilter === f && styles.pillActive]} onPress={() => setPeriodFilter(f)}>
            <Text style={[styles.pillText, { color: theme.pillText }, periodFilter === f && styles.pillTextActive]}>
              {f === 'all' ? 'Todo periodo' : 'Mes atual'}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Evolução mensal */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.chartTitle, { color: theme.text }]}>Evolucao mensal (6 meses)</Text>
        <Svg width={lineChart.W} height={lineChart.H} style={{ alignSelf: 'center' }}>
          <Polyline points={lineChart.gainPoints} fill="none" stroke="#059669" strokeWidth={2} />
          <Polyline points={lineChart.expensePoints} fill="none" stroke="#dc2626" strokeWidth={2} />
        </Svg>
        <View style={styles.legendRow}>
          <View style={[styles.legendDot, { backgroundColor: '#059669' }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Ganhos</Text>
          <View style={[styles.legendDot, { backgroundColor: '#dc2626', marginLeft: 12 }]} />
          <Text style={[styles.legendText, { color: theme.textSecondary }]}>Despesas</Text>
        </View>
        <View style={styles.monthLabels}>
          {monthlyEvolution.map(m => (
            <Text key={m.label} style={[styles.monthLabel, { color: theme.textMuted }]}>{m.label}</Text>
          ))}
        </View>
        {monthlyEvolution.map(m => (
          <View key={m.label} style={styles.monthRow}>
            <Text style={[styles.monthName, { color: theme.textSecondary }]}>{m.label}</Text>
            <Text style={{ color: '#059669', fontWeight: '600', fontSize: 12 }}>+{formatCurrency(m.gains)}</Text>
            <Text style={{ color: '#dc2626', fontWeight: '600', fontSize: 12 }}>-{formatCurrency(m.expenses)}</Text>
            <Text style={[{ fontWeight: '700', fontSize: 12 }, { color: m.balance >= 0 ? '#059669' : '#dc2626' }]}>{formatCurrency(m.balance)}</Text>
          </View>
        ))}
      </View>

      {/* Comparativo */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.chartTitle, { color: theme.text }]}>Comparativo com mes anterior</Text>
        <View style={styles.compRow}>
          <View style={styles.compItem}>
            <Text style={[styles.compLabel, { color: theme.textSecondary }]}>Despesas</Text>
            <Text style={[styles.compValue, { color: theme.text }]}>{formatCurrency(comparison.thisExpenses)}</Text>
            <Text style={[styles.compDiff, { color: comparison.expenseDiff > 0 ? '#dc2626' : '#059669' }]}>
              {comparison.expenseDiff > 0 ? '▲' : '▼'} {Math.abs(comparison.expenseDiff).toFixed(1)}%
            </Text>
          </View>
          <View style={styles.compItem}>
            <Text style={[styles.compLabel, { color: theme.textSecondary }]}>Ganhos</Text>
            <Text style={[styles.compValue, { color: theme.text }]}>{formatCurrency(comparison.thisGains)}</Text>
            <Text style={[styles.compDiff, { color: comparison.gainDiff >= 0 ? '#059669' : '#dc2626' }]}>
              {comparison.gainDiff >= 0 ? '▲' : '▼'} {Math.abs(comparison.gainDiff).toFixed(1)}%
            </Text>
          </View>
        </View>
        {comparison.catComparison.map(c => {
          const diff = c.lastMonth > 0 ? ((c.thisMonth - c.lastMonth) / c.lastMonth) * 100 : 0;
          return (
            <View key={c.name} style={styles.catCompRow}>
              <Text style={[styles.catCompName, { color: theme.text }]}>{c.name}</Text>
              <Text style={[styles.catCompVal, { color: theme.textSecondary }]}>{formatCurrency(c.thisMonth)}</Text>
              {c.lastMonth > 0 && (
                <Text style={[styles.catCompDiff, { color: diff > 0 ? '#dc2626' : '#059669' }]}>
                  {diff > 0 ? '+' : ''}{diff.toFixed(0)}%
                </Text>
              )}
            </View>
          );
        })}
      </View>

      {/* Pizza */}
      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.chartTitle, { color: theme.text }]}>Distribuicao por categoria</Text>
        {pieData.segments.length ? (
          <>
            <View style={styles.pieWrapper}>
              <Svg width={180} height={180}>
                <Circle cx={90} cy={90} r={pieData.radius} stroke={theme.border} strokeWidth={34} fill="none" />
                {pieData.segments.map(seg => (
                  <Circle key={`pie-${seg.categoryName}`} cx={90} cy={90} r={pieData.radius} stroke={seg.color} strokeWidth={34} fill="none" strokeLinecap="butt" strokeDasharray={`${seg.segmentLength} ${pieData.circumference}`} strokeDashoffset={-seg.offset} transform="rotate(-90 90 90)" />
                ))}
              </Svg>
              <View style={styles.pieCenter}>
                <Text style={[styles.pieCenterLabel, { color: theme.textSecondary }]}>Total</Text>
                <Text style={[styles.pieCenterValue, { color: theme.text }]}>{formatCurrency(pieData.total)}</Text>
              </View>
            </View>
            <View style={{ gap: 8 }}>
              {pieData.segments.map(seg => (
                <View key={`leg-${seg.categoryName}`} style={styles.legendRow}>
                  <View style={[styles.legendDot, { backgroundColor: seg.color }]} />
                  <Text style={[styles.legendText, { color: theme.text }]}>{seg.categoryName} ({(seg.percentage * 100).toFixed(1)}%)</Text>
                  <Text style={[styles.legendValue, { color: theme.text }]}>{formatCurrency(seg.amount)}</Text>
                </View>
              ))}
            </View>
          </>
        ) : <Text style={[styles.empty, { color: theme.textMuted }]}>Sem dados para este filtro.</Text>}
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.chartTitle, { color: theme.text }]}>Categorias com mais gastos</Text>
        {chartData.topExpenses.length ? renderBars(chartData.topExpenses, 'expenses', '#dc2626') : <Text style={[styles.empty, { color: theme.textMuted }]}>Sem dados.</Text>}
      </View>

      <View style={[styles.card, { backgroundColor: theme.card }]}>
        <Text style={[styles.chartTitle, { color: theme.text }]}>Categorias com mais entradas</Text>
        {chartData.topGains.length ? renderBars(chartData.topGains, 'gains', '#059669') : <Text style={[styles.empty, { color: theme.textMuted }]}>Sem dados.</Text>}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700', marginBottom: 10 },
  filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  pill: { borderRadius: 20, paddingVertical: 7, paddingHorizontal: 12 },
  pillActive: { backgroundColor: '#2563eb' },
  pillText: { fontWeight: '600', fontSize: 13 },
  pillTextActive: { color: '#fff' },
  card: { borderRadius: 12, padding: 14, marginBottom: 12 },
  chartTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  pieWrapper: { alignItems: 'center', justifyContent: 'center', marginVertical: 8 },
  pieCenter: { position: 'absolute', alignItems: 'center' },
  pieCenterLabel: { fontSize: 12, fontWeight: '600' },
  pieCenterValue: { fontSize: 14, fontWeight: '700', marginTop: 2 },
  legendRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  legendDot: { width: 10, height: 10, borderRadius: 5, marginRight: 8 },
  legendText: { flex: 1, fontSize: 13 },
  legendValue: { fontWeight: '700', fontSize: 13 },
  barRow: { marginBottom: 10 },
  barLabel: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  barName: { fontWeight: '500' },
  barVal: { fontWeight: '600' },
  barTrack: { height: 8, borderRadius: 6, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 6 },
  empty: { textAlign: 'center', marginVertical: 8 },
  monthLabels: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 10, marginBottom: 8 },
  monthLabel: { fontSize: 11 },
  monthRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderTopWidth: 1, borderTopColor: '#f1f5f9' },
  monthName: { fontSize: 12, width: 40 },
  compRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  compItem: { flex: 1, alignItems: 'center' },
  compLabel: { fontSize: 12, marginBottom: 2 },
  compValue: { fontSize: 16, fontWeight: '700' },
  compDiff: { fontSize: 13, fontWeight: '600', marginTop: 2 },
  catCompRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  catCompName: { flex: 1, fontSize: 13 },
  catCompVal: { fontSize: 13, marginRight: 8 },
  catCompDiff: { fontSize: 13, fontWeight: '700', width: 50, textAlign: 'right' },
});
