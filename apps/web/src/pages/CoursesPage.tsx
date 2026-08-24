import type { CourseCategory, CourseDto } from "@crm/shared-types";
import { isAxiosError } from "axios";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { ConfirmDialog } from "../components/ConfirmDialog";
import { DataTable } from "../components/DataTable";
import { Modal } from "../components/Modal";
import { useToast } from "../components/Toast";
import { SelectField, TextField } from "../components/form/Field";
import {
  CourseInput,
  useCourse,
  useCourses,
  useCreateCourse,
  useDeleteCourse,
  useUpdateCourse,
} from "../hooks/use-courses";

type SortBy = "name" | "fee" | "category";

const CATEGORY_OPTIONS: { value: CourseCategory; label: string }[] = [
  { value: "language", label: "Language" },
  { value: "mathematics", label: "Mathematics" },
  { value: "science", label: "Science" },
  { value: "it_computer", label: "IT & Computer" },
  { value: "arts", label: "Arts" },
  { value: "music", label: "Music" },
  { value: "sports", label: "Sports" },
  { value: "preparation", label: "Test Prep" },
  { value: "other", label: "Other" },
];

const CATEGORY_LABELS: Record<CourseCategory, string> = CATEGORY_OPTIONS.reduce(
  (acc, o) => ({ ...acc, [o.value]: o.label }),
  {} as Record<CourseCategory, string>,
);

const CATEGORY_STYLES: Record<CourseCategory, string> = {
  language: "bg-blue-100 text-blue-700",
  mathematics: "bg-purple-100 text-purple-700",
  science: "bg-green-100 text-green-700",
  it_computer: "bg-indigo-100 text-indigo-700",
  arts: "bg-pink-100 text-pink-700",
  music: "bg-orange-100 text-orange-700",
  sports: "bg-red-100 text-red-700",
  preparation: "bg-yellow-100 text-yellow-700",
  other: "bg-slate-100 text-slate-600",
};

const LEVEL_OPTIONS = ["Beginner", "Intermediate", "Advanced"];

function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function formatFee(fee?: number | null) {
  if (!fee) return "Free";
  return `${new Intl.NumberFormat("en-US").format(fee)} UZS`;
}

function CategoryBadge({ category }: { category: CourseCategory }) {
  return (
    <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${CATEGORY_STYLES[category]}`}>
      {CATEGORY_LABELS[category]}
    </span>
  );
}

interface FormState {
  name: string;
  category: CourseCategory;
  level: string;
  duration: string;
  monthlyFee: string;
  description: string;
}

function toFormState(course?: CourseDto | null): FormState {
  return {
    name: course?.name ?? "",
    category: course?.category ?? "other",
    level: course?.level ?? "",
    duration: course?.duration ?? "",
    monthlyFee: course?.monthlyFee != null ? String(course.monthlyFee) : "",
    description: course?.description ?? "",
  };
}

function CourseForm({
  open,
  onClose,
  course,
}: {
  open: boolean;
  onClose: () => void;
  course?: CourseDto | null;
}) {
  const isEditing = Boolean(course);
  const [form, setForm] = useState<FormState>(() => toFormState(course));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const createCourse = useCreateCourse();
  const updateCourse = useUpdateCourse();
  const { showToast } = useToast();
  const isSaving = createCourse.isPending || updateCourse.isPending;

  useEffect(() => {
    if (open) {
      setForm(toFormState(course));
      setErrors({});
    }
  }, [open, course]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const nextErrors: Record<string, string> = {};
    if (!form.name.trim()) nextErrors.name = "Course name is required.";
    if (!form.category) nextErrors.category = "Category is required.";
    if (form.monthlyFee.trim() === "" || Number(form.monthlyFee) < 0) {
      nextErrors.monthlyFee = "Enter a monthly fee (0 for free).";
    }
    if (Object.keys(nextErrors).length) {
      setErrors(nextErrors);
      return;
    }

    const input: CourseInput = {
      name: form.name.trim(),
      category: form.category,
      level: form.level || undefined,
      duration: form.duration.trim() || undefined,
      monthlyFee: Number(form.monthlyFee),
      description: form.description.trim() || undefined,
    };

    try {
      if (isEditing && course) {
        await updateCourse.mutateAsync({ id: course.id, ...input });
        showToast("Course updated.");
      } else {
        await createCourse.mutateAsync(input);
        showToast("Course created.");
      }
      onClose();
    } catch {
      showToast(isEditing ? "Failed to update course." : "Failed to create course.", "error");
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={isEditing ? "Edit Course" : "New Course"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <TextField
          label="Course Name"
          required
          value={form.name}
          error={errors.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
        />
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Slug</label>
          <input
            disabled
            value={slugify(form.name) || "course"}
            className="w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500"
          />
          <p className="mt-1 text-xs text-slate-400">Generated automatically from the course name.</p>
        </div>

        <SelectField
          label="Category"
          required
          value={form.category}
          error={errors.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as CourseCategory }))}
        >
          {CATEGORY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </SelectField>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">
            Monthly Fee (UZS) <span className="ml-0.5 text-red-500">*</span>
          </label>
          <div className="relative">
            <input
              type="number"
              min="0"
              value={form.monthlyFee}
              onChange={(e) => setForm((f) => ({ ...f, monthlyFee: e.target.value }))}
              className={`w-full rounded-md border px-3 py-3 pr-16 text-lg font-semibold text-slate-900 focus:outline-none focus:ring-1 ${
                errors.monthlyFee
                  ? "border-red-300 focus:border-red-500 focus:ring-red-500"
                  : "border-slate-300 focus:border-indigo-500 focus:ring-indigo-500"
              }`}
            />
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400">
              UZS
            </span>
          </div>
          {errors.monthlyFee && <p className="mt-1 text-xs text-red-600">{errors.monthlyFee}</p>}
          <p className="mt-1 text-xs text-slate-500">
            Students will be charged this amount automatically when enrolled.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Level"
            value={form.level}
            onChange={(e) => setForm((f) => ({ ...f, level: e.target.value }))}
          >
            <option value="">Not specified</option>
            {LEVEL_OPTIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </SelectField>
          <TextField
            label="Duration"
            placeholder="3 months"
            value={form.duration}
            onChange={(e) => setForm((f) => ({ ...f, duration: e.target.value }))}
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
          <textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-900 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end gap-3 border-t border-slate-200 pt-4">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-60"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEditing ? "Save changes" : "Create course"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

function CourseDetailModal({
  courseId,
  onClose,
  onEdit,
}: {
  courseId: string | null;
  onClose: () => void;
  onEdit: (course: CourseDto) => void;
}) {
  const { data: course, isLoading } = useCourse(courseId);

  return (
    <Modal open={Boolean(courseId)} onClose={onClose} title={course?.name ?? "Course"}>
      {isLoading || !course ? (
        <p className="text-sm text-slate-500">Loading...</p>
      ) : (
        <div className="space-y-5">
          <div className="flex items-center gap-2">
            <CategoryBadge category={course.category} />
            {course.level && <span className="text-sm text-slate-500">{course.level}</span>}
            {course.duration && <span className="text-sm text-slate-500">· {course.duration}</span>}
          </div>

          <div className="rounded-lg bg-indigo-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-500">Monthly Fee</p>
            <p className="mt-1 text-2xl font-bold text-indigo-700">
              {course.monthlyFee ? `${new Intl.NumberFormat("en-US").format(course.monthlyFee)} UZS` : "Free"}
              {course.monthlyFee ? <span className="ml-1 text-sm font-medium text-indigo-400">/ month</span> : null}
            </p>
          </div>

          {course.description && <p className="text-sm text-slate-600">{course.description}</p>}

          <div>
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Groups using this course ({course.groups?.length ?? 0})
            </h3>
            {course.groups && course.groups.length > 0 ? (
              <ul className="divide-y divide-slate-100 rounded-md border border-slate-200">
                {course.groups.map((g) => (
                  <li key={g.id} className="flex items-center justify-between px-3 py-2 text-sm">
                    <span className="font-medium text-slate-900">{g.name}</span>
                    <span className="text-slate-500">{g.branchName ?? "-"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No groups yet.</p>
            )}
          </div>

          <div className="flex justify-end border-t border-slate-200 pt-4">
            <button
              onClick={() => onEdit(course)}
              className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
            >
              <Pencil className="h-4 w-4" />
              Edit
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}

export function CoursesPage() {
  const { data, isLoading } = useCourses();
  const deleteCourse = useDeleteCourse();
  const { showToast } = useToast();

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<CourseDto | null>(null);
  const [deleting, setDeleting] = useState<CourseDto | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);

  const [categoryFilter, setCategoryFilter] = useState<CourseCategory | "">("");
  const [search, setSearch] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");

  const filtered = useMemo(() => {
    let rows = data ?? [];
    if (categoryFilter) rows = rows.filter((c) => c.category === categoryFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter((c) => c.name.toLowerCase().includes(q));
    }
    const sorted = [...rows];
    switch (sortBy) {
      case "fee":
        sorted.sort((a, b) => (b.monthlyFee ?? 0) - (a.monthlyFee ?? 0));
        break;
      case "category":
        sorted.sort((a, b) => CATEGORY_LABELS[a.category].localeCompare(CATEGORY_LABELS[b.category]));
        break;
      case "name":
      default:
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return sorted;
  }, [data, categoryFilter, search, sortBy]);

  async function confirmDelete() {
    if (!deleting) return;
    try {
      await deleteCourse.mutateAsync(deleting.id);
      showToast("Course deleted.");
      setDeleting(null);
    } catch (err) {
      if (isAxiosError(err) && err.response?.status === 409) {
        showToast("Cannot delete a course with active groups.", "error");
      } else {
        showToast("Failed to delete course.", "error");
      }
      setDeleting(null);
    }
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-slate-900">Courses</h1>
        <button
          onClick={() => {
            setEditing(null);
            setFormOpen(true);
          }}
          className="flex items-center gap-2 rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Course
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-4">
        <div className="w-48">
          <TextField label="Search" placeholder="Course name..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <div className="w-48">
          <SelectField
            label="Category"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as CourseCategory | "")}
          >
            <option value="">All categories</option>
            {CATEGORY_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </SelectField>
        </div>
        <div className="w-40">
          <SelectField label="Sort by" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortBy)}>
            <option value="name">Name</option>
            <option value="fee">Fee</option>
            <option value="category">Category</option>
          </SelectField>
        </div>
      </div>

      <DataTable
        data={filtered}
        isLoading={isLoading}
        emptyMessage='No courses yet. Click "New Course" to add one.'
        getRowKey={(c) => c.id}
        onRowClick={(c) => setDetailId(c.id)}
        columns={[
          { header: "Course Name", render: (c) => <span className="font-medium text-slate-900">{c.name}</span> },
          { header: "Category", render: (c) => <CategoryBadge category={c.category} /> },
          { header: "Level", render: (c) => c.level ?? "-" },
          { header: "Duration", render: (c) => c.duration ?? "-" },
          {
            header: "Monthly Fee",
            align: "right",
            render: (c) => <span className="font-bold text-slate-900">{formatFee(c.monthlyFee)}</span>,
          },
          { header: "Groups", render: (c) => c.groupCount, align: "right" },
          { header: "Students", render: (c) => c.studentCount, align: "right" },
        ]}
        renderActions={(c) => (
          <>
            <button
              onClick={() => {
                setEditing(c);
                setFormOpen(true);
              }}
              className="rounded p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
              aria-label="Edit course"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleting(c)}
              className="rounded p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
              aria-label="Delete course"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </>
        )}
      />

      <CourseForm open={formOpen} onClose={() => setFormOpen(false)} course={editing} />

      <CourseDetailModal
        courseId={detailId}
        onClose={() => setDetailId(null)}
        onEdit={(course) => {
          setDetailId(null);
          setEditing(course);
          setFormOpen(true);
        }}
      />

      <ConfirmDialog
        open={Boolean(deleting)}
        title="Delete course"
        message={`Are you sure you want to delete ${deleting?.name}? This cannot be undone.`}
        isConfirming={deleteCourse.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleting(null)}
      />
    </div>
  );
}
