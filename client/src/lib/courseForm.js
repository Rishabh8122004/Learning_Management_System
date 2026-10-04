// Pure helpers behind the admin course editor: the blank form, converting to and from the server's shape,
// checking the form, and moving an item up or down. No React in here, so they can be tested on their own.
import { linkTypeOf } from "./linkType.js";

let keyCounter = 0;
const nextKey = () => `k${(keyCounter += 1)}`;

export const blankLesson = () => ({
  key: nextKey(),
  title: "",
  description: "",
  content: "",
  duration: "",
});

export const blankModule = () => ({
  key: nextKey(),
  title: "",
  description: "",
  lessons: [blankLesson()],
});

export const blankForm = () => ({
  title: "",
  description: "",
  category: "",
  level: "beginner",
  thumbnail: "",
  tags: "",
  published: false,
  modules: [],
});

const byOrder = (a, b) => (a.order || 0) - (b.order || 0);

export function fromServer(course) {
  return {
    title: course.title,
    description: course.description,
    category: course.category,
    level: course.level,
    thumbnail: course.thumbnail || "",
    tags: (course.tags || []).join(", "),
    published: Boolean(course.published),
    modules: [...(course.modules || [])].sort(byOrder).map((module) => ({
      key: nextKey(),
      _id: module._id,
      title: module.title,
      description: module.description || "",
      lessons: [...(module.lessons || [])].sort(byOrder).map((lesson) => ({
        key: nextKey(),
        _id: lesson._id,
        title: lesson.title,
        description: lesson.description || "",
        content: lesson.content,
        duration: lesson.duration ? String(lesson.duration) : "",
      })),
    })),
  };
}

export function toPayload(form) {
  const tags = [
    ...new Set(
      form.tags
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];

  return {
    title: form.title.trim(),
    description: form.description.trim(),
    category: form.category.trim(),
    level: form.level,
    thumbnail: form.thumbnail.trim() || null,
    tags,
    published: form.published,
    // Existing _ids are sent back so students' progress stays attached to their lessons.
    modules: form.modules.map((module, moduleIndex) => ({
      ...(module._id ? { _id: module._id } : {}),
      title: module.title.trim(),
      description: module.description.trim(),
      order: moduleIndex + 1,
      lessons: module.lessons.map((lesson, lessonIndex) => ({
        ...(lesson._id ? { _id: lesson._id } : {}),
        title: lesson.title.trim(),
        description: lesson.description.trim(),
        content: lesson.content.trim(),
        duration: Math.max(0, parseInt(lesson.duration, 10) || 0),
        order: lessonIndex + 1,
      })),
    })),
  };
}

// Returns the first problem found, or "" when the form can be saved.
export function validate(form) {
  if (form.title.trim().length < 3) return "The title needs at least 3 characters.";
  if (form.description.trim().length < 10) return "The description needs at least 10 characters.";
  if (form.category.trim().length < 2) return "Please add a category.";
  if (form.thumbnail.trim() && !linkTypeOf(form.thumbnail.trim())) {
    return "The thumbnail must be a link starting with http:// or https://.";
  }

  for (const [moduleIndex, module] of form.modules.entries()) {
    if (!module.title.trim()) return `Module ${moduleIndex + 1} needs a title.`;

    for (const [lessonIndex, lesson] of module.lessons.entries()) {
      const where = `Module ${moduleIndex + 1}, lesson ${lessonIndex + 1}`;
      if (!lesson.title.trim()) return `${where} needs a title.`;
      if (!linkTypeOf(lesson.content.trim())) {
        return `${where} needs a link starting with http:// or https://.`;
      }
    }
  }

  return "";
}

export const statusOf = (course) => {
  if (course.deletedAt) return "archived";
  return course.published ? "published" : "draft";
};

export function moveItem(list, index, direction) {
  const target = index + direction;
  if (target < 0 || target >= list.length) return list;

  const copy = [...list];
  [copy[index], copy[target]] = [copy[target], copy[index]];
  return copy;
}
