/**
 * hooks/useGoals.js — 목표 & 체크리스트 커스텀 훅
 */

import { useState, useEffect, useCallback } from 'react'

export function useGoals() {
  const [goals, setGoals]         = useState([])
  const [checklist, setChecklist] = useState([])
  const [loading, setLoading]     = useState(true)

  // 마운트 시 목표 + 체크리스트 동시 로드
  useEffect(() => {
    async function load() {
      try {
        // Promise.all: 두 요청을 동시에 보내서 시간 절약
        const [goalData, checkData] = await Promise.all([
          window.electron.goal.getAll(),
          window.electron.checklist.getToday(),
        ])
        setGoals(goalData ?? [])
        setChecklist(checkData ?? [])
      } catch (err) {
        console.error('[useGoals] 데이터 로드 실패:', err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  // ── 목표 CRUD ──

  const addGoal = useCallback(async (goal) => {
    const updated = await window.electron.goal.add(goal)
    setGoals(updated)
  }, [])

  // current: 새 진행값 (예: 85)
  const updateGoalProgress = useCallback(async (id, current) => {
    // 낙관적 업데이트
    setGoals((prev) =>
      prev.map((g) => g.id === id ? { ...g, current } : g)
    )
    const updated = await window.electron.goal.update(id, current)
    setGoals(updated)
  }, [])

  const removeGoal = useCallback(async (id) => {
    const updated = await window.electron.goal.remove(id)
    setGoals(updated)
  }, [])

  // ── 체크리스트 CRUD ──

  const toggleChecklist = useCallback(async (id) => {
    // 낙관적 업데이트
    setChecklist((prev) =>
      prev.map((item) => item.id === id ? { ...item, done: !item.done } : item)
    )
    const updated = await window.electron.checklist.toggle(id)
    setChecklist(updated)
  }, [])

  const addChecklistItem = useCallback(async (title) => {
    const updated = await window.electron.checklist.add(title)
    setChecklist(updated)
  }, [])

  const removeChecklistItem = useCallback(async (id) => {
    const updated = await window.electron.checklist.remove(id)
    setChecklist(updated)
  }, [])

  return {
    goals,
    checklist,
    loading,
    addGoal,
    updateGoalProgress,
    removeGoal,
    toggleChecklist,
    addChecklistItem,
    removeChecklistItem,
  }
}
