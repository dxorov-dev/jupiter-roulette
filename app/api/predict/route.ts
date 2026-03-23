import { NextRequest, NextResponse } from 'next/server'

class MarkovChainAnalyzer {
  private sequence: number[]
  private states: number[]

  constructor(sequence: number[]) {
    this.sequence = sequence
    this.states = [1, 2, 3, 4]
  }

  private getCombinations(arr: number[], size: number): number[][] {
    const result: number[][] = []

    function generate(current: number[]) {
      if (current.length === size) {
        result.push([...current])
        return
      }
      for (const item of arr) {
        current.push(item)
        generate(current)
        current.pop()
      }
    }

    generate([])
    return result
  }

  private calculateTransitionMatrix(order: number): { matrix: number[][], counts: number[][], states: number[][] } {
    const possibleStates = this.getCombinations(this.states, order)

    const stateToIdx = new Map<string, number>()
    possibleStates.forEach((state, i) => stateToIdx.set(JSON.stringify(state), i))

    const matrix: number[][] = Array(possibleStates.length).fill(null).map(() => Array(4).fill(0))
    const counts: number[][] = Array(possibleStates.length).fill(null).map(() => Array(4).fill(0))

    for (let i = 0; i < this.sequence.length - order; i++) {
      const currentState = this.sequence.slice(i, i + order)
      const nextState = this.sequence[i + order]

      const stateKey = JSON.stringify(currentState)
      if (stateToIdx.has(stateKey)) {
        const rowIdx = stateToIdx.get(stateKey)!
        const colIdx = nextState - 1
        counts[rowIdx][colIdx]++
      }
    }

    for (let i = 0; i < possibleStates.length; i++) {
      const rowSum = counts[i].reduce((a, b) => a + b, 0)
      if (rowSum > 0) {
        matrix[i] = counts[i].map(c => c / rowSum)
      }
    }

    return { matrix, counts, states: possibleStates }
  }

  predictNextProbabilities(currentState: number[], order: number): Map<number, number> {
    const { matrix, states } = this.calculateTransitionMatrix(order)
    const result = new Map<number, number>()

    if (currentState.length === order && matrix.length > 0) {
      const stateKey = JSON.stringify(currentState)
      const stateIdx = states.findIndex(s => JSON.stringify(s) === stateKey)

      if (stateIdx >= 0) {
        const probs = matrix[stateIdx]
        this.states.forEach((s, i) => result.set(s, probs[i]))
        return result
      }
    }

    // Default equal probabilities
    this.states.forEach(s => result.set(s, 0.25))
    return result
  }
}

class RouletteDataProcessor {
  rawNumbers: number[] = []
  sequences: { high_low: number[], odd_even: number[] }
  mappedSequences: { high_low: number[], odd_even: number[] }

  constructor() {
    this.sequences = { high_low: [], odd_even: [] }
    this.mappedSequences = { high_low: [], odd_even: [] }
  }

  addNumber(num: number): void {
    this.rawNumbers.push(num)
    this.updateSequences()
  }

  private updateSequences(): void {
    this.sequences = { high_low: [], odd_even: [] }

    for (let i = 0; i < this.rawNumbers.length; i++) {
      const num = this.rawNumbers[i]

      // 1. Основная дюжина (high_low)
      if (num <= 12) {
        this.sequences.high_low.push(1, 1)
      } else if (num <= 18) {
        this.sequences.high_low.push(1, 2)
      } else if (num <= 24) {
        this.sequences.high_low.push(2, 1)
      } else {
        this.sequences.high_low.push(2, 2)
      }

      // 2. Колоны (columns)
      const col1Set = new Set([0, 1, 4, 7, 10, 13, 16, 19, 22, 25, 28, 31, 34])
      const col1_2Set = new Set([2, 5, 8, 11, 14, 17])
      const col2_1Set = new Set([20, 23, 26, 29, 32, 35])
      const col2_2Set = new Set([3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36])

      if (col1Set.has(num)) {
        this.sequences.odd_even.push(1, 1)
      } else if (col1_2Set.has(num)) {
        this.sequences.odd_even.push(1, 2)
      } else if (col2_1Set.has(num)) {
        this.sequences.odd_even.push(2, 1)
      } else if (col2_2Set.has(num)) {
        this.sequences.odd_even.push(2, 2)
      }
    }

    this.updateMappedSequences()
  }

  private updateMappedSequences(): void {
    this.mappedSequences = { high_low: [], odd_even: [] }

    const mapping: Record<string, number> = {
      '1,1': 1,
      '1,2': 2,
      '2,1': 3,
      '2,2': 4
    }

    for (const seqType of Object.keys(this.sequences) as Array<keyof typeof this.sequences>) {
      const seq = this.sequences[seqType]

      if (seq.length >= 8) {
        for (let i = 1; i < seq.length - 6; i++) {
          const firstIdx = i - 1
          const secondIdx = i + 6
          if (secondIdx < seq.length) {
            const pair = `${seq[firstIdx]},${seq[secondIdx]}`
            const mapped = mapping[pair]
            if (mapped) {
              this.mappedSequences[seqType].push(mapped)
            }
          }
        }
      }
    }
  }

  getMappedSequence(seqType: 'high_low' | 'odd_even'): number[] {
    return this.mappedSequences[seqType]
  }
}

function transformPredictions(predList: number[]): number[] {
  // Transform 10 predictions into 5 numbers
  if (predList.length !== 10) return predList

  const transformed: number[] = []
  for (let i = 0; i < 10; i += 2) {
    const pair = [predList[i], predList[i + 1]]

    if (pair[0] === 1 && pair[1] === 1) {
      transformed.push(1)
    } else if ((pair[0] === 1 && pair[1] === 2) || (pair[0] === 2 && pair[1] === 1)) {
      transformed.push(2)
    } else if (pair[0] === 2 && pair[1] === 2) {
      transformed.push(3)
    }
  }
  return transformed
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { numbers } = body

    if (!Array.isArray(numbers) || numbers.length === 0) {
      return NextResponse.json({ error: 'Numbers array is required' }, { status: 400 })
    }

    // Validate numbers
    for (const num of numbers) {
      if (typeof num !== 'number' || num < 0 || num > 36 || !Number.isInteger(num)) {
        return NextResponse.json({ error: 'Numbers must be integers 0-36' }, { status: 400 })
      }
    }

    // Process data
    const processor = new RouletteDataProcessor()
    for (const num of numbers) {
      processor.addNumber(num)
    }

    // Check if we have enough data
    const results: {
      high_low: number[]
      odd_even: number[]
    } = {
      high_low: [],
      odd_even: []
    }

    for (const seqType of ['high_low', 'odd_even'] as const) {
      const mappedSeq = processor.getMappedSequence(seqType)

      if (mappedSeq.length < 2) {
        return NextResponse.json({
          error: `Недостаточно данных для прогноза (нужно минимум 4 числа рулетки)`,
          needMinNumbers: true
        }, { status: 400 })
      }

      // Create analyzer
      const analyzer = new MarkovChainAnalyzer(mappedSeq)
      const sequence = [...mappedSeq]
      const fullPredictions: number[] = []

      // Generate 10 predictions
      for (let step = 0; step < 10; step++) {
        const stepProbs: Map<number, number>[] = []

        for (const order of [1, 2, 3]) {
          if (sequence.length >= order) {
            const currentState = sequence.slice(-order)
            const probs = analyzer.predictNextProbabilities(currentState, order)
            stepProbs.push(probs)
          }
        }

        // Combine probabilities
        const combinedProbs = new Map<number, number>()
        for (const probs of stepProbs) {
          for (const [state, prob] of probs) {
            combinedProbs.set(state, (combinedProbs.get(state) || 0) + prob / stepProbs.length)
          }
        }

        // Find max probability
        let maxState = 1
        let maxProb = 0
        for (const [state, prob] of combinedProbs) {
          if (prob > maxProb) {
            maxProb = prob
            maxState = state
          }
        }

        fullPredictions.push(maxState)
        sequence.push(maxState)
      }

      // Convert to user predictions (1 or 2)
      const userPredictions = fullPredictions.map(num => {
        return (num === 1 || num === 3) ? 1 : 2
      })

      results[seqType] = userPredictions
    }

    // Transform high_low and odd_even results
    const transformedHighLow = transformPredictions(results.high_low)
    const transformedOddEven = transformPredictions(results.odd_even)

    return NextResponse.json({
      predictions: {
        mainDozen: transformedHighLow,      // Основная дюжина (1, 2, 3)
        columns: transformedOddEven         // Колоны (1, 2, 3)
      }
    })

  } catch (error) {
    console.error('Prediction error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
