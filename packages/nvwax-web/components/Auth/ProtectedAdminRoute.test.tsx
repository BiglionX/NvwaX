/**
 * ProtectedAdminRoute.test.tsx (Sprint 2.4)
 *
 * 覆盖：
 * - Case 1: loading 中显示 spinner
 * - Case 2: 已登录 + is_admin=true → 渲染 children
 * - Case 3: 未登录 → 跳 /admin/login
 * - Case 4: 已登录但 is_admin=false → 跳 /admin/login
 * - Case 5: 已登录 + is_admin=undefined → 跳（防御）
 * - Case 6: pathname = /admin/login → 不跳转，渲染 children
 * - Case 7: loading 状态变化不重复触发跳转
 * - Case 8: 不读 localStorage（XSS 防御验证）
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { createRoot, type Root } from 'react-dom/client';
import { act } from 'react';

// ─────────── mock: next/navigation ───────────
const mockReplace = vi.fn();
const mockUseRouter = vi.fn(() => ({ replace: mockReplace, push: vi.fn(), back: vi.fn() }));
let mockPathnameValue = '/admin/dashboard';

vi.mock('next/navigation', () => ({
  useRouter: () => mockUseRouter(),
  usePathname: () => mockPathnameValue,
}));

// ─────────── mock: useAuth ───────────
interface AuthApi {
  isLoggedIn: boolean;
  userInfo: { id?: string; email?: string; is_admin?: boolean } | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
  getToken: () => string | null;
}
let mockAuthState: AuthApi = {
  isLoggedIn: false,
  userInfo: null,
  loading: true,
  login: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn().mockResolvedValue(undefined),
  refresh: vi.fn().mockResolvedValue(undefined),
  getToken: vi.fn(() => null),
};
vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => mockAuthState,
}));

import ProtectedAdminRoute from './ProtectedAdminRoute';

interface Harness {
  root: Root;
  container: HTMLElement;
}

function mountHarness(): Harness {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  act(() => {
    root.render(
      <ProtectedAdminRoute>
        <div data-testid="protected-content">Admin Dashboard Content</div>
      </ProtectedAdminRoute>,
    );
  });
  return { root, container };
}

function unmountHarness(h: Harness) {
  act(() => {
    h.root.unmount();
  });
  h.container.remove();
}

beforeEach(() => {
  mockReplace.mockClear();
  mockPathnameValue = '/admin/dashboard';
  mockAuthState = {
    isLoggedIn: false,
    userInfo: null,
    loading: true,
    login: vi.fn().mockResolvedValue(undefined),
    logout: vi.fn().mockResolvedValue(undefined),
    refresh: vi.fn().mockResolvedValue(undefined),
    getToken: vi.fn(() => null),
  };
  // 清 localStorage
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
});

// ─────────── Case 1: loading 中显示 spinner ───────────
describe('Case 1: loading state shows spinner', () => {
  it('renders spinner when useAuth.loading is true', () => {
    mockAuthState.loading = true;
    const h = mountHarness();
    expect(h.container.textContent).toContain('验证管理员权限');
    expect(h.container.querySelector('[data-testid="protected-content"]')).toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
    unmountHarness(h);
  });
});

// ─────────── Case 2: 已登录 + is_admin=true → 渲染 children ───────────
describe('Case 2: logged in with is_admin=true renders children', () => {
  it('renders children when is_admin=true', () => {
    mockAuthState.loading = false;
    mockAuthState.isLoggedIn = true;
    mockAuthState.userInfo = { id: 'u-1', email: 'admin@x.com', is_admin: true };
    const h = mountHarness();
    expect(h.container.querySelector('[data-testid="protected-content"]')).not.toBeNull();
    expect(mockReplace).not.toHaveBeenCalled();
    unmountHarness(h);
  });
});

// ─────────── Case 3: 未登录 → 跳 /admin/login ───────────
describe('Case 3: not logged in → redirect to /admin/login', () => {
  it('calls router.replace(/admin/login) when isLoggedIn is false', () => {
    mockAuthState.loading = false;
    mockAuthState.isLoggedIn = false;
    mockAuthState.userInfo = null;
    const h = mountHarness();
    expect(mockReplace).toHaveBeenCalledWith('/admin/login');
    expect(h.container.querySelector('[data-testid="protected-content"]')).toBeNull();
    unmountHarness(h);
  });
});

// ─────────── Case 4: 已登录但 is_admin=false → 跳 /admin/login ───────────
describe('Case 4: logged in but is_admin=false → redirect', () => {
  it('calls router.replace(/admin/login) when is_admin is false', () => {
    mockAuthState.loading = false;
    mockAuthState.isLoggedIn = true;
    mockAuthState.userInfo = { id: 'u-2', email: 'user@x.com', is_admin: false };
    const h = mountHarness();
    expect(mockReplace).toHaveBeenCalledWith('/admin/login');
    unmountHarness(h);
  });
});

// ─────────── Case 5: 已登录 + is_admin=undefined → 跳（防御） ───────────
describe('Case 5: logged in but is_admin=undefined → redirect (defense in depth)', () => {
  it('rejects when is_admin field is missing entirely', () => {
    mockAuthState.loading = false;
    mockAuthState.isLoggedIn = true;
    mockAuthState.userInfo = { id: 'u-3', email: 'x@x.com' }; // no is_admin
    const h = mountHarness();
    expect(mockReplace).toHaveBeenCalledWith('/admin/login');
    unmountHarness(h);
  });
});

// ─────────── Case 6: pathname = /admin/login → 不跳转，渲染 children ───────────
describe('Case 6: pathname is /admin/login → render children without redirect', () => {
  it('allows access to /admin/login page even when not admin', () => {
    mockPathnameValue = '/admin/login';
    mockAuthState.loading = false;
    mockAuthState.isLoggedIn = false;
    mockAuthState.userInfo = null;
    const h = mountHarness();
    expect(mockReplace).not.toHaveBeenCalled();
    expect(h.container.querySelector('[data-testid="protected-content"]')).not.toBeNull();
    unmountHarness(h);
  });
});

// ─────────── Case 7: loading 状态变化不重复触发跳转 ───────────
describe('Case 7: loading state does not trigger redirect', () => {
  it('does not call replace when loading is still true', () => {
    mockAuthState.loading = true;
    mockAuthState.isLoggedIn = false;
    const h = mountHarness();
    // 多次 rerender 也不应触发 replace
    act(() => {
      h.root.render(
        <ProtectedAdminRoute>
          <div data-testid="protected-content">X</div>
        </ProtectedAdminRoute>,
      );
    });
    act(() => {
      h.root.render(
        <ProtectedAdminRoute>
          <div data-testid="protected-content">Y</div>
        </ProtectedAdminRoute>,
      );
    });
    expect(mockReplace).not.toHaveBeenCalled();
    unmountHarness(h);
  });
});

// ─────────── Case 8: 不读 localStorage（XSS 防御验证） ───────────
describe('Case 8: does not read localStorage (XSS defense)', () => {
  it('does not check localStorage for admin_token / user_token / user_info', () => {
    // 预置 localStorage 包含 admin 凭据
    localStorage.setItem('admin_token', 'fake-admin-token');
    localStorage.setItem('user_token', 'fake-user-token');
    localStorage.setItem('user_info', JSON.stringify({ email: '1055603323@qq.com' }));

    mockAuthState.loading = false;
    mockAuthState.isLoggedIn = false; // 故意让 useAuth 说没登录
    mockAuthState.userInfo = null;

    const h = mountHarness();

    // 即使 localStorage 里有 admin token，新版 ProtectedAdminRoute 也不应读它
    // 应当走 useAuth → 跳 /admin/login
    expect(mockReplace).toHaveBeenCalledWith('/admin/login');
    unmountHarness(h);

    // 验证 localStorage 没被新版组件写过
    expect(localStorage.getItem('admin_token')).toBe('fake-admin-token'); // 仍为预置值（未删除，未被改）
  });

  it('does not use hardcoded admin emails', () => {
    // 预置 localStorage 包含 1055603323@qq.com（曾经的硬编码 admin email）
    localStorage.setItem('user_info', JSON.stringify({ email: '1055603323@qq.com', is_admin: false }));

    mockAuthState.loading = false;
    mockAuthState.isLoggedIn = true;
    mockAuthState.userInfo = { id: 'u', email: '1055603323@qq.com', is_admin: false };

    const h = mountHarness();

    // 即使 email 是 1055603323@qq.com，is_admin=false 仍应被拒绝
    expect(mockReplace).toHaveBeenCalledWith('/admin/login');
    unmountHarness(h);
  });
});
