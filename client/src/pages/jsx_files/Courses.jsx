import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import ErrorState from "../../components/ErrorState";
import { apiRequest } from "../../services/apiRequest";
import "../css_files/Courses.css";

const CATEGORIES = [
  "Programming",
  "Web Development",
  "Data Science",
  "Database",
  "Other",
];

const LEVELS = ["Beginner", "Intermediate", "Advanced"];

const SKELETON_CARDS = [0, 1, 2, 3, 4, 5];

function moduleLabel(count) {
  return `${count} ${count === 1 ? "module" : "modules"}`;
}

function Courses() {
  const [searchParams, setSearchParams] = useSearchParams();

  const [courses, setCourses] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [filters, setFilters] = useState({
    search: searchParams.get("search") || "",
    category: searchParams.get("category") || "",
    level: searchParams.get("level") || "",
  });
  const [loading, setLoading] = useState(true);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [error, setError] = useState("");
  const [reloadKey, setReloadKey] = useState(0);

  const page = Number(searchParams.get("page")) || 1;
  const hasFilters = Boolean(
    filters.search.trim() || filters.category || filters.level,
  );

  useEffect(() => {
    // A newer request replaces this one, so a slow answer can never overwrite fresher results.
    let cancelled = false;

    const loadCourses = async () => {
      setLoading(true);
      setError("");

      try {
        const params = new URLSearchParams();

        if (filters.search.trim()) {
          params.set("search", filters.search.trim());
        }

        if (filters.category) {
          params.set("category", filters.category);
        }

        if (filters.level) {
          params.set("level", filters.level);
        }

        params.set("page", page);
        params.set("limit", 9);

        const data = await apiRequest(`/courses?${params.toString()}`);

        if (cancelled) return;

        setCourses(data.courses || []);
        setPagination(
          data.pagination || {
            page,
            pages: 1,
            total: 0,
          },
        );
        setHasLoaded(true);
      } catch (err) {
        if (cancelled) return;

        setError(err.message || "Unable to load courses.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCourses();

    return () => {
      cancelled = true;
    };
  }, [filters, page, reloadKey]);

  const updateFilter = (name, value) => {
    setFilters((current) => ({
      ...current,
      [name]: value,
    }));

    setSearchParams((current) => {
      const next = new URLSearchParams(current);

      if (value) {
        next.set(name, value);
      } else {
        next.delete(name);
      }

      next.set("page", "1");
      return next;
    });
  };

  const clearFilters = () => {
    setFilters({ search: "", category: "", level: "" });
    setSearchParams({});
  };

  const changePage = (nextPage) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("page", String(nextPage));
      return next;
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // The first load shows placeholder cards; later loads keep the old cards (dimmed) so nothing jumps.
  const showSkeleton = loading && !hasLoaded && !error;
  const showResults = hasLoaded && !error && courses.length > 0;
  const showEmpty = hasLoaded && !loading && !error && courses.length === 0;

  return (
    <main className="courses-page" aria-busy={loading}>
      <section className="courses-header">
        <p className="eyebrow">Explore</p>
        <h1>Courses</h1>
        <p>
          Find something useful to learn and keep your progress organized with
          Trackly.
        </p>
      </section>

      <section className="courses-filters" aria-label="Course filters">
        <label className="courses-search">
          <span className="visually-hidden">Search</span>

          <svg viewBox="0 0 24 24" aria-hidden="true">
            <circle cx="11" cy="11" r="6.5" />
            <path d="m16 16 4.2 4.2" />
          </svg>

          <input
            type="search"
            placeholder="Search courses"
            value={filters.search}
            onChange={(event) => updateFilter("search", event.target.value)}
          />
        </label>

        <label className="courses-select">
          <span className="visually-hidden">Category</span>

          <select
            value={filters.category}
            onChange={(event) => updateFilter("category", event.target.value)}
          >
            <option value="">All categories</option>
            {CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
        </label>

        <label className="courses-select">
          <span className="visually-hidden">Level</span>

          <select
            value={filters.level}
            onChange={(event) => updateFilter("level", event.target.value)}
          >
            <option value="">All levels</option>
            {LEVELS.map((level) => (
              <option key={level} value={level}>
                {level}
              </option>
            ))}
          </select>
        </label>
      </section>

      {hasLoaded && !error && (
        <p className="courses-count" role="status">
          {pagination.total === 1
            ? "1 course"
            : `${pagination.total} courses`}
          {hasFilters && (
            <>
              {" "}
              match your filters.{" "}
              <button
                type="button"
                className="link-button"
                onClick={clearFilters}
              >
                Clear filters
              </button>
            </>
          )}
        </p>
      )}

      {showSkeleton && (
        <>
          <p className="visually-hidden" role="status">
            Loading courses...
          </p>

          <div className="courses-grid" aria-hidden="true">
            {SKELETON_CARDS.map((item) => (
              <div className="course-card course-card-skeleton" key={item}>
                <div className="course-card-meta">
                  <span className="skeleton skeleton-chip" />
                  <span className="skeleton skeleton-chip" />
                </div>

                <span className="skeleton skeleton-title" />
                <span className="skeleton skeleton-line" />
                <span className="skeleton skeleton-line skeleton-short" />
              </div>
            ))}
          </div>
        </>
      )}

      {error && (
        <ErrorState message={error} onRetry={() => setReloadKey((key) => key + 1)} />
      )}

      {showEmpty && (
        <div className="courses-state">
          <h2>{hasFilters ? "Nothing matches yet" : "No courses yet"}</h2>
          <p>
            {hasFilters
              ? "Try a different search, or clear the filters to see everything."
              : "New courses will appear here as soon as they are published."}
          </p>

          {hasFilters && (
            <button
              type="button"
              className="secondary-button"
              onClick={clearFilters}
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {showResults && (
        <>
          <section
            className={`courses-grid${loading ? " is-refreshing" : ""}`}
            aria-label="Courses"
          >
            {courses.map((course) => (
              <article className="course-card" key={course._id}>
                <div className="course-card-meta">
                  <span>{course.category}</span>
                  <span className="course-card-level">{course.level}</span>
                </div>

                <h2>
                  <Link className="course-card-link" to={`/courses/${course._id}`}>
                    {course.title}
                  </Link>
                </h2>

                <p>{course.description}</p>

                <div className="course-card-footer">
                  {typeof course.moduleCount === "number" ? (
                    <span>{moduleLabel(course.moduleCount)}</span>
                  ) : (
                    <span />
                  )}

                  <span className="course-card-cta" aria-hidden="true">
                    View course <span className="course-card-arrow">→</span>
                  </span>
                </div>
              </article>
            ))}
          </section>

          {pagination.pages > 1 && (
            <nav className="courses-pagination" aria-label="Course pages">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => changePage(page - 1)}
              >
                ← Previous
              </button>

              <span aria-live="polite">
                Page {page} of {pagination.pages}
              </span>

              <button
                type="button"
                disabled={page >= pagination.pages}
                onClick={() => changePage(page + 1)}
              >
                Next →
              </button>
            </nav>
          )}
        </>
      )}
    </main>
  );
}

export default Courses;
