import {
  updateSession,
  decrypt,
} from "@/app/lib/cookies/cookieFunctionsforMiddleware";
import { NextResponse } from "next/server";

export async function middleware(request) {
  console.log("middleware ran successfully");

  const blockedPathPatterns = [
    /^\/\.env/i,
    /^\/\.git/i,
    /^\/\.DS_Store/i,
    /^\/\.vscode/i,
    /^\/server-status/i,
    /^\/actuator/i,
    /^\/telescope/i,
    /^\/swagger/i,
    /^\/api-docs/i,
    /^\/v[23]\/api-docs/i,
    /^\/webjars\/swagger-ui/i,
    /^\/wp(-|\/)/i,
    /^\/wp-content/i,
    /^\/wp-includes/i,
    /^\/wp-admin/i,
    /^\/xmlrpc\.php$/i,
    /^\/wp-login\.php$/i,
    /^\/cgi-bin/i,
    /\.php$/i,
  ];

  if (blockedPathPatterns.some((pattern) => pattern.test(request.nextUrl.pathname))) {
    return new NextResponse(null, { status: 404 });
  }

  if (request.nextUrl.pathname === "/api/cron") {
    return NextResponse.next();
  }

  const cookieStore = await request.cookies;
  const currentUser = cookieStore.get("session")?.value;

  let currentUserObj = null;
  if (currentUser) {
    currentUserObj = await decrypt(currentUser);
  }

  const userType = currentUserObj?.resultObj?.userType;

  if (
    !currentUser &&
    ![
      "/test-page",
      "/",
      "/signup",
      "/gift",
      "/auth/sign-in",
      "/auth/sign-up",
      "/password-reset",
      "/contact",
      "/faq",
      "/reset-password",
      "/survey",
      "/benefits-calculator",
      /^\/workplace-wellness\/.*$/,
      /^\/password-reset\/set-new-password\/.*$/,
      /^\/unsubscribe\/.*$/,
      /^\/gift\/.*$/,
      /^\/gift$/,
    ].some((path) =>
      typeof path === "string"
        ? path === request.nextUrl.pathname
        : path.test(request.nextUrl.pathname)
    )
  ) {
    return NextResponse.redirect(new URL("/auth/sign-in", request.url));
  }

  const dashboardPaths = {
    patient: "/dashboard/patient",
    rmt: "/dashboard/rmt",
    pending: "/dashboard/patient",
  };

  if (
    currentUser &&
    !request.nextUrl.pathname.startsWith(dashboardPaths[userType]) &&
    !request.nextUrl.pathname.startsWith("/gift") &&
    !request.nextUrl.pathname.startsWith("/benefits-calculator")
  ) {
    return NextResponse.redirect(
      new URL(dashboardPaths[userType], request.url)
    );
  }

  return await updateSession(request);
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/(api|trpc)(.*)"],
};

// import {
//   updateSession,
//   decrypt,
// } from "@/app/lib/cookies/cookieFunctionsforMiddleware";
// import { NextResponse } from "next/server";

// export async function middleware(request) {
//   console.log("middleware ran successfully");

//   if (request.nextUrl.pathname === "/api/cron") {
//     return NextResponse.next();
//   }

//   const cookieStore = await request.cookies;
//   const currentUser = cookieStore.get("session")?.value;

//   let currentUserObj = null;
//   if (currentUser) {
//     currentUserObj = await decrypt(currentUser);
//   }

//   const userType = currentUserObj?.resultObj?.userType;

//   if (
//     !currentUser &&
//     ![
//       "/test-page",
//       "/",
//       "/auth/sign-in",
//       "/auth/sign-up",
//       "/password-reset",
//       "/contact",
//       "/faq",
//       "/reset-password",
//       "/survey",
//       /^\/workplace-wellness\/.*$/,
//       /^\/password-reset\/set-new-password\/.*$/,
//       /^\/unsubscribe\/.*$/,
//     ].some((path) =>
//       typeof path === "string"
//         ? path === request.nextUrl.pathname
//         : path.test(request.nextUrl.pathname)
//     )
//   ) {
//     return NextResponse.redirect(new URL("/auth/sign-in", request.url));
//   }

//   const dashboardPaths = {
//     patient: "/dashboard/patient",
//     rmt: "/dashboard/rmt",
//     pending: "/dashboard/patient",
//   };

//   if (
//     currentUser &&
//     !request.nextUrl.pathname.startsWith(dashboardPaths[userType])
//   ) {
//     return NextResponse.redirect(
//       new URL(dashboardPaths[userType], request.url)
//     );
//   }

//   return await updateSession(request);
// }

// export const config = {
//   matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/(api|trpc)(.*)"],
// };
