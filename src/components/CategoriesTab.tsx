import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import { Category } from '../types/category';
import { CategoryRule } from '../storage/categoryRulesStorage';
import { Transaction } from '../types/transaction';
import { formatCurrency } from '../utils/format';

interface CategoryStat extends Category {
  linkedCount: number;
  total: number;
}

interface Props {
  categories: Category[];
  categoryStats: CategoryStat[];
  rules: CategoryRule[];
  categoryNameById: Map<string, string>;
  onCreateCategory: (name: string) => void;
  onDeleteCategory: (category: Category) => void;
  onSaveRule: (keyword: string, categoryId: string) => void;
  onDeleteRule: (id: string) => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onImportCsv: () => void;
}

export function CategoriesTab({
  categories,
  categoryStats,
  rules,
  categoryNameById,
  onCreateCategory,
  onDeleteCategory,
  onSaveRule,
  onDeleteRule,
  onExportJson,
  onImportJson,
  onImportCsv,
}: Props) {
  const [newCategoryName, setNewCategoryName] = useState('');
  const [ruleKeyword, setRuleKeyword] = useState('');
  const [ruleCategoryId, setRuleCategoryId] = useState(categories[0]?.id ?? '');

  function handleCreate() {
    onCreateCategory(newCategoryName);
    setNewCategoryName('');
  }

  function handleSaveRule() {
    onSaveRule(ruleKeyword, ruleCategoryId);
    setRuleKeyword('');
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 160 }} keyboardShouldPersistTaps="handled">

      {/* Criar categoria */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Criar categoria</Text>
        <TextInput style={styles.input} placeholder="Ex: Investimentos" value={newCategoryName} onChangeText={setNewCategoryName} />
        <TouchableOpacity style={styles.btnPrimary} onPress={handleCreate}>
          <Text style={styles.btnPrimaryText}>Salvar categoria</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.btnGreen} onPress={onExportJson}>
          <Text style={styles.btnText}>Exportar dados em JSON</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnOrange} onPress={onImportJson}>
          <Text style={styles.btnText}>Importar backup JSON</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.btnPurple} onPress={onImportCsv}>
          <Text style={styles.btnText}>Importar extrato CSV</Text>
        </TouchableOpacity>
      </View>

      {/* Regras de categorização */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Regras de categorizacao</Text>
        <Text style={styles.hint}>Palavra-chave na descricao → categoria automatica na importacao</Text>
        <TextInput
          style={styles.input}
          placeholder="Palavra-chave (ex: SUPERMERCADO)"
          value={ruleKeyword}
          onChangeText={setRuleKeyword}
          autoCapitalize="characters"
        />
        <Text style={styles.label}>Categoria</Text>
        <View style={styles.chips}>
          {categories.map(cat => (
            <TouchableOpacity
              key={cat.id}
              style={[styles.chip, ruleCategoryId === cat.id && styles.chipActive]}
              onPress={() => setRuleCategoryId(cat.id)}
            >
              <Text style={[styles.chipText, ruleCategoryId === cat.id && styles.chipTextActive]}>{cat.name}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <TouchableOpacity style={styles.btnPrimary} onPress={handleSaveRule}>
          <Text style={styles.btnPrimaryText}>Salvar regra</Text>
        </TouchableOpacity>
      </View>

      {/* Lista de regras */}
      <Text style={styles.sectionTitle}>Regras cadastradas</Text>
      {rules.length === 0 ? (
        <Text style={styles.empty}>Nenhuma regra cadastrada.</Text>
      ) : (
        rules.map(rule => (
          <View key={rule.id} style={styles.listItem}>
            <View>
              <Text style={styles.itemName}>{rule.keyword}</Text>
              <Text style={styles.itemMeta}>→ {categoryNameById.get(rule.categoryId) ?? 'Outros'}</Text>
            </View>
            <TouchableOpacity onPress={() => onDeleteRule(rule.id)}>
              <Trash2 size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>
        ))
      )}

      {/* Lista de categorias */}
      <Text style={[styles.sectionTitle, { marginTop: 16 }]}>Categorias cadastradas</Text>
      {categoryStats.map(item => (
        <View key={item.id} style={styles.listItem}>
          <View>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemMeta}>{item.linkedCount} transacoes • {formatCurrency(item.total)}</Text>
          </View>
          <TouchableOpacity onPress={() => onDeleteCategory(item)}>
            <Trash2 size={18} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 16, paddingTop: 10 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 16 },
  sectionTitle: { fontSize: 17, fontWeight: '700', color: '#334155', marginBottom: 12 },
  hint: { color: '#64748b', fontSize: 12, marginBottom: 10 },
  input: { backgroundColor: '#f1f5f9', padding: 14, borderRadius: 12, marginBottom: 12, fontSize: 15 },
  label: { fontWeight: '700', color: '#334155', marginBottom: 8 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  chip: { backgroundColor: '#e2e8f0', paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999 },
  chipActive: { backgroundColor: '#2563eb' },
  chipText: { color: '#475569', fontWeight: '600' },
  chipTextActive: { color: '#fff' },
  btnPrimary: { backgroundColor: '#2563eb', alignItems: 'center', padding: 12, borderRadius: 10 },
  btnPrimaryText: { color: '#fff', fontWeight: '700' },
  btnGreen: { backgroundColor: '#0f766e', alignItems: 'center', padding: 12, borderRadius: 10, marginTop: 10 },
  btnOrange: { backgroundColor: '#b45309', alignItems: 'center', padding: 12, borderRadius: 10, marginTop: 10 },
  btnPurple: { backgroundColor: '#7c3aed', alignItems: 'center', padding: 12, borderRadius: 10, marginTop: 10 },
  btnText: { color: '#fff', fontWeight: '700' },
  listItem: { backgroundColor: '#fff', padding: 14, borderRadius: 12, marginBottom: 8, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemName: { color: '#1e293b', fontSize: 15, fontWeight: '600' },
  itemMeta: { color: '#64748b', marginTop: 2, fontSize: 13 },
  empty: { color: '#94a3b8', textAlign: 'center', marginVertical: 16 },
});
