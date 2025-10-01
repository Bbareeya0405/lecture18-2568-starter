import { Router, type Request, type Response } from "express";
import { type Student, type Enrollment } from "../libs/types.js";

import {
  zStudentPostBody,
  zStudentPutBody,
  zStudentId,
} from "../libs/zodValidators.js";

// import database
import { students, courses, enrollments } from "../db/db.js";

import type { User, CustomRequest } from "../libs/types.js";
import { authenticateToken } from "../middlewares/authenMiddleware.js";
import { checkRoleAdmin } from "../middlewares/checkRoleAdminMiddleware.js";

// import database
import {
  users,
  reset_users,
  reset_courses,
  reset_enrollments,
  reset_students,
  reset_db,
} from "../db/db.js";
import { success } from "zod";
import { checkRoles } from "../middlewares/checkRolesAllMiddleware.js";
import { checkRoleStudent } from "../middlewares/checkRoleStudentMiddleware.js";

const router = Router();

// GET /api/v2/students
// get students (by program)
router.get(
  "/",
  authenticateToken,
  checkRoleAdmin,
  (req: CustomRequest, res: Response) => {
    try {
      const payload = (req as CustomRequest).user;
      const token = (req as CustomRequest).token;

      const show_data = students.map((x) => ({
        studentId: x.studentId,
        courses: (x.courses ?? []).map((y) => ({ couseId: y })),
      }));

      return res.json({
        success: true,
        message: "Enrollment Information",
        data: show_data,
      });
    } catch (err) {
      return res.status(200).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);

router.get(
  "/:studentId",
  authenticateToken,
  checkRoles,
  (req: CustomRequest, res: Response) => {
    try {
      const studentId = req.params.studentId;
      const result = zStudentId.safeParse(studentId);

      if (!result.success) {
        return res.status(400).json({
          message: "Validation failed",
          errors: result.error.issues[0]?.message,
        });
      }

      const foundIndex = students.findIndex(
        (std: Student) => std.studentId === studentId
      );

      if (foundIndex === -1) {
        return res.status(404).json({
          success: false,
          message: "Student does not exists",
        });
      }

      res.json({
        success: true,
        data: students[foundIndex],
      });
    } catch (err) {
      return res.status(500).json({
        success: false,
        message: "Something is wrong, please try again",
        error: err,
      });
    }
  }
);

router.post(
  "/:studentId",
  authenticateToken,
  checkRoleStudent,
  (req: CustomRequest, res: Response) => {
    try {
      const studentId = req.params.studentId;
      const { courseId } = req.body;

      // 1. ตรวจสอบ studentId ใน token
      if (req.user?.studentId !== studentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: cannot add course for another student",
        });
      }

      // 2. Validate studentId
      const parseResult = zStudentId.safeParse(studentId);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.issues[0]?.message,
        });
      }

      // 3. ตรวจสอบ duplicate enrollment
      const isDuplicate = enrollments.some(
        (e) => e.studentId === studentId && e.courseId === courseId
      );
      if (isDuplicate) {
        return res.status(409).json({
          success: false,
          message: `Course ${courseId} already registered for student ${studentId}`,
        });
      }

      // 4. Add enrollment
      const newEnrollment: Enrollment = { studentId: studentId!, courseId };
      enrollments.push(newEnrollment);

      res.status(201).json({
        success: true,
        message: `Course ${courseId} added for student ${studentId}`,
        data: newEnrollment,
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Something went wrong",
        error: err,
      });
    }
  }
);


router.post("/reset", (req: Request, res: Response) => {
  try {
    reset_db();
    reset_courses();
    reset_enrollments();
    reset_students();
    reset_users();
    return res.status(200).json({
      success: true,
      message: "enrollment database has been reset",
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Something is wrong, please try again",
      error: err,
    });
  }
});

router.delete(
  "/:studentId",
  authenticateToken,
  checkRoleStudent,
  (req: CustomRequest, res: Response) => {
    try {
      const studentId = req.params.studentId;
      const { courseId } = req.body;

      // 1. ตรวจสอบ studentId ใน token
      if (req.user?.studentId !== studentId) {
        return res.status(403).json({
          success: false,
          message: "Forbidden: cannot drop course for another student",
        });
      }

      // 2. Validate studentId
      const parseResult = zStudentId.safeParse(studentId);
      if (!parseResult.success) {
        return res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: parseResult.error.issues[0]?.message,
        });
      }

      // 3. หา index ของ enrollment
      const index = enrollments.findIndex(
        (e) => e.studentId === studentId && e.courseId === courseId
      );

      if (index === -1) {
        return res.status(404).json({
          success: false,
          message: `Course ${courseId} not found for student ${studentId}`,
        });
      }

      // 4. ลบ enrollment
      enrollments.splice(index, 1);

      res.status(200).json({
        success: true,
        message: `Course ${courseId} dropped for student ${studentId}`,
        data: enrollments.filter((e) => e.studentId === studentId),
      });
    } catch (err) {
      res.status(500).json({
        success: false,
        message: "Something went wrong",
        error: err,
      });
    }
  }
);

export default router;