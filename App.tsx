import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  FlatList,
  Modal,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import {
  BarChart3,
  List,
  Pencil,
  Plus,
  Tags,
  Trash2,
  TrendingDown,
  TrendingUp,
} from 'lucide-react-native';
import {
  deleteCategory,
  getAllCategories,
  saveCategory,
} from './src/storage/categoryStorage';
import { Transaction } from './src/types/transaction';
import { Category } from './src/types/category';
import {
  deleteTransaction,
  getAllTransactions,
  saveTransaction,
  updateTransaction,
} from './src/storage/transactionStorage';
import { formatCurrency, formatDate } from './src/utils/format';

type Tab = 'transactions' | 'categories' | 'charts';
type ChartTypeFilter = 'all' | 'gain' | 'expense';
type ChartPeriodFilter = 'all' | 'month';

const PIE_COLORS = [
  '#2563eb',
  '#dc2626',
  '#059669',
  '#f59e0b',
  '#7c3aed',
  '#0d9488',
  '#db2777',
  '#475569',
];

export default function App() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeTab, setActiveTab] = useState<Tab>('transactions');

  const [isModalVisible, setIsModalVisible] = useState(false);
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'gain' | 'expense'>('gain');
  const [selectedCategoryId, setSelectedCategoryId] = useState('cat-outros');
  const [transactionDateInput, setTransactionDateInput] = useState('');
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);

  const [newCategoryName, setNewCategoryName] = useState('');
  const [chartTypeFilter, setChartTypeFilter] = useState<ChartTypeFilter>('all');
  const [chartPeriodFilter, setChartPeriodFilter] = useState<ChartPeriodFilter>('all');

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    setTransactionDateInput(formatDateInput(Date.now()));
  }, []);

  async function loadInitialData() {
    const [transactionsData, categoriesData] = await Promise.all([
      getAllTransactions(),
      getAllCategories(),
    ]);

    setTransactions(transactionsData);
    setCategories(categoriesData);
    setSelectedCategoryId(categoriesData[0]?.id ?? 'cat-outros');
  }

  async function loadTransactions() {
    const data = await getAllTransactions();
    setTransactions(data);
  }

  async function loadCategories() {
    const data = await getAllCategories();
    setCategories(data);

    if (!data.some(category => category.id === selectedCategoryId)) {
      setSelectedCategoryId(data[0]?.id ?? 'cat-outros');
    }
  }

  async function handleSaveTransaction() {
    if (!amount || !selectedCategoryId) {
      Alert.alert('Erro', 'Informe valor e categoria');
      return;
    }

    const parsedAmount = Number(amount.replace(',', '.'));

    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      Alert.alert('Erro', 'Informe um valor valido maior que zero');
      return;
    }

    const parsedDate = parseDateInput(transactionDateInput);

    if (!parsedDate) {
      Alert.alert('Erro', 'Data invalida. Use o formato DD/MM/AAAA.');
      return;
    }

    const normalizedDescription = description.trim();
    const selectedCategoryName =
      categories.find(category => category.id === selectedCategoryId)?.name ??
      'Outros';
    const fallbackDescription = selectedCategoryName;

    const transactionToSave: Transaction = {
      id: editingTransactionId ?? String(new Date().getTime()),
      description: normalizedDescription || fallbackDescription,
      amount: parsedAmount,
      type,
      categoryId: selectedCategoryId,
      date: parsedDate,
    };

    if (editingTransactionId) {
      await updateTransaction(transactionToSave);
    } else {
      await saveTransaction(transactionToSave);
    }

    resetTransactionForm();
    await loadTransactions();
  }

  function openNewTransactionModal() {
    setEditingTransactionId(null);
    setDescription('');
    setAmount('');
    setType('gain');
    setSelectedCategoryId(categories[0]?.id ?? 'cat-outros');
    setTransactionDateInput(formatDateInput(Date.now()));
    setIsModalVisible(true);
  }

  function openEditTransactionModal(transaction: Transaction) {
    setEditingTransactionId(transaction.id);
    setDescription(transaction.description);
    setAmount(String(transaction.amount));
    setType(transaction.type);
    setSelectedCategoryId(transaction.categoryId ?? 'cat-outros');
    setTransactionDateInput(formatDateInput(transaction.date));
    setIsModalVisible(true);
  }

  function resetTransactionForm() {
    setDescription('');
    setAmount('');
    setType('gain');
    setSelectedCategoryId(categories[0]?.id ?? 'cat-outros');
    setTransactionDateInput(formatDateInput(Date.now()));
    setEditingTransactionId(null);
    setIsModalVisible(false);
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

    if (!match) {
      return null;
    }

    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);

    const parsed = new Date(year, month - 1, day);

    if (
      parsed.getFullYear() !== year ||
      parsed.getMonth() !== month - 1 ||
      parsed.getDate() !== day
    ) {
      return null;
    }

    return parsed.getTime();
  }

  async function handleCreateCategory() {
    const normalizedName = newCategoryName.trim();

    if (!normalizedName) {
      Alert.alert('Erro', 'Informe um nome para categoria');
      return;
    }

    try {
      await saveCategory({
        id: `cat-${Date.now()}`,
        name: normalizedName,
        createdAt: Date.now(),
      });

      setNewCategoryName('');
      await loadCategories();
    } catch {
      Alert.alert('Erro', 'Categoria ja existe');
    }
  }

  async function handleDelete(id: string) {
    Alert.alert('Excluir', 'Tem certeza que deseja excluir esta transação?', [
      { text: 'Não', style: 'cancel' },
      { 
        text: 'Sim', 
        onPress: async () => {
          await deleteTransaction(id);
          loadTransactions();
        } 
      }
    ]);
  }

  async function handleDeleteCategory(category: Category) {
    const hasLinkedTransaction = transactions.some(
      transaction => transaction.categoryId === category.id,
    );

    if (hasLinkedTransaction) {
      Alert.alert(
        'Categoria em uso',
        'Essa categoria possui transacoes vinculadas e nao pode ser removida.',
      );
      return;
    }

    Alert.alert('Excluir categoria', `Deseja excluir "${category.name}"?`, [
      { text: 'Nao', style: 'cancel' },
      {
        text: 'Sim',
        onPress: async () => {
          await deleteCategory(category.id);
          loadCategories();
        },
      },
    ]);
  }

  const totals = transactions.reduce((acc, t) => {
    if (t.type === 'gain') acc.gains += t.amount;
    else acc.expenses += t.amount;
    acc.balance = acc.gains - acc.expenses;
    return acc;
  }, { gains: 0, expenses: 0, balance: 0 });

  const categoryNameById = useMemo(() => {
    return new Map(categories.map(category => [category.id, category.name]));
  }, [categories]);

  const chartTransactions = useMemo(() => {
    const now = new Date();

    return transactions.filter(transaction => {
      if (chartTypeFilter !== 'all' && transaction.type !== chartTypeFilter) {
        return false;
      }

      if (chartPeriodFilter === 'month') {
        const date = new Date(transaction.date);
        return (
          date.getMonth() === now.getMonth() &&
          date.getFullYear() === now.getFullYear()
        );
      }

      return true;
    });
  }, [transactions, chartTypeFilter, chartPeriodFilter]);

  const chartData = useMemo(() => {
    const totalsByCategory = new Map<
      string,
      { categoryName: string; gains: number; expenses: number }
    >();

    for (const transaction of chartTransactions) {
      const categoryId = transaction.categoryId ?? 'cat-outros';
      const categoryName = categoryNameById.get(categoryId) ?? 'Outros';
      const current = totalsByCategory.get(categoryId) ?? {
        categoryName,
        gains: 0,
        expenses: 0,
      };

      if (transaction.type === 'gain') {
        current.gains += transaction.amount;
      } else {
        current.expenses += transaction.amount;
      }

      totalsByCategory.set(categoryId, current);
    }

    const list = Array.from(totalsByCategory.values());

    const topExpenses = [...list]
      .filter(item => item.expenses > 0)
      .sort((a, b) => b.expenses - a.expenses)
      .slice(0, 5);

    const topGains = [...list]
      .filter(item => item.gains > 0)
      .sort((a, b) => b.gains - a.gains)
      .slice(0, 5);

    return { topExpenses, topGains };
  }, [chartTransactions, categoryNameById]);

  const pieChartData = useMemo(() => {
    const amountByCategory = new Map<string, { categoryName: string; amount: number }>();

    for (const transaction of chartTransactions) {
      const categoryId = transaction.categoryId ?? 'cat-outros';
      const categoryName = categoryNameById.get(categoryId) ?? 'Outros';
      const current = amountByCategory.get(categoryId) ?? {
        categoryName,
        amount: 0,
      };

      current.amount += transaction.amount;
      amountByCategory.set(categoryId, current);
    }

    let rows = Array.from(amountByCategory.values())
      .filter(item => item.amount > 0)
      .sort((a, b) => b.amount - a.amount);

    const total = rows.reduce((acc, item) => acc + item.amount, 0);
    
    // Group small slices (< 5%) into "Outros"
    const threshold = 0.05;
    const large: typeof rows = [];
    let smallTotal = 0;

    for (const item of rows) {
      const percentage = total ? item.amount / total : 0;
      if (percentage >= threshold) {
        large.push(item);
      } else {
        smallTotal += item.amount;
      }
    }

    if (smallTotal > 0) {
      large.push({ categoryName: 'Outros', amount: smallTotal });
    }

    rows = large;

    const radius = 68;
    const circumference = 2 * Math.PI * radius;

    let offset = 0;

    const segments = rows.map((item, index) => {
      const percentage = total ? item.amount / total : 0;
      const segmentLength = percentage * circumference;
      const segment = {
        ...item,
        color: PIE_COLORS[index % PIE_COLORS.length],
        percentage,
        segmentLength,
        offset,
      };

      offset += segmentLength;
      return segment;
    });

    return {
      total,
      radius,
      circumference,
      segments,
    };
  }, [chartTransactions, categoryNameById]);

  const categoryStats = useMemo(() => {
    return categories.map(category => {
      const linked = transactions.filter(t => t.categoryId === category.id);
      const total = linked.reduce((acc, t) => acc + t.amount, 0);

      return {
        ...category,
        linkedCount: linked.length,
        total,
      };
    });
  }, [categories, transactions]);

  function renderBars(
    items: Array<{ categoryName: string; gains: number; expenses: number }>,
    typeToRender: 'gains' | 'expenses',
    color: string,
  ) {
    const maxValue = Math.max(...items.map(item => item[typeToRender]), 1);

    return items.map(item => {
      const value = item[typeToRender];
      const widthPercent = (value / maxValue) * 100;

      return (
        <View key={`${typeToRender}-${item.categoryName}`} style={styles.barRow}>
          <View style={styles.barRowLabel}>
            <Text style={styles.barCategoryName}>{item.categoryName}</Text>
            <Text style={styles.barValue}>{formatCurrency(value)}</Text>
          </View>
          <View style={styles.barTrack}>
            <View style={[styles.barFill, { width: `${widthPercent}%`, backgroundColor: color }]} />
          </View>
        </View>
      );
    });
  }

  function renderTransactionsTab() {
    return (
      <>
        <View style={styles.summaryContainer}>
          <View style={[styles.card, styles.gainCard]}>
            <TrendingUp size={24} color="#059669" />
            <Text style={styles.cardLabel}>Ganhos</Text>
            <Text style={styles.cardValue}>{formatCurrency(totals.gains)}</Text>
          </View>

          <View style={[styles.card, styles.expenseCard]}>
            <TrendingDown size={24} color="#dc2626" />
            <Text style={styles.cardLabel}>Despesas</Text>
            <Text style={styles.cardValue}>{formatCurrency(totals.expenses)}</Text>
          </View>
        </View>

        <View style={[styles.card, styles.balanceCard]}>
          <Text style={[styles.cardLabel, { color: '#94a3b8' }]}>Saldo Total</Text>
          <Text style={[styles.cardValue, { fontSize: 24, color: '#fff' }]}>
            {formatCurrency(totals.balance)}
          </Text>
        </View>

        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Transacoes</Text>
        </View>

        <FlatList
          data={transactions}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.transactionItem}>
              <View>
                <Text style={styles.transactionDescription}>{item.description}</Text>
                <Text style={styles.transactionMeta}>
                  {categoryNameById.get(item.categoryId) ?? 'Outros'} - {formatDate(item.date)}
                </Text>
              </View>
              <View style={styles.transactionRight}>
                <TouchableOpacity onPress={() => openEditTransactionModal(item)}>
                  <Pencil size={18} color="#64748b" />
                </TouchableOpacity>
                <Text
                  style={[
                    styles.transactionAmount,
                    { color: item.type === 'gain' ? '#059669' : '#dc2626' },
                  ]}
                >
                  {item.type === 'gain' ? '+' : '-'} {formatCurrency(item.amount)}
                </Text>
                <TouchableOpacity onPress={() => handleDelete(item.id)}>
                  <Trash2 size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 160 }}
          ListEmptyComponent={() => (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>Nenhuma transacao registrada.</Text>
            </View>
          )}
        />

        <TouchableOpacity style={styles.fab} onPress={openNewTransactionModal}>
          <Plus size={32} color="#fff" />
        </TouchableOpacity>
      </>
    );
  }

  function renderCategoriesTab() {
    return (
      <View style={styles.sectionContainer}>
        <View style={styles.createCategoryCard}>
          <Text style={styles.sectionTitle}>Criar categoria</Text>
          <TextInput
            style={styles.input}
            placeholder="Ex: Investimentos"
            value={newCategoryName}
            onChangeText={setNewCategoryName}
          />
          <TouchableOpacity style={styles.primaryButton} onPress={handleCreateCategory}>
            <Text style={styles.primaryButtonText}>Salvar categoria</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>Categorias cadastradas</Text>

        <FlatList
          data={categoryStats}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <View style={styles.categoryItem}>
              <View>
                <Text style={styles.categoryName}>{item.name}</Text>
                <Text style={styles.categoryMeta}>
                  {item.linkedCount} transacoes • {formatCurrency(item.total)}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleDeleteCategory(item)}>
                <Trash2 size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          )}
          contentContainerStyle={{ paddingBottom: 160 }}
        />
      </View>
    );
  }

  function renderChartsTab() {
    return (
      <View style={styles.sectionContainer}>
        <Text style={styles.sectionTitle}>Filtros</Text>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              chartTypeFilter === 'all' && styles.filterPillActive,
            ]}
            onPress={() => setChartTypeFilter('all')}
          >
            <Text
              style={[
                styles.filterPillText,
                chartTypeFilter === 'all' && styles.filterPillTextActive,
              ]}
            >
              Todos
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              chartTypeFilter === 'expense' && styles.filterPillActive,
            ]}
            onPress={() => setChartTypeFilter('expense')}
          >
            <Text
              style={[
                styles.filterPillText,
                chartTypeFilter === 'expense' && styles.filterPillTextActive,
              ]}
            >
              Despesas
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              chartTypeFilter === 'gain' && styles.filterPillActive,
            ]}
            onPress={() => setChartTypeFilter('gain')}
          >
            <Text
              style={[
                styles.filterPillText,
                chartTypeFilter === 'gain' && styles.filterPillTextActive,
              ]}
            >
              Ganhos
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.filterRow}>
          <TouchableOpacity
            style={[
              styles.filterPill,
              chartPeriodFilter === 'all' && styles.filterPillActive,
            ]}
            onPress={() => setChartPeriodFilter('all')}
          >
            <Text
              style={[
                styles.filterPillText,
                chartPeriodFilter === 'all' && styles.filterPillTextActive,
              ]}
            >
              Todo periodo
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.filterPill,
              chartPeriodFilter === 'month' && styles.filterPillActive,
            ]}
            onPress={() => setChartPeriodFilter('month')}
          >
            <Text
              style={[
                styles.filterPillText,
                chartPeriodFilter === 'month' && styles.filterPillTextActive,
              ]}
            >
              Mes atual
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Distribuicao por categoria</Text>

          {pieChartData.segments.length ? (
            <>
              <View style={styles.pieWrapper}>
                <Svg width={180} height={180}>
                  <Circle
                    cx={90}
                    cy={90}
                    r={pieChartData.radius}
                    stroke="#e2e8f0"
                    strokeWidth={34}
                    fill="none"
                  />

                  {pieChartData.segments.map(segment => (
                    <Circle
                      key={`pie-${segment.categoryName}`}
                      cx={90}
                      cy={90}
                      r={pieChartData.radius}
                      stroke={segment.color}
                      strokeWidth={34}
                      fill="none"
                      strokeLinecap="butt"
                      strokeDasharray={`${segment.segmentLength} ${pieChartData.circumference}`}
                      strokeDashoffset={-segment.offset}
                      transform="rotate(-90 90 90)"
                    />
                  ))}
                </Svg>

                <View style={styles.pieCenter}>
                  <Text style={styles.pieCenterLabel}>Total</Text>
                  <Text style={styles.pieCenterValue}>{formatCurrency(pieChartData.total)}</Text>
                </View>
              </View>

              <View style={styles.legendContainer}>
                {pieChartData.segments.map(segment => (
                  <View key={`legend-${segment.categoryName}`} style={styles.legendRow}>
                    <View style={[styles.legendDot, { backgroundColor: segment.color }]} />
                    <Text style={styles.legendText}>
                      {segment.categoryName} ({(segment.percentage * 100).toFixed(1)}%)
                    </Text>
                    <Text style={styles.legendValue}>{formatCurrency(segment.amount)}</Text>
                  </View>
                ))}
              </View>
            </>
          ) : (
            <Text style={styles.emptyText}>Sem dados para este filtro.</Text>
          )}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Categorias com mais gastos</Text>
          {chartData.topExpenses.length ? (
            renderBars(chartData.topExpenses, 'expenses', '#dc2626')
          ) : (
            <Text style={styles.emptyText}>Sem dados para este filtro.</Text>
          )}
        </View>

        <View style={styles.chartCard}>
          <Text style={styles.chartTitle}>Categorias com mais entradas</Text>
          {chartData.topGains.length ? (
            renderBars(chartData.topGains, 'gains', '#059669')
          ) : (
            <Text style={styles.emptyText}>Sem dados para este filtro.</Text>
          )}
        </View>
      </View>
    );
  }

  function renderTabContent() {
    if (activeTab === 'categories') {
      return renderCategoriesTab();
    }

    if (activeTab === 'charts') {
      return renderChartsTab();
    }

    return renderTransactionsTab();
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      <View style={styles.header}>
        <Text style={styles.title}>Minhas Finanças</Text>
      </View>

      {renderTabContent()}

      <View style={styles.bottomTabs}>
        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('transactions')}
        >
          <List
            size={20}
            color={activeTab === 'transactions' ? '#2563eb' : '#94a3b8'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'transactions' && styles.tabLabelActive,
            ]}
          >
            Transacoes
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.tabButton}
          onPress={() => setActiveTab('categories')}
        >
          <Tags size={20} color={activeTab === 'categories' ? '#2563eb' : '#94a3b8'} />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'categories' && styles.tabLabelActive,
            ]}
          >
            Categorias
          </Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.tabButton} onPress={() => setActiveTab('charts')}>
          <BarChart3
            size={20}
            color={activeTab === 'charts' ? '#2563eb' : '#94a3b8'}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === 'charts' && styles.tabLabelActive,
            ]}
          >
            Graficos
          </Text>
        </TouchableOpacity>
      </View>

      <Modal visible={isModalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingTransactionId ? 'Editar Transacao' : 'Nova Transacao'}
            </Text>
            
            <TextInput
              style={styles.input}
              placeholder="Descrição (ex: Salário, Aluguel)"
              value={description}
              onChangeText={setDescription}
            />

            <TextInput
              style={styles.input}
              placeholder="Valor (ex: 150.00)"
              keyboardType="numeric"
              value={amount}
              onChangeText={setAmount}
            />

            <TextInput
              style={styles.input}
              placeholder="Data (DD/MM/AAAA)"
              value={transactionDateInput}
              onChangeText={setTransactionDateInput}
            />

            <Text style={styles.selectLabel}>Categoria</Text>
            <View style={styles.categorySelector}>
              {categories.map(category => (
                <TouchableOpacity
                  key={category.id}
                  style={[
                    styles.categoryChip,
                    selectedCategoryId === category.id && styles.categoryChipActive,
                  ]}
                  onPress={() => setSelectedCategoryId(category.id)}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      selectedCategoryId === category.id && styles.categoryChipTextActive,
                    ]}
                  >
                    {category.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.typeSelector}>
              <TouchableOpacity
                style={[styles.typeButton, type === 'gain' && styles.typeButtonActive]}
                onPress={() => setType('gain')}
              >
                <Text style={[styles.typeButtonText, type === 'gain' && styles.typeButtonTextActive]}>
                  Ganho
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.typeButton, type === 'expense' && styles.typeButtonActiveExpense]}
                onPress={() => setType('expense')}
              >
                <Text style={[styles.typeButtonText, type === 'expense' && styles.typeButtonTextActive]}>
                  Despesa
                </Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.button, styles.buttonCancel]}
                onPress={resetTransactionForm}
              >
                <Text style={[styles.buttonText, { color: '#64748b' }]}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.button, styles.buttonSave]}
                onPress={handleSaveTransaction}
              >
                <Text style={[styles.buttonText, { color: '#fff' }]}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  header: {
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1e293b',
  },
  summaryContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 15,
  },
  card: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  gainCard: {
    flex: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#059669',
  },
  expenseCard: {
    flex: 1,
    borderLeftWidth: 4,
    borderLeftColor: '#dc2626',
  },
  balanceCard: {
    marginHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
    backgroundColor: '#1e293b',
  },
  cardLabel: {
    fontSize: 14,
    color: '#64748b',
    marginTop: 5,
  },
  cardValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1e293b',
    marginTop: 5,
  },
  listHeader: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionContainer: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 12,
  },
  createCategoryCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
  },
  primaryButton: {
    backgroundColor: '#2563eb',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
  },
  primaryButtonText: {
    color: '#fff',
    fontWeight: '700',
  },
  categoryItem: {
    backgroundColor: '#fff',
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryName: {
    color: '#1e293b',
    fontSize: 16,
    fontWeight: '600',
  },
  categoryMeta: {
    color: '#64748b',
    marginTop: 3,
  },
  chartCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 12,
  },
  pieWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
  },
  pieCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pieCenterLabel: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  pieCenterValue: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  legendContainer: {
    marginTop: 8,
    gap: 8,
  },
  legendRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  legendText: {
    flex: 1,
    color: '#334155',
    fontSize: 13,
  },
  legendValue: {
    color: '#334155',
    fontWeight: '700',
    fontSize: 13,
  },
  chartTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  barRow: {
    marginBottom: 10,
  },
  barRowLabel: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  barCategoryName: {
    color: '#334155',
    fontWeight: '500',
  },
  barValue: {
    color: '#64748b',
    fontWeight: '600',
  },
  barTrack: {
    height: 8,
    borderRadius: 6,
    backgroundColor: '#e2e8f0',
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: 6,
  },
  filterRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  filterPill: {
    backgroundColor: '#e2e8f0',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  filterPillActive: {
    backgroundColor: '#2563eb',
  },
  filterPillText: {
    color: '#475569',
    fontWeight: '600',
  },
  filterPillTextActive: {
    color: '#fff',
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#475569',
  },
  transactionItem: {
    backgroundColor: '#fff',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  transactionDescription: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1e293b',
  },
  transactionMeta: {
    fontSize: 12,
    color: '#94a3b8',
    marginTop: 2,
  },
  transactionRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  fab: {
    position: 'absolute',
    bottom: 88,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: 40,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1e293b',
  },
  input: {
    backgroundColor: '#f1f5f9',
    padding: 15,
    borderRadius: 12,
    marginBottom: 15,
    fontSize: 16,
  },
  selectLabel: {
    fontWeight: '700',
    color: '#334155',
    marginBottom: 8,
  },
  categorySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 15,
  },
  categoryChip: {
    backgroundColor: '#e2e8f0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  categoryChipActive: {
    backgroundColor: '#2563eb',
  },
  categoryChipText: {
    color: '#475569',
    fontWeight: '600',
  },
  categoryChipTextActive: {
    color: '#fff',
  },
  typeSelector: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 25,
  },
  typeButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  typeButtonActive: {
    backgroundColor: '#059669',
    borderColor: '#059669',
  },
  typeButtonActiveExpense: {
    backgroundColor: '#dc2626',
    borderColor: '#dc2626',
  },
  typeButtonText: {
    fontWeight: 'bold',
    color: '#64748b',
  },
  typeButtonTextActive: {
    color: '#fff',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  button: {
    flex: 1,
    padding: 15,
    borderRadius: 12,
    alignItems: 'center',
  },
  buttonCancel: {
    backgroundColor: '#f1f5f9',
  },
  buttonSave: {
    backgroundColor: '#2563eb',
  },
  buttonText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  bottomTabs: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 10,
  },
  tabButton: {
    alignItems: 'center',
    gap: 4,
  },
  tabLabel: {
    color: '#94a3b8',
    fontSize: 12,
    fontWeight: '600',
  },
  tabLabelActive: {
    color: '#2563eb',
  },
  emptyState: {
    alignItems: 'center',
    marginTop: 50,
  },
  emptyText: {
    color: '#94a3b8',
  },
});
