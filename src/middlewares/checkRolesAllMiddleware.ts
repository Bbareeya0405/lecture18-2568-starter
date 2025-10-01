// src/middlewares/checkRolesMiddleware.ts
import { type Request, type Response, type NextFunction } from "express";
import { type CustomRequest, type User } from "../libs/types.js";
import { users, reset_users } from "../db/db.js";

// interface CustomRequest extends Request {
//   user?: any; // Define the user property
//   token?: string; // Define the token property
// }

export const checkRoles = (
  req: CustomRequest,
  res: Response,
  next: NextFunction
) => {
  // 1. get "user payload" and "token" from (custom) request
  const payload = req.user;
  const token = req.token;

  // 2. check if user exists (search with username)
  const user = users.find((u: User) => u.username === payload?.username);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: "Unauthorized user",
    });
  }

  // (optional) check if token exists in user data
  const isAdmin = user.role === "ADMIN";
  const isStudent = user.role === "STUDENT" && user.studentId === req.params.studentId;

  if (!isAdmin && !isStudent) {
    return res.status(403).json({ 
      success: false, 
      message: "Forbidden access" 
    });
  }

  // Proceed to next middleware or route handler
  next();
};