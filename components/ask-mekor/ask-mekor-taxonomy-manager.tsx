"use client";

import { useState } from "react";

import type { QuestionCategory } from "@/lib/ask-mekor/types";

type TaxonomyManagerProps = {
  categories: QuestionCategory[];
  onRefresh: () => Promise<void>;
};

type EditableItem = {
  label: string;
  slug: string;
  description: string;
  position: number;
};

function toEditableItem(input: {
  label: string;
  slug: string;
  description: string;
  position: number;
}): EditableItem {
  return {
    label: input.label,
    slug: input.slug,
    description: input.description,
    position: input.position,
  };
}

export function AskMekorTaxonomyManager({ categories, onRefresh }: TaxonomyManagerProps) {
  const resetKey = categories
    .map(
      (category) =>
        `${category.id}:${category.slug}:${category.position}:${category.subcategories
          .map((subcategory) => `${subcategory.id}:${subcategory.slug}:${subcategory.position}`)
          .join(",")}`,
    )
    .join("|");

  return <AskMekorTaxonomyManagerInner key={resetKey} categories={categories} onRefresh={onRefresh} />;
}

function AskMekorTaxonomyManagerInner({ categories, onRefresh }: TaxonomyManagerProps) {
  const [categoryDrafts, setCategoryDrafts] = useState<Record<number, EditableItem>>(() =>
    Object.fromEntries(categories.map((category) => [category.id, toEditableItem(category)])),
  );
  const [subcategoryDrafts, setSubcategoryDrafts] = useState<Record<number, EditableItem>>(() =>
    Object.fromEntries(
      categories.flatMap((category) =>
        category.subcategories.map((subcategory) => [subcategory.id, toEditableItem(subcategory)]),
      ),
    ),
  );
  const [newCategory, setNewCategory] = useState<EditableItem>({
    label: "",
    slug: "",
    description: "",
    position: categories.length,
  });
  const [newSubcategories, setNewSubcategories] = useState<Record<number, EditableItem>>(() =>
    Object.fromEntries(
      categories.map((category) => [
        category.id,
        {
          label: "",
          slug: "",
          description: "",
          position: category.subcategories.length,
        },
      ]),
    ),
  );
  const [savingKey, setSavingKey] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function handleRequest(url: string, method: string, body?: Record<string, unknown>) {
    setError("");
    setNotice("");
    const response = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json().catch(() => ({}))) as { error?: string };
    if (!response.ok) {
      throw new Error(payload.error || "Unable to save Ask Mekor taxonomy");
    }
  }

  async function saveCategory(categoryId: number) {
    const draft = categoryDrafts[categoryId];
    if (!draft) return;

    setSavingKey(`category:${categoryId}`);
    try {
      await handleRequest(`/api/admin/ask-mekor/categories/${categoryId}`, "PATCH", draft);
      await onRefresh();
      setNotice("Category updated.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to update category.");
    }
    setSavingKey("");
  }

  async function createCategory() {
    setSavingKey("category:new");
    try {
      await handleRequest("/api/admin/ask-mekor/categories", "POST", newCategory);
      setNewCategory({ label: "", slug: "", description: "", position: categories.length });
      await onRefresh();
      setNotice("Category created.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to create category.");
    }
    setSavingKey("");
  }

  async function deleteCategory(categoryId: number) {
    setSavingKey(`category-delete:${categoryId}`);
    try {
      await handleRequest(`/api/admin/ask-mekor/categories/${categoryId}`, "DELETE");
      await onRefresh();
      setNotice("Category deleted.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to delete category.");
    }
    setSavingKey("");
  }

  async function saveSubcategory(subcategoryId: number) {
    const draft = subcategoryDrafts[subcategoryId];
    const category = categories.find((item) => item.subcategories.some((subcategory) => subcategory.id === subcategoryId));
    if (!draft || !category) return;

    setSavingKey(`subcategory:${subcategoryId}`);
    try {
      await handleRequest(`/api/admin/ask-mekor/subcategories/${subcategoryId}`, "PATCH", {
        ...draft,
        categoryId: category.id,
      });
      await onRefresh();
      setNotice("Subcategory updated.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to update subcategory.");
    }
    setSavingKey("");
  }

  async function createSubcategory(categoryId: number) {
    const draft = newSubcategories[categoryId];
    if (!draft) return;

    setSavingKey(`subcategory:new:${categoryId}`);
    try {
      await handleRequest("/api/admin/ask-mekor/subcategories", "POST", {
        ...draft,
        categoryId,
      });
      setNewSubcategories((current) => ({
        ...current,
        [categoryId]: {
          label: "",
          slug: "",
          description: "",
          position: (categories.find((item) => item.id === categoryId)?.subcategories.length ?? 0) + 1,
        },
      }));
      await onRefresh();
      setNotice("Subcategory created.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to create subcategory.");
    }
    setSavingKey("");
  }

  async function deleteSubcategory(subcategoryId: number) {
    setSavingKey(`subcategory-delete:${subcategoryId}`);
    try {
      await handleRequest(`/api/admin/ask-mekor/subcategories/${subcategoryId}`, "DELETE");
      await onRefresh();
      setNotice("Subcategory deleted.");
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : "Unable to delete subcategory.");
    }
    setSavingKey("");
  }

  return (
    <section className="grid gap-4 rounded-[30px] border border-[var(--color-border)] bg-white/88 p-6 shadow-[0_22px_60px_-42px_rgba(15,23,42,0.28)]">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted)]">Taxonomy</p>
        <h2 className="text-2xl font-semibold text-[var(--color-foreground)]">Categories and subcategories</h2>
        <p className="text-sm leading-7 text-[var(--color-muted)]">
          Update the selectable Ask Mekor categories here. Subcategories are optional on the public form and stay nested under a main category.
        </p>
      </div>

      {error ? <p className="text-sm font-medium text-rose-700">{error}</p> : null}
      {notice ? <p className="text-sm font-medium text-emerald-700">{notice}</p> : null}

      <div className="grid gap-4">
        {categories.map((category) => {
          const categoryDraft = categoryDrafts[category.id] ?? toEditableItem(category);
          const newSubcategory = newSubcategories[category.id] ?? {
            label: "",
            slug: "",
            description: "",
            position: category.subcategories.length,
          };

          return (
            <article key={category.id} className="grid gap-4 rounded-[24px] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
              <div className="grid gap-3 md:grid-cols-[minmax(0,1.1fr)_minmax(0,0.8fr)_120px_auto_auto]">
                <input
                  value={categoryDraft.label}
                  onChange={(event) =>
                    setCategoryDrafts((current) => ({
                      ...current,
                      [category.id]: { ...categoryDraft, label: event.target.value },
                    }))
                  }
                  placeholder="Category label"
                  className="h-11 rounded-[14px] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none"
                />
                <input
                  value={categoryDraft.slug}
                  onChange={(event) =>
                    setCategoryDrafts((current) => ({
                      ...current,
                      [category.id]: { ...categoryDraft, slug: event.target.value },
                    }))
                  }
                  placeholder="Slug"
                  className="h-11 rounded-[14px] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none"
                />
                <input
                  type="number"
                  value={categoryDraft.position}
                  onChange={(event) =>
                    setCategoryDrafts((current) => ({
                      ...current,
                      [category.id]: { ...categoryDraft, position: Number(event.target.value) || 0 },
                    }))
                  }
                  placeholder="Position"
                  className="h-11 rounded-[14px] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none"
                />
                <button
                  type="button"
                  onClick={() => void saveCategory(category.id)}
                  disabled={savingKey === `category:${category.id}`}
                  className="h-11 rounded-[14px] bg-[var(--color-foreground)] px-4 text-sm font-semibold text-white"
                >
                  {savingKey === `category:${category.id}` ? "Saving..." : "Save"}
                </button>
                <button
                  type="button"
                  onClick={() => void deleteCategory(category.id)}
                  disabled={savingKey === `category-delete:${category.id}`}
                  className="h-11 rounded-[14px] border border-rose-200 px-4 text-sm font-semibold text-rose-700"
                >
                  Delete
                </button>
              </div>

              <textarea
                rows={2}
                value={categoryDraft.description}
                onChange={(event) =>
                  setCategoryDrafts((current) => ({
                    ...current,
                    [category.id]: { ...categoryDraft, description: event.target.value },
                  }))
                }
                placeholder="Category description"
                className="rounded-[14px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] outline-none"
              />

              <div className="grid gap-3 rounded-[20px] border border-[var(--color-border)] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-[var(--color-foreground)]">Subcategories</p>
                  <p className="text-xs uppercase tracking-[0.14em] text-[var(--color-muted)]">{category.subcategories.length} total</p>
                </div>

                {category.subcategories.length === 0 ? (
                  <p className="text-sm text-[var(--color-muted)]">No subcategories yet.</p>
                ) : (
                  category.subcategories.map((subcategory) => {
                    const subcategoryDraft = subcategoryDrafts[subcategory.id] ?? toEditableItem(subcategory);

                    return (
                      <div key={subcategory.id} className="grid gap-3 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_120px_auto_auto]">
                        <input
                          value={subcategoryDraft.label}
                          onChange={(event) =>
                            setSubcategoryDrafts((current) => ({
                              ...current,
                              [subcategory.id]: { ...subcategoryDraft, label: event.target.value },
                            }))
                          }
                          placeholder="Subcategory label"
                          className="h-10 rounded-[12px] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-foreground)] outline-none"
                        />
                        <input
                          value={subcategoryDraft.slug}
                          onChange={(event) =>
                            setSubcategoryDrafts((current) => ({
                              ...current,
                              [subcategory.id]: { ...subcategoryDraft, slug: event.target.value },
                            }))
                          }
                          placeholder="Slug"
                          className="h-10 rounded-[12px] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-foreground)] outline-none"
                        />
                        <input
                          type="number"
                          value={subcategoryDraft.position}
                          onChange={(event) =>
                            setSubcategoryDrafts((current) => ({
                              ...current,
                              [subcategory.id]: { ...subcategoryDraft, position: Number(event.target.value) || 0 },
                            }))
                          }
                          className="h-10 rounded-[12px] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-foreground)] outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => void saveSubcategory(subcategory.id)}
                          disabled={savingKey === `subcategory:${subcategory.id}`}
                          className="h-10 rounded-[12px] bg-[var(--color-foreground)] px-4 text-sm font-semibold text-white"
                        >
                          Save
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteSubcategory(subcategory.id)}
                          disabled={savingKey === `subcategory-delete:${subcategory.id}`}
                          className="h-10 rounded-[12px] border border-rose-200 px-4 text-sm font-semibold text-rose-700"
                        >
                          Delete
                        </button>
                        <textarea
                          rows={2}
                          value={subcategoryDraft.description}
                          onChange={(event) =>
                            setSubcategoryDrafts((current) => ({
                              ...current,
                              [subcategory.id]: { ...subcategoryDraft, description: event.target.value },
                            }))
                          }
                          placeholder="Subcategory description"
                          className="rounded-[12px] border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-foreground)] outline-none md:col-span-5"
                        />
                      </div>
                    );
                  })
                )}

                <div className="grid gap-3 rounded-[18px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-4 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_120px_auto]">
                  <input
                    value={newSubcategory.label}
                    onChange={(event) =>
                      setNewSubcategories((current) => ({
                        ...current,
                        [category.id]: { ...newSubcategory, label: event.target.value },
                      }))
                    }
                    placeholder="New subcategory label"
                    className="h-10 rounded-[12px] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-foreground)] outline-none"
                  />
                  <input
                    value={newSubcategory.slug}
                    onChange={(event) =>
                      setNewSubcategories((current) => ({
                        ...current,
                        [category.id]: { ...newSubcategory, slug: event.target.value },
                      }))
                    }
                    placeholder="Slug"
                    className="h-10 rounded-[12px] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-foreground)] outline-none"
                  />
                  <input
                    type="number"
                    value={newSubcategory.position}
                    onChange={(event) =>
                      setNewSubcategories((current) => ({
                        ...current,
                        [category.id]: { ...newSubcategory, position: Number(event.target.value) || 0 },
                      }))
                    }
                    className="h-10 rounded-[12px] border border-[var(--color-border)] bg-white px-3 text-sm text-[var(--color-foreground)] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => void createSubcategory(category.id)}
                    disabled={savingKey === `subcategory:new:${category.id}`}
                    className="h-10 rounded-[12px] bg-[var(--color-foreground)] px-4 text-sm font-semibold text-white"
                  >
                    Add subcategory
                  </button>
                  <textarea
                    rows={2}
                    value={newSubcategory.description}
                    onChange={(event) =>
                      setNewSubcategories((current) => ({
                        ...current,
                        [category.id]: { ...newSubcategory, description: event.target.value },
                      }))
                    }
                    placeholder="New subcategory description"
                    className="rounded-[12px] border border-[var(--color-border)] bg-white px-3 py-2 text-sm text-[var(--color-foreground)] outline-none md:col-span-4"
                  />
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="grid gap-3 rounded-[24px] border border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,0.8fr)_120px_auto]">
        <input
          value={newCategory.label}
          onChange={(event) => setNewCategory((current) => ({ ...current, label: event.target.value }))}
          placeholder="New category label"
          className="h-11 rounded-[14px] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none"
        />
        <input
          value={newCategory.slug}
          onChange={(event) => setNewCategory((current) => ({ ...current, slug: event.target.value }))}
          placeholder="Slug"
          className="h-11 rounded-[14px] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none"
        />
        <input
          type="number"
          value={newCategory.position}
          onChange={(event) => setNewCategory((current) => ({ ...current, position: Number(event.target.value) || 0 }))}
          className="h-11 rounded-[14px] border border-[var(--color-border)] bg-white px-4 text-sm text-[var(--color-foreground)] outline-none"
        />
        <button
          type="button"
          onClick={() => void createCategory()}
          disabled={savingKey === "category:new"}
          className="h-11 rounded-[14px] bg-[var(--color-foreground)] px-4 text-sm font-semibold text-white"
        >
          Add category
        </button>
        <textarea
          rows={2}
          value={newCategory.description}
          onChange={(event) => setNewCategory((current) => ({ ...current, description: event.target.value }))}
          placeholder="New category description"
          className="rounded-[14px] border border-[var(--color-border)] bg-white px-4 py-3 text-sm text-[var(--color-foreground)] outline-none md:col-span-4"
        />
      </div>
    </section>
  );
}
