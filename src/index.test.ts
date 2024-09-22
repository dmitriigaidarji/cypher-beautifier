import {expect, test} from 'vitest'
import beautifyCypher from './index.js'

test('adds 1 + 2 to equal 3', () => {
    expect(beautifyCypher('a')).toBe('aTEST')
})