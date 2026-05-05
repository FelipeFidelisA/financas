import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { BarChart3, List, Moon, RefreshCw, Sun, Tags, Target } from 'lucide-react-native';

import { useTransactions } from './src/hooks/useTransactions';
import { useCategories } from './src/hooks/useCategories';
import { TransactionsTab } from './src/components/TransactionsTab';
import { CategoriesTab } from './src/components/CategoriesTab';
import { ChartsTab } from './src/components/ChartsTab';
import { GoalsTab } from './src/components/GoalsTab';
import { RecurringTab } from './src/components/RecurringTab';
import { TransactionModal } from './src/components/TransactionModal';

import { Transaction } from './src/types/transaction';
import { getAllTransactions, saveTransaction } from './src/storage/transactionStorage';
import { getAllRules } from './src/storage/categoryRulesStorage';
import { getAllCategories } from './src/storage/categoryStorage';
import { CategoryGoal, deleteGoal, getAllGoals, saveGoal } from './src/storage/goalStorage';
import {
  RecurringTransaction,
  deleteRecurring,
  getAllRecurring,
  saveRecurring,
} from './src/storage/recurringStorage';
import { saveImportRecord } from './src/storage/importHistoryStorage';
import { getTheme, saveTheme } from './src/storage/themeStorage';
import { parseCsvTransactions } from './src/utils/csvImport';
import { applyRules } from './src/utils/categorize';
import { lightTheme, darkTheme } from './src/utils/theme';

type Tab = 'transactions' | 'categories' | 'charts' | 'goals' | 'recurring';

export default function App() {
  const { transactions, loadTransactions, handleSaveTransaction, handleDeleteTransaction, handleBulkUpdateCategory } = useTransactions();
  const { categories, rules, loadCategories, loadRules, handleCreateCategory, handleDeleteCategory, handleSaveRule, handleDeleteRule } = useCategories();

  const [activeTab, setActiveTab] = useState<Tab>('transactions');
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [goals, setGoals] = useState<CategoryGoal[]>([]);
  const [recurring, setRecurring] = useState<RecurringTransaction[]>([]);
  const [isDark, setIsDark] = useState(false);

  const theme = isDark ? darkTheme : lightTheme;

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    await Promise.all([loadTransactions(), loadCategories(), loadRules()]);
    setGoals(await getAllGoals());
    setRecurring(await getAllRecurring());
    const savedTheme = await getTheme();
    setIsDark(savedTheme === 'dark');
  }

  async function toggleTheme() {
    const next = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    await saveTheme(next);
  }

  const categoryNameById = useMemo(
    () => new Map(categories.map(c => [c.id, c.name])),
    [categories],
  );

  const categoryStats = useMemo(() => {
    return categories.map(cat => {
      const linked = transactions.filter(t => t.categoryId === cat.id);
      return {
        ...cat,
        linkedCount: linked.length,
        total: linked.reduce((s, t) => s + t.amount, 0),
      };
    });
  }, [categories, transactions]);

  function openNewTransaction() {
    setEditingTransaction(null);
    setIsModalVisible(true);
  }

  function openEditTransaction(t: Transaction) {
    setEditingTransaction(t);
    setIsModalVisible(true);
  }

  async function onSaveTransaction(transaction: Transaction, isEditing: boolean) {
    await handleSaveTransaction(transaction, isEditing);
    setIsModalVisible(false);
  }

  async function handleSaveGoal(categoryId: string, limit: number) {
    const goal: CategoryGoal = { id: `goal-${Date.now()}`, categoryId, limitAmount: limit, period: 'month' };
    await saveGoal(goal);
    setGoals(await getAllGoals());
  }

  async function handleDeleteGoal(id: string) {
    await deleteGoal(id);
    setGoals(await getAllGoals());
  }

  async function handleSaveRecurring(r: RecurringTransaction) {
    await saveRecurring(r);
    setRecurring(await getAllRecurring());
  }

  async function handleDeleteRecurring(id: string) {
    await deleteRecurring(id);
    setRecurring(await getAllRecurring());
  }

  // --- Import/Export ---

  async function processImportedCsv(content: string, fileName: string) {
    const defaultCategoryId = categories[0]?.id ?? 'cat-outros';
    const currentRules = await getAllRules();
    const parsed = parseCsvTransactions(content, defaultCategoryId);

    if (!parsed || parsed.transactions.length === 0) {
      Alert.alert('Erro', 'Nenhuma transacao encontrada ou formato nao reconhecido.\n\nFormatos suportados: PicPay, Banco do Brasil, Nubank, Inter, C6, Bradesco');
      return;
    }

    const categorized = parsed.transactions.map(t => ({
      ...t,
      categoryId: applyRules(t.description, currentRules, defaultCategoryId),
    }));

    const ruleCounts = new Map<string, number>();
    for (const t of categorized) {
      const rule = currentRules.find(r => t.description.toLowerCase().includes(r.keyword.toLowerCase()));
      if (rule) ruleCounts.set(rule.keyword, (ruleCounts.get(rule.keyword) ?? 0) + 1);
    }

    const existing = await getAllTransactions();
    const existingIds = new Set(existing.map(t => `${t.date}${t.amount}${t.description}`));
    const newTransactions = categorized.filter(t => !existingIds.has(`${t.date}${t.amount}${t.description}`));

    for (const t of newTransactions) await saveTransaction(t);
    await loadTransactions();

    await saveImportRecord({
      id: `imp-${Date.now()}`,
      importedAt: Date.now(),
      fileName,
      format: parsed.format,
      total: parsed.transactions.length,
      imported: newTransactions.length,
      duplicates: parsed.transactions.length - newTransactions.length,
    });

    const formatLabels: Record<string, string> = {
      picpay: 'PicPay', bb: 'Banco do Brasil', nubank: 'Nubank',
      inter: 'Inter', c6: 'C6', bradesco: 'Bradesco',
    };
    const rulesSummary = ruleCounts.size > 0
      ? '\n\nRegras aplicadas:\n' + Array.from(ruleCounts.entries()).map(([k, v]) => `• ${k}: ${v}x`).join('\n')
      : '';

    Alert.alert(
      'Importacao concluida',
      `${newTransactions.length} importadas (${formatLabels[parsed.format] ?? parsed.format})\n${parsed.transactions.length - newTransactions.length} duplicatas ignoradas${rulesSummary}`,
    );
  }

  async function handleImportCsv() {
    try {
      if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.csv,text/csv,text/plain';
        input.onchange = async (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          await processImportedCsv(await file.text(), file.name);
        };
        input.click();
        return;
      }
      const result = await DocumentPicker.getDocumentAsync({
        type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      const content = await FileSystem.readAsStringAsync(asset.uri, { encoding: 'utf8' });
      await processImportedCsv(content, asset.name ?? 'extrato.csv');
    } catch (error) {
      Alert.alert('Erro', 'Nao foi possivel importar o CSV.');
      console.error(error);
    }
  }

  async function handleImportJson() {
    try {
      const readJson = async (content: string) => {
        const payload = JSON.parse(content);
        if (!payload.transactions || !payload.categories) {
          Alert.alert('Erro', 'Arquivo JSON invalido.');
          return;
        }
        const existing = await getAllTransactions();
        const existingIds = new Set(existing.map((t: Transaction) => t.id));
        const newT = (payload.transactions as Transaction[]).filter(t => !existingIds.has(t.id));
        for (const t of newT) await saveTransaction(t);
        await loadTransactions();
        Alert.alert('Importacao concluida', `${newT.length} transacoes importadas do backup.`);
      };

      if (typeof document !== 'undefined') {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.onchange = async (e: Event) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;
          await readJson(await file.text());
        };
        input.click();
        return;
      }
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/plain', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const content = await FileSystem.readAsStringAsync(result.assets[0].uri, { encoding: 'utf8' });
      await readJson(content);
    } catch (error) {
      Alert.alert('Erro', 'Nao foi possivel importar o JSON.');
      console.error(error);
    }
  }

  async function handleExportJson() {
    try {
      const allCategories = await getAllCategories();
      const payload = {
        exportedAt: new Date().toISOString(),
        app: 'Minhas Financas',
        version: '1.0.0',
        transactions,
        categories: allCategories,
      };
      const d = new Date();
      const stamp = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}`;
      const fileName = `financas-export-${stamp}.json`;
      const jsonStr = JSON.stringify(payload, null, 2);

      if (typeof document !== 'undefined') {
        const blob = new Blob([jsonStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = fileName; a.click();
        URL.revokeObjectURL(url);
        return;
      }
      const fileUri = `${FileSystem.cacheDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, jsonStr, { encoding: 'utf8' });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) { Alert.alert('Exportado', `Salvo em: ${fileUri}`); return; }
      await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Exportar JSON', UTI: 'public.json' });
    } catch (error) {
      Alert.alert('Erro', 'Nao foi possivel exportar.');
      console.error(error);
    }
  }

  function renderTab() {
    switch (activeTab) {
      case 'categories':
        return (
          <CategoriesTab
            categories={categories}
            categoryStats={categoryStats}
            rules={rules}
            categoryNameById={categoryNameById}
            onCreateCategory={handleCreateCategory}
            onDeleteCategory={cat => handleDeleteCategory(cat, transactions.some(t => t.categoryId === cat.id))}
            onSaveRule={handleSaveRule}
            onDeleteRule={handleDeleteRule}
            onExportJson={handleExportJson}
            onImportJson={handleImportJson}
            onImportCsv={handleImportCsv}
          />
        );
      case 'charts':
        return <ChartsTab transactions={transactions} categoryNameById={categoryNameById} theme={theme} />;
      case 'goals':
        return (
          <GoalsTab
            categories={categories}
            goals={goals}
            transactions={transactions}
            theme={theme}
            onSaveGoal={handleSaveGoal}
            onDeleteGoal={handleDeleteGoal}
          />
        );
      case 'recurring':
        return (
          <RecurringTab
            categories={categories}
            recurring={recurring}
            transactions={transactions}
            theme={theme}
            onSave={handleSaveRecurring}
            onDelete={handleDeleteRecurring}
          />
        );
      default:
        return (
          <TransactionsTab
            transactions={transactions}
            categories={categories}
            onAdd={openNewTransaction}
            onEdit={openEditTransaction}
            onDelete={handleDeleteTransaction}
            onBulkCategory={handleBulkUpdateCategory}
          />
        );
    }
  }

  const tabs = [
    { key: 'transactions', label: 'Transacoes', Icon: List },
    { key: 'categories', label: 'Categorias', Icon: Tags },
    { key: 'charts', label: 'Graficos', Icon: BarChart3 },
    { key: 'goals', label: 'Metas', Icon: Target },
    { key: 'recurring', label: 'Fixas', Icon: RefreshCw },
  ] as const;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.bg }]}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} />

      <View style={[styles.header, { backgroundColor: theme.header, borderBottomColor: theme.border }]}>
        <Text style={[styles.title, { color: theme.text }]}>Minhas Finanças</Text>
        <TouchableOpacity onPress={toggleTheme}>
          {isDark
            ? <Sun size={22} color={theme.text} />
            : <Moon size={22} color={theme.text} />
          }
        </TouchableOpacity>
      </View>

      {renderTab()}

      <View style={[styles.bottomTabs, { backgroundColor: theme.tabBar, borderTopColor: theme.border }]}>
        {tabs.map(({ key, label, Icon }) => (
          <TouchableOpacity key={key} style={styles.tabButton} onPress={() => setActiveTab(key)}>
            <Icon size={20} color={activeTab === key ? '#2563eb' : theme.textMuted} />
            <Text style={[styles.tabLabel, { color: activeTab === key ? '#2563eb' : theme.textMuted }]}>{label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TransactionModal
        visible={isModalVisible}
        categories={categories}
        editingTransaction={editingTransaction}
        onSave={onSaveTransaction}
        onClose={() => setIsModalVisible(false)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1 },
  title: { fontSize: 24, fontWeight: 'bold' },
  bottomTabs: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: 1, flexDirection: 'row', justifyContent: 'space-around', paddingVertical: 10 },
  tabButton: { alignItems: 'center', gap: 2 },
  tabLabel: { fontSize: 10, fontWeight: '600' },
});
