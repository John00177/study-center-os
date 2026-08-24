import "express-session";

declare module "express-session" {
  interface SessionData {
    // Set by POST /auth/student-login — a deliberately separate, lighter
    // session shape from passport's staff req.user/serializer, since
    // students aren't org "members" (no UserOrganizationRole row) and don't
    // need the RBAC machinery TenancyGuard/PermissionGuard provide.
    studentId?: string;
    studentOrganizationId?: string;
    // Set by POST /auth/parent-login — same lighter-session pattern as the
    // student portal above, keyed by the child's Student row rather than a
    // separate Parent-account model (parents authenticate with the
    // parentEmail/parentPhone/parentPassword fields on Student).
    parentStudentId?: string;
    parentOrganizationId?: string;
  }
}
