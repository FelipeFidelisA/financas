import { useState } from 'react';
import { Alert } from 'react-native';
import { Category } from '../types/category';
import { deleteCategory, getAllCategories, saveCategory } from '../storage/categoryStorage';
import { CategoryRule, deleteRule, getAllRules, saveRule } from '../storage/categoryRulesStorage';

export function useCategories() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [rules, setRules] = useState<CategoryRule[]>([]);

  async function loadCategories() {
    const data = await getAllCategories();
    setCategories(data);
  }

  async function loadRules() {
    const data = await getAllRules();
    setRules(data);
  }

  async function handleCreateCategory(name: string): Promise<boolean> {
    const normalized = name.trim();
    if (!normalized) {
      Alert.alert('Erro', 'Informe um nome para categoria');
      return false;
    }
    try {
      await saveCategory({ id: `cat-${Date.now()}`, name: normalized, createdAt: Date.now() });
      await loadCategories();
      return true;
    } catch {
      Alert.alert('Erro', 'Categoria ja existe');
      return false;
    }
  }

  async function handleDeleteCategory(category: Category, hasLinked: boolean) {
    if (hasLinked) {
      Alert.alert('Categoria em uso', 'Essa categoria possui transacoes vinculadas e nao pode ser removida.');
      return;
    }
    Alert.alert('Excluir categoria', `Deseja excluir "${category.name}"?`, [
      { text: 'Nao', style: 'cancel' },
      {
        text: 'Sim',
        onPress: async () => {
          await deleteCategory(category.id);
          await loadCategories();
        },
      },
    ]);
  }

  async function handleSaveRule(keyword: string, categoryId: string): Promise<boolean> {
    const k = keyword.trim();
    if (!k || !categoryId) {
      Alert.alert('Erro', 'Informe a palavra-chave e a categoria');
      return false;
    }
    try {
      await saveRule({ id: `rule-${Date.now()}`, keyword: k, categoryId });
      await loadRules();
      return true;
    } catch {
      Alert.alert('Erro', 'Ja existe uma regra para essa palavra-chave');
      return false;
    }
  }

  async function handleDeleteRule(id: string) {
    await deleteRule(id);
    await loadRules();
  }

  return {
    categories,
    rules,
    loadCategories,
    loadRules,
    handleCreateCategory,
    handleDeleteCategory,
    handleSaveRule,
    handleDeleteRule,
  };
}
