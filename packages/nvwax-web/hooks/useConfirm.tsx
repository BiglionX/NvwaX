'use client';

/**
 * useConfirm — 应用内确认对话框 Hook
 *
 * 用法：
 *   const { confirm, ConfirmDialog } = useConfirm();
 *   const onDelete = () => confirm({
 *     title: '确认删除？',
 *     message: '此操作不可恢复',
 *     variant: 'danger',
 *     onConfirm: async () => { await deleteApi(); },
 *   });
 *   return <>...<ConfirmDialog /></>;
 */

import { useCallback, useState, type JSX } from 'react';
import ConfirmDialog from '@/components/ConfirmDialog';

export interface ConfirmOptions {
  title: string;
  message: string;
  variant?: 'danger' | 'warning' | 'info';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
}

interface ConfirmState extends ConfirmOptions {
  open: boolean;
}

interface UseConfirmReturn {
  confirm: (opts: ConfirmOptions) => void;
  /** React 19：必须返回 JSX.Element（ReactElement 泛型不再被 JSX 接受） */
  ConfirmDialog: () => JSX.Element | null;
}

export function useConfirm(): UseConfirmReturn {
  const [state, setState] = useState<ConfirmState | null>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setState({ ...opts, open: true });
  }, []);

  const handleClose = useCallback(() => {
    setState((s) => (s ? { ...s, open: false } : s));
  }, []);

  const ConfirmDialogElement = useCallback(() => {
    if (!state) return null;
    return (
      <ConfirmDialog
        isOpen={state.open}
        onClose={handleClose}
        onConfirm={state.onConfirm}
        title={state.title}
        message={state.message}
        variant={state.variant}
        confirmText={state.confirmText}
        cancelText={state.cancelText}
      />
    );
  }, [state, handleClose]);

  return { confirm, ConfirmDialog: ConfirmDialogElement };
}