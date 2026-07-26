"use client";

import { useEffect, useState } from "react";
import {
  getAllCategoriesAdminAction,
  createCategoryAction,
  updateCategoryAction,
  deleteCategoryAction,
  CategoryWithStats
} from "@/app/actions/category-actions";
import {
  FolderPlus, Plus, Trash2, Edit3, Check, X, Eye, EyeOff, Loader2, Sparkles, Image as ImageIcon
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<CategoryWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryWithStats | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    slug: "",
    thumbnail_url: "",
    sort_order: 0,
    is_active: true
  });

  const loadCategories = async () => {
    setLoading(true);
    const res = await getAllCategoriesAdminAction();
    if (res.success && res.data) {
      setCategories(res.data);
    } else {
      setError(res.error || "Категори татахад алдаа гарлаа");
    }
    setLoading(false);
  };

  useEffect(() => {
    loadCategories();
  }, []);

  const handleOpenAddModal = () => {
    setEditingCategory(null);
    setFormData({
      name: "",
      slug: "",
      thumbnail_url: "",
      sort_order: categories.length + 1,
      is_active: true
    });
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (cat: CategoryWithStats) => {
    setEditingCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      thumbnail_url: cat.thumbnail_url || "",
      sort_order: cat.sort_order || 0,
      is_active: cat.is_active ?? true
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    setError(null);

    let res;
    if (editingCategory) {
      res = await updateCategoryAction(editingCategory.id, formData);
    } else {
      res = await createCategoryAction(formData);
    }

    if (res.success) {
      setIsModalOpen(false);
      await loadCategories();
    } else {
      setError(res.error || "Хадгалахад алдаа гарлаа");
    }
    setSaving(false);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`"${name}" категорийг устгахдаа итгэлтэй байна уу?`)) return;
    setSaving(true);
    const res = await deleteCategoryAction(id);
    if (res.success) {
      await loadCategories();
    } else {
      alert("Устгахад алдаа гарлаа: " + res.error);
    }
    setSaving(false);
  };

  const handleToggleActive = async (cat: CategoryWithStats) => {
    const updatedStatus = !cat.is_active;
    const res = await updateCategoryAction(cat.id, { is_active: updatedStatus });
    if (res.success) {
      setCategories(prev => prev.map(c => c.id === cat.id ? { ...c, is_active: updatedStatus } : c));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase text-white tracking-tight flex items-center gap-2">
            <FolderPlus className="w-6 h-6 text-primary" />
            Категори удирдлага
          </h1>
          <p className="text-xs font-bold text-zinc-400 mt-1 uppercase tracking-wider">
            Нүүр болон видео хэсэгт харагдах категориудыг тохируулах
          </p>
        </div>
        <button
          onClick={handleOpenAddModal}
          className="px-5 py-2.5 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center gap-2 shadow-lg shadow-primary/20"
        >
          <Plus className="w-4 h-4" />
          Шинэ категори нэмэх
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-bold uppercase">
          {error}
        </div>
      )}

      {/* Category List Grid */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-primary animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.map((cat) => {
            const displayImg = cat.thumbnail_url || cat.first_video_thumbnail || '/logo.png';

            return (
              <div
                key={cat.id || cat.slug}
                className={cn(
                  "p-4 rounded-2xl bg-zinc-900/80 border border-white/5 space-y-3 relative group transition-all",
                  !cat.is_active && "opacity-50"
                )}
              >
                {/* Image Preview */}
                <div className="relative aspect-[16/10] w-full rounded-xl overflow-hidden bg-black/50 border border-white/10">
                  <Image
                    src={displayImg}
                    alt={cat.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-10">
                    <button
                      onClick={() => handleToggleActive(cat)}
                      className={cn(
                        "p-1.5 rounded-lg text-white backdrop-blur-md border border-white/10 transition-colors",
                        cat.is_active ? "bg-emerald-500/80 hover:bg-emerald-600" : "bg-zinc-700/80 hover:bg-zinc-600"
                      )}
                      title={cat.is_active ? "Идэвхтэй" : "Идэвхгүй"}
                    >
                      {cat.is_active ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/80 text-[10px] font-black text-white border border-white/10">
                    Эрэмбэ: {cat.sort_order}
                  </div>
                </div>

                {/* Details */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-black text-sm text-white">{cat.name}</h3>
                    <p className="text-[10px] text-zinc-500 font-bold uppercase">slug: {cat.slug}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handleOpenEditModal(cat)}
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-zinc-300 hover:text-white transition-colors"
                      title="Засах"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id, cat.name)}
                      className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 transition-colors"
                      title="Устгах"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal for Add / Edit Category */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="w-full max-w-lg bg-zinc-900 border border-white/10 rounded-3xl p-6 space-y-6 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className="text-lg font-black uppercase text-white">
                {editingCategory ? "Категори засах" : "Шинэ категори нэмэх"}
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-lg bg-white/5"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">
                  Категорийн нэр *
                </label>
                <input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="d.g. Anime, Japanese, Hot Mom..."
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">
                  Slug (Код)
                </label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="автоматаар нэрнээс үүснэ (жишээ: hot-mom)"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">
                  Зургийн URL (Сонголттой - хоосон байвал бичлэгийн зураг харагдана)
                </label>
                <input
                  type="url"
                  value={formData.thumbnail_url}
                  onChange={(e) => setFormData({ ...formData, thumbnail_url: e.target.value })}
                  placeholder="https://example.com/image.jpg"
                  className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase text-zinc-400 mb-1.5">
                    Эрэмбэ (Sort order)
                  </label>
                  <input
                    type="number"
                    value={formData.sort_order}
                    onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white font-bold text-sm focus:outline-none focus:border-primary"
                  />
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="w-5 h-5 accent-primary rounded cursor-pointer"
                  />
                  <label htmlFor="is_active" className="text-xs font-bold uppercase text-white cursor-pointer select-none">
                    Идэвхтэй харуулах
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-zinc-300 font-bold text-xs uppercase"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-6 py-2.5 rounded-xl bg-primary text-white font-bold text-xs uppercase tracking-wider hover:bg-primary/90 transition-all flex items-center gap-2"
                >
                  {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
                  Хадгалах
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
