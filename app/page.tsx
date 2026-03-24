'use client'

import { useState, useEffect, useCallback } from 'react'
import { useTelegram } from '@/hooks/useTelegram'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Loader2, Trash2, RotateCcw, Sparkles, Globe } from 'lucide-react'
import { Language, LANGUAGE_NAMES, LANGUAGE_FLAGS, translations, TranslationKey } from '@/lib/i18n'

// Red numbers in European roulette
const RED_NUMBERS = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36])

const MIN_NUMBERS = 4
const MAX_NUMBERS = 120
const LANGUAGES: Language[] = ['ru', 'tr', 'en', 'de', 'id', 'es', 'ms', 'ko']

interface Predictions {
  mainDozen: number[]
  columns: number[]
}

function getNumberColor(num: number): 'red' | 'black' | 'green' {
  if (num === 0) return 'green'
  return RED_NUMBERS.has(num) ? 'red' : 'black'
}

function getButtonColorClass(num: number): string {
  const color = getNumberColor(num)
  switch (color) {
    case 'red':
      return 'bg-red-600 hover:bg-red-700 text-white'
    case 'black':
      return 'bg-gray-600 hover:bg-gray-700 text-white'
    case 'green':
      return 'bg-green-600 hover:bg-green-700 text-white'
  }
}

function getHistoryChipClass(num: number): string {
  const color = getNumberColor(num)
  switch (color) {
    case 'red':
      return 'bg-red-600 text-white'
    case 'black':
      return 'bg-gray-600 text-white'
    case 'green':
      return 'bg-green-600 text-white'
  }
}

// Language Selection Screen
function LanguageScreen({ onSelect }: { onSelect: (lang: Language) => void }) {
  return (
    <div className="min-h-screen bg-[#1a1a1a] flex flex-col items-center justify-center p-4">
      <div className="text-center mb-8">
        <div className="text-6xl mb-4">🪐</div>
        <h1 className="text-3xl font-bold text-orange-500 mb-2">Jupiter</h1>
        <p className="text-gray-400 text-sm">European Roulette Prediction</p>
      </div>

      <Card className="bg-[#262626] border-gray-700 w-full max-w-sm">
        <CardHeader className="py-4">
          <CardTitle className="text-lg font-bold text-gray-200 text-center">
            🌐 Select Language
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="space-y-2">
            {LANGUAGES.map(lang => (
              <Button
                key={lang}
                onClick={() => onSelect(lang)}
                className="w-full flex items-center justify-center gap-3 py-4 text-base bg-[#333] hover:bg-orange-600 text-gray-200 hover:text-white border border-gray-600 hover:border-orange-600 transition-all"
                variant="outline"
              >
                <span className="text-2xl">{LANGUAGE_FLAGS[lang]}</span>
                <span className="font-medium">{LANGUAGE_NAMES[lang]}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default function JupiterApp() {
  const { haptic, notification, isTelegram } = useTelegram()

  const [isLoadingStorage, setIsLoadingStorage] = useState(true)
  const [languageSelected, setLanguageSelected] = useState(false)
  const [language, setLanguage] = useState<Language>('en')
  const [showLanguageSelector, setShowLanguageSelector] = useState(false)
  const [numbers, setNumbers] = useState<number[]>([])
  const [predictions, setPredictions] = useState<Predictions | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState('ready')

  const t = useCallback((key: TranslationKey): string => {
    return translations[language][key]
  }, [language])

  useEffect(() => {
    const savedLang = localStorage.getItem('jupiterLanguage') as Language
    if (savedLang && LANGUAGES.includes(savedLang)) {
      setLanguage(savedLang)
      setLanguageSelected(true)
    }

    const saved = localStorage.getItem('jupiterNumbers')
    if (saved) {
      try {
        const parsed = JSON.parse(saved)
        if (Array.isArray(parsed)) {
          setNumbers(parsed.slice(0, MAX_NUMBERS))
        }
      } catch (e) {
        console.error('Failed to load saved numbers:', e)
      }
    }

    setIsLoadingStorage(false)
  }, [])

  const handleLanguageSelect = (lang: Language) => {
    setLanguage(lang)
    localStorage.setItem('jupiterLanguage', lang)
    setLanguageSelected(true)
    haptic('medium')
  }

  useEffect(() => {
    if (languageSelected) {
      localStorage.setItem('jupiterLanguage', language)
    }
  }, [language, languageSelected])

  useEffect(() => {
    localStorage.setItem('jupiterNumbers', JSON.stringify(numbers))
  }, [numbers])

  const addNumber = useCallback((num: number) => {
    setNumbers(prev => {
      if (prev.length >= MAX_NUMBERS) {
        return [...prev.slice(1), num]
      }
      return [...prev, num]
    })
    haptic('light')
    setStatus('added')
  }, [haptic])

  const deleteLastNumber = useCallback(() => {
    setNumbers(prev => {
      if (prev.length > 0) {
        setStatus('deleted')
        return prev.slice(0, -1)
      }
      return prev
    })
    haptic('medium')
  }, [haptic])

  const clearAllNumbers = useCallback(() => {
    setNumbers([])
    setPredictions(null)
    setStatus('cleared')
    haptic('heavy')
    notification('warning')
  }, [haptic, notification])

  const predictNumbers = useCallback(async () => {
    if (numbers.length < MIN_NUMBERS) {
      setStatus('needMinNumbers')
      notification('warning')
      return
    }

    setIsLoading(true)
    setStatus('predicting')

    try {
      const response = await fetch('/api/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Prediction error')
      }

      setPredictions(data.predictions)
      setStatus('predictionComplete')
      haptic('heavy')
      notification('success')
    } catch (error) {
      console.error('Prediction error:', error)
      setStatus('predictionError')
      notification('error')
    } finally {
      setIsLoading(false)
    }
  }, [numbers, haptic, notification])

  const changeLanguage = (lang: Language) => {
    setLanguage(lang)
    setShowLanguageSelector(false)
    haptic('light')
  }

  const getStatusMessage = (): string => {
    switch (status) {
      case 'ready': return t('ready')
      case 'added': return `${t('addedNumber')} ✅`
      case 'deleted': return `${t('deletedNumber')} ✅`
      case 'cleared': return t('baseCleared')
      case 'needMinNumbers': return t('needMinNumbers')
      case 'predicting': return t('predicting')
      case 'predictionComplete': return t('predictionComplete')
      case 'predictionError': return t('predictionError')
      default: return t('ready')
    }
  }

  const getCountColor = () => {
    if (numbers.length >= MIN_NUMBERS) return 'text-green-500'
    return 'text-red-500'
  }

  const recentNumbers = numbers.slice(-20)

  if (isLoadingStorage) {
    return (
      <div className="min-h-screen bg-[#1a1a1a] flex items-center justify-center">
        <div className="text-center">
          <div className="text-4xl mb-4">🪐</div>
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    )
  }

  if (!languageSelected) {
    return <LanguageScreen onSelect={handleLanguageSelect} />
  }

  return (
    <div className="min-h-screen bg-[#1a1a1a] text-gray-100 p-3 pb-6">
      {/* Header */}
      <header className="text-center mb-3">
        <h1 className="text-xl font-bold text-orange-500 flex items-center justify-center gap-2">
          🪐 {t('title')}
        </h1>
        {isTelegram && (
          <p className="text-xs text-gray-400 mt-1">Telegram Mini App</p>
        )}
      </header>

      {/* Language Selector */}
      <div className="relative mb-3">
        <div className="text-xs text-gray-400 mb-1 text-center">{t('selectLanguage')}</div>
        <button
          onClick={() => setShowLanguageSelector(!showLanguageSelector)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg bg-[#262626] border border-gray-700 text-sm text-gray-300 hover:bg-[#333] transition-colors"
        >
          <Globe className="w-4 h-4" />
          <span>{LANGUAGE_FLAGS[language]} {LANGUAGE_NAMES[language]}</span>
        </button>

        {showLanguageSelector && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-[#262626] border border-gray-700 rounded-lg overflow-hidden z-50 shadow-lg">
            {LANGUAGES.map(lang => (
              <button
                key={lang}
                onClick={() => changeLanguage(lang)}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-[#333] transition-colors ${language === lang ? 'bg-orange-600/20 text-orange-500' : 'text-gray-300'}`}
              >
                <span className="text-lg">{LANGUAGE_FLAGS[lang]}</span>
                <span>{LANGUAGE_NAMES[lang]}</span>
                {language === lang && <span className="ml-auto">✓</span>}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Prediction Results */}
      {predictions && (
        <div className="space-y-2 mb-3">
          {/* Main Dozen */}
          <Card className="bg-[#262626] border-cyan-500 border-2">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm font-bold text-cyan-400">
                {t('mainDozen')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="flex flex-wrap gap-2 justify-center">
                {predictions.mainDozen.map((num, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-400 mb-1">{index + 1}</span>
                    <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-10 rounded-lg text-lg font-bold ${
                      num === 1 ? 'bg-blue-600 text-white' :
                      num === 2 ? 'bg-purple-600 text-white' :
                      'bg-pink-600 text-white'
                    }`}>
                      {num}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Columns */}
          <Card className="bg-[#262626] border-amber-500 border-2">
            <CardHeader className="py-2 px-3">
              <CardTitle className="text-sm font-bold text-amber-400">
                {t('columns')}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2 pt-0">
              <div className="flex flex-wrap gap-2 justify-center">
                {predictions.columns.map((num, index) => (
                  <div key={index} className="flex flex-col items-center">
                    <span className="text-[10px] text-gray-400 mb-1">{index + 1}</span>
                    <span className={`inline-flex items-center justify-center min-w-[2.5rem] h-10 rounded-lg text-lg font-bold ${
                      num === 1 ? 'bg-blue-600 text-white' :
                      num === 2 ? 'bg-purple-600 text-white' :
                      'bg-pink-600 text-white'
                    }`}>
                      {num}
                    </span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

        </div>
      )}

      {/* Counter */}
      <div className="text-center mb-2">
        <span className="text-sm">
          {t('numbersInBase')}{' '}
          <span className={`font-bold ${getCountColor()}`}>
            {numbers.length} ({t('minRequired')})
          </span>
        </span>
      </div>

      {/* Status */}
      <div className="text-center text-xs text-gray-400 mb-2">
        {getStatusMessage()}
      </div>

      {/* Number Buttons Grid */}
      <Card className="bg-[#262626] border-gray-700 mb-3">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm font-bold text-gray-200">
            {t('quickButtons')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          <div className="grid gap-1">
            {/* Row 0-9 */}
            <div className="flex gap-1 justify-center">
              {Array.from({ length: 10 }, (_, i) => i).map(num => (
                <Button
                  key={num}
                  onClick={() => addNumber(num)}
                  className={`${getButtonColorClass(num)} min-w-[2rem] h-9 p-0 text-xs font-bold`}
                  size="sm"
                >
                  {num}
                </Button>
              ))}
            </div>
            {/* Row 10-19 */}
            <div className="flex gap-1 justify-center">
              {Array.from({ length: 10 }, (_, i) => i + 10).map(num => (
                <Button
                  key={num}
                  onClick={() => addNumber(num)}
                  className={`${getButtonColorClass(num)} min-w-[2rem] h-9 p-0 text-xs font-bold`}
                  size="sm"
                >
                  {num}
                </Button>
              ))}
            </div>
            {/* Row 20-29 */}
            <div className="flex gap-1 justify-center">
              {Array.from({ length: 10 }, (_, i) => i + 20).map(num => (
                <Button
                  key={num}
                  onClick={() => addNumber(num)}
                  className={`${getButtonColorClass(num)} min-w-[2rem] h-9 p-0 text-xs font-bold`}
                  size="sm"
                >
                  {num}
                </Button>
              ))}
            </div>
            {/* Row 30-36 */}
            <div className="flex gap-1 justify-center">
              {Array.from({ length: 7 }, (_, i) => i + 30).map(num => (
                <Button
                  key={num}
                  onClick={() => addNumber(num)}
                  className={`${getButtonColorClass(num)} min-w-[2rem] h-9 p-0 text-xs font-bold`}
                  size="sm"
                >
                  {num}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Control Buttons */}
      <div className="flex gap-2 mb-3">
        <Button
          onClick={deleteLastNumber}
          variant="outline"
          className="flex-1 bg-orange-600 hover:bg-orange-700 text-white border-orange-600 h-10"
        >
          <RotateCcw className="w-4 h-4 mr-1" />
          {t('delete')}
        </Button>
        <Button
          onClick={predictNumbers}
          disabled={isLoading || numbers.length < MIN_NUMBERS}
          className="flex-1 bg-green-600 hover:bg-green-700 text-white h-10 font-bold"
        >
          {isLoading ? (
            <Loader2 className="w-4 h-4 mr-1 animate-spin" />
          ) : (
            <Sparkles className="w-4 h-4 mr-1" />
          )}
          {t('predict')}
        </Button>
        <Button
          onClick={clearAllNumbers}
          variant="outline"
          className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600 h-10"
        >
          <Trash2 className="w-4 h-4 mr-1" />
          {t('clear')}
        </Button>
      </div>

      {/* Recent Numbers */}
      <Card className="bg-[#262626] border-gray-700 mb-3">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm font-bold text-gray-200">
            {t('lastNumbers')}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          {recentNumbers.length > 0 ? (
            <div className="flex flex-wrap gap-1">
              {recentNumbers.map((num, index) => (
                <span
                  key={index}
                  className={`inline-flex items-center justify-center min-w-[1.75rem] h-7 rounded font-bold text-sm ${getHistoryChipClass(num)}`}
                >
                  {num}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-xs">{t('noNumbers')}</p>
          )}
        </CardContent>
      </Card>

      {/* Current Database */}
      <Card className="bg-[#262626] border-gray-700">
        <CardHeader className="py-2 px-3">
          <CardTitle className="text-sm font-bold text-gray-200 flex items-center justify-between">
            <span>{t('currentBase')}</span>
            <span className="text-orange-500">{numbers.length}</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 pt-0">
          {numbers.length > 0 ? (
            <div className="max-h-32 overflow-y-auto text-xs">
              <div className="flex flex-wrap gap-1">
                {numbers.map((num, index) => (
                  <span
                    key={index}
                    className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 rounded text-[10px] font-bold ${getHistoryChipClass(num)}`}
                  >
                    {num}
                  </span>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-gray-500 text-xs">{t('noNumbersHint')}</p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
