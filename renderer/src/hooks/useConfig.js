/**
 * hooks/useConfig.js — 앱 설정 커스텀 훅
 *
 * 커스텀 훅(Custom Hook)이란?
 * - React의 useState, useEffect를 조합해서 재사용 가능한 로직을 만든 것입니다.
 * - 이름이 'use'로 시작하는 함수입니다.
 * - 여러 컴포넌트에서 같은 로직을 쓸 때 중복을 줄여줍니다.
 *
 * 이 훅은:
 * - Main Process에서 config 데이터를 불러오고
 * - config를 업데이트하는 함수를 제공합니다.
 */

import { useState, useEffect } from 'react'

// 기본 설정값 (Main에서 불러오기 전에 초기 상태로 사용)
const DEFAULT_CONFIG = {
  theme: 'dark-night',
  layout: 'horizontal-split',
  opacity: 0.85,
}

export function useConfig() {
  const [config, setConfig] = useState(DEFAULT_CONFIG)
  const [loading, setLoading] = useState(true)

  // 컴포넌트 마운트 시 설정 불러오기
  useEffect(() => {
    async function loadConfig() {
      try {
        // Main Process에 config 요청 (IPC 통신)
        const savedConfig = await window.electron.config.get()
        if (savedConfig) {
          // 저장된 설정과 기본값을 병합 (새 키가 추가됐을 때 대비)
          setConfig({ ...DEFAULT_CONFIG, ...savedConfig })
        }
      } catch (err) {
        console.error('[useConfig] 설정 불러오기 실패:', err)
      } finally {
        setLoading(false)  // 성공이든 실패든 로딩 완료
      }
    }
    loadConfig()
  }, []) // 빈 배열 = 마운트 시 1회만 실행

  // 설정 업데이트 함수
  // 사용 예: updateConfig({ theme: 'warm-paper' })
  async function updateConfig(partial) {
    const newConfig = { ...config, ...partial }
    setConfig(newConfig)  // UI 즉시 업데이트 (낙관적 업데이트)
    try {
      await window.electron.config.set(newConfig)  // 저장
    } catch (err) {
      console.error('[useConfig] 설정 저장 실패:', err)
      setConfig(config)  // 실패하면 이전 값으로 롤백
    }
  }

  return { config, updateConfig, loading }
}
