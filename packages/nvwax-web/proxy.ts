import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js 16 Proxy Configuration
 * 路由权限控制
 */

// 需要登录才能访问的路由
const protectedRoutes = [
  '/profile',
  '/projects',
];

// Admin 专属路由
const adminRoutes = [
  '/admin/dashboard',
  '/admin/crawler',
  '/admin/admins',
  '/admin/settings',
];

export default function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 注意：由于 token 存储在 localStorage（客户端），服务端无法读取
  // 所以所有认证检查都由客户端组件处理（ProtectedAdminRoute、useAuth 等）
  // 如果需要服务端验证，需要将 token 存储改为 cookies

  // 1. 检查 Admin 路由
  // 注意：由于 token 存储在 localStorage（客户端），服务端无法读取
  // 所以这里不做服务端检查，完全由客户端 ProtectedAdminRoute 组件处理
  // 如果需要服务端验证，需要将 token 存储改为 cookies
  
  // 暂时注释掉服务端 token 检查，避免与客户端 localStorage 方案冲突
  // if (adminRoutes.some(route => pathname.startsWith(route))) {
  //   // Admin 路由需要 admin_token
  //   if (!adminToken && pathname !== '/admin/login') {
  //     const loginUrl = new URL('/admin/login', request.url);
  //     loginUrl.searchParams.set('redirect', pathname);
  //     return NextResponse.redirect(loginUrl);
  //   }
  //   
  //   // 如果已登录但访问登录页，重定向到 dashboard
  //   if (adminToken && pathname === '/admin/login') {
  //     return NextResponse.redirect(new URL('/admin/dashboard', request.url));
  //   }
  // }

  // 2. 检查普通用户保护路由
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    // 注意：由于 token 存储在 localStorage（客户端），服务端无法读取
    // 所以这里只做基本的重定向保护，实际认证由客户端 ProtectedRoute 组件处理
    // 如果需要服务端验证，需要将 token 存储改为 cookies
    
    // 暂时注释掉服务端 token 检查，避免与客户端 localStorage 方案冲突
    // if (!userToken) {
    //   const loginUrl = new URL('/login', request.url);
    //   loginUrl.searchParams.set('redirect', pathname);
    //   return NextResponse.redirect(loginUrl);
    // }
    
    // 如果已登录但访问登录页，重定向到 profile
    // 同样注释掉，由客户端 useEffect 处理
    // if (userToken && pathname === '/login') {
    //   return NextResponse.redirect(new URL('/profile', request.url));
    // }
  }

  // 3. 其他路由正常访问
  return NextResponse.next();
}

// 配置 matcher，只对这些路径执行 proxy
export const config = {
  matcher: [
    /*
     * 匹配所有路径，除了:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
