'use client'

import React, { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ActionMenuItem {
  /** Use `type: 'separator'` for a horizontal divider between groups. */
  type?: 'item' | 'separator'
  label?: string
  icon?: React.ReactNode
  href?: string
  onClick?: () => void
  /** When true, menu item is styled as a destructive action (e.g. red text). */
  destructive?: boolean
  /** When true, item is disabled and shows disabledReason as title. */
  disabled?: boolean
  /** Shown as title (tooltip) when disabled. */
  disabledReason?: string
}

interface ActionMenuProps {
  items: ActionMenuItem[]
  triggerClassName?: string
  menuWidth?: number
  /** Tooltip and aria-label for the trigger button (e.g. "Actions"). */
  triggerTitle?: string
}

const MENU_EDGE_PAD = 8

export function ActionMenu({ items, triggerClassName, menuWidth = 160, triggerTitle }: ActionMenuProps) {
  const [openId, setOpenId] = useState<string | null>(null)
  const [anchor, setAnchor] = useState<{ top: number; left: number } | null>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (openId === null) return
    const onDocClick = (e: MouseEvent) => {
      if (menuRef.current?.contains(e.target as Node)) return
      setOpenId(null)
      setAnchor(null)
    }
    document.addEventListener('mousedown', onDocClick, true)
    return () => document.removeEventListener('mousedown', onDocClick, true)
  }, [openId])

  const id = React.useId()
  const menuId = openId !== null ? openId : null

  const getMenuStyle = (): React.CSSProperties => {
    if (!anchor) return {}
    let { top, left } = anchor
    const winW = typeof window !== 'undefined' ? window.innerWidth : 1024
    const winH = typeof window !== 'undefined' ? window.innerHeight : 768
    if (left + menuWidth > winW - MENU_EDGE_PAD) left = winW - menuWidth - MENU_EDGE_PAD
    if (left < MENU_EDGE_PAD) left = MENU_EDGE_PAD
    if (top < MENU_EDGE_PAD) top = MENU_EDGE_PAD
    const estH = items.reduce((sum, it) => sum + (it.type === 'separator' ? 10 : 36), 0) + 16
    if (top + estH > winH - MENU_EDGE_PAD) top = Math.max(MENU_EDGE_PAD, anchor.top - estH - 8)
    return { top, left, minWidth: menuWidth }
  }

  return (
    <>
      <button
        type="button"
        className={triggerClassName ?? 'h-8 w-8'}
        style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: '6px' }}
        onClick={(e) => {
          e.preventDefault()
          e.stopPropagation()
          if (openId === id) {
            setOpenId(null)
            setAnchor(null)
          } else {
            const rect = e.currentTarget.getBoundingClientRect()
            setAnchor({ top: rect.bottom + 4, left: rect.right - menuWidth })
            setOpenId(id)
          }
        }}
        onPointerDown={(e) => e.stopPropagation()}
        aria-haspopup="true"
        aria-expanded={openId === id}
        title={triggerTitle}
        aria-label={triggerTitle}
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      {menuId === id && anchor && typeof document !== 'undefined' && createPortal(
        <div
          ref={menuRef}
          role="menu"
          className="fixed z-[100] min-w-[10rem] rounded-md border bg-popover py-1 shadow-md"
          style={getMenuStyle()}
        >
          {items.map((item, i) => {
            if (item.type === 'separator') {
              return (
                <div
                  key={`sep-${i}`}
                  role="separator"
                  className="mx-2 my-1 h-px bg-border"
                  aria-hidden
                />
              )
            }
            const close = () => { setOpenId(null); setAnchor(null) }
            const run = () => { close(); item.onClick?.() }
            if (item.href) {
              return (
                <Link
                  key={i}
                  href={item.href}
                  role="menuitem"
                  className="flex w-full cursor-pointer items-center px-2 py-1.5 text-sm hover:bg-slate-100 no-underline text-foreground"
                  onClick={close}
                  onPointerDown={(e) => e.stopPropagation()}
                >
                  {item.icon && <span className="mr-2">{item.icon}</span>}
                  {item.label}
                </Link>
              )
            }
            return (
              <button
                key={i}
                type="button"
                role="menuitem"
                disabled={item.disabled}
                title={item.disabled ? item.disabledReason : undefined}
                className={cn(
                  'flex w-full items-center px-2 py-1.5 text-sm border-0 bg-transparent w-full text-left font-inherit',
                  item.disabled
                    ? 'cursor-not-allowed opacity-50 text-muted-foreground'
                    : 'cursor-pointer hover:bg-slate-100',
                  !item.disabled && item.destructive && 'text-destructive hover:text-destructive'
                )}
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); if (!item.disabled) run() }}
                onPointerDown={(e) => e.stopPropagation()}
              >
                {item.icon && <span className="mr-2">{item.icon}</span>}
                {item.label ?? ''}
              </button>
            )
          })}
        </div>,
        document.body
      )}
    </>
  )
}
