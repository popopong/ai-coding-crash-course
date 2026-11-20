import { describe, it, expect, beforeEach, vi } from "vitest";
import { createTestDb, seedBaseData } from "~/test/setup";
import * as schema from "~/db/schema";

let testDb: ReturnType<typeof createTestDb>;
let base: ReturnType<typeof seedBaseData>;

vi.mock("~/db", () => ({
  get db() {
    return testDb;
  },
}));

// Import after mock so the module picks up our test db
import {
  rateCourse,
  deleteRating,
  getUserRatingForCourse,
  getCourseRatingSummary,
  getRatingSummariesForCourses,
  isValidRating,
} from "./ratingService";

function enrol(userId: number, courseId: number) {
  testDb.insert(schema.enrollments).values({ userId, courseId }).run();
}

function createStudent(email: string) {
  return testDb
    .insert(schema.users)
    .values({ name: email, email, role: schema.UserRole.Student })
    .returning()
    .get();
}

describe("ratingService", () => {
  beforeEach(() => {
    testDb = createTestDb();
    base = seedBaseData(testDb);
  });

  describe("isValidRating", () => {
    it("accepts whole numbers 1 through 5", () => {
      for (const r of [1, 2, 3, 4, 5]) expect(isValidRating(r)).toBe(true);
    });

    it("rejects out-of-range, fractional, and non-number values", () => {
      for (const r of [0, 6, -1, 2.5, NaN, "3", null, undefined]) {
        expect(isValidRating(r)).toBe(false);
      }
    });
  });

  describe("rateCourse", () => {
    it("creates a rating for an enrolled student", () => {
      enrol(base.user.id, base.course.id);

      const rating = rateCourse(base.user.id, base.course.id, 4);

      expect(rating.rating).toBe(4);
      expect(getUserRatingForCourse(base.user.id, base.course.id)?.rating).toBe(4);
    });

    it("updates the existing rating instead of creating a duplicate", () => {
      enrol(base.user.id, base.course.id);

      rateCourse(base.user.id, base.course.id, 2);
      rateCourse(base.user.id, base.course.id, 5);

      const all = testDb.select().from(schema.courseRatings).all();
      expect(all).toHaveLength(1);
      expect(all[0].rating).toBe(5);
    });

    it("throws when the user is not enrolled", () => {
      expect(() => rateCourse(base.user.id, base.course.id, 5)).toThrowError(
        "Only enrolled students can rate this course"
      );
    });

    it("throws for an invalid rating", () => {
      enrol(base.user.id, base.course.id);

      expect(() => rateCourse(base.user.id, base.course.id, 0)).toThrowError(
        /between 1 and 5/
      );
      expect(() => rateCourse(base.user.id, base.course.id, 3.5)).toThrowError(
        /between 1 and 5/
      );
    });
  });

  describe("deleteRating", () => {
    it("removes the user's rating", () => {
      enrol(base.user.id, base.course.id);
      rateCourse(base.user.id, base.course.id, 3);

      deleteRating(base.user.id, base.course.id);

      expect(getUserRatingForCourse(base.user.id, base.course.id)).toBeUndefined();
    });
  });

  describe("getCourseRatingSummary", () => {
    it("returns null average and zero count when there are no ratings", () => {
      expect(getCourseRatingSummary(base.course.id)).toEqual({
        average: null,
        count: 0,
      });
    });

    it("averages ratings rounded to one decimal place", () => {
      const s2 = createStudent("s2@example.com");
      const s3 = createStudent("s3@example.com");
      for (const u of [base.user, s2, s3]) enrol(u.id, base.course.id);

      rateCourse(base.user.id, base.course.id, 5);
      rateCourse(s2.id, base.course.id, 4);
      rateCourse(s3.id, base.course.id, 4);

      expect(getCourseRatingSummary(base.course.id)).toEqual({
        average: 4.3,
        count: 3,
      });
    });
  });

  describe("getRatingSummariesForCourses", () => {
    it("returns summaries for every requested course, including unrated ones", () => {
      const other = testDb
        .insert(schema.courses)
        .values({
          title: "Other",
          slug: "other",
          description: "Other course",
          instructorId: base.instructor.id,
          categoryId: base.category.id,
          status: schema.CourseStatus.Published,
        })
        .returning()
        .get();

      enrol(base.user.id, base.course.id);
      rateCourse(base.user.id, base.course.id, 3);

      const map = getRatingSummariesForCourses([base.course.id, other.id]);

      expect(map.get(base.course.id)).toEqual({ average: 3, count: 1 });
      expect(map.get(other.id)).toEqual({ average: null, count: 0 });
    });

    it("returns an empty map for an empty list", () => {
      expect(getRatingSummariesForCourses([]).size).toBe(0);
    });
  });
});
