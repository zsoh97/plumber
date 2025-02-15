import { describe, expect, it } from 'vitest'

import { substituteOldTemplates } from './utils'

const varInfo = new Map<
  string,
  {
    label: string
    testRunValue: string
  }
>()
varInfo.set('{{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello}}', {
  label: 'hello',
  testRunValue: 'world',
})
varInfo.set('{{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.papa}}', {
  label: 'papa',
  testRunValue: 'mama',
})

describe('replaceOldTemplates', () => {
  it('should replace old {{.}} with correct <span /> value', () => {
    const testCases = [
      {
        input: '{{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello}}',
        expected:
          '<span data-type="variable" data-id="step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello" data-label="hello" data-value="world">{{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello}}</span>',
      },
      {
        input:
          'Aloha. {{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello}} world!',
        expected:
          'Aloha. <span data-type="variable" data-id="step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello" data-label="hello" data-value="world">{{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello}}</span> world!',
      },
      {
        input:
          '{{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello}} world! {{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.papa}}',
        expected:
          '<span data-type="variable" data-id="step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello" data-label="hello" data-value="world">{{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello}}</span> world! <span data-type="variable" data-id="step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.papa" data-label="papa" data-value="mama">{{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.papa}}</span>',
      },
    ]
    for (const t of testCases) {
      expect(substituteOldTemplates(t.input, varInfo)).toEqual(t.expected)
    }
  })

  it('should not replace {{.}} that is already inside a variable span', () => {
    const testCases = [
      {
        input:
          '<span data-type="variable" data-id="step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello" data-label="hello" data-value="world">{{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello}}</span>',
        expected:
          '<span data-type="variable" data-id="step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello" data-label="hello" data-value="world">{{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello}}</span>',
      },
      {
        input:
          'Aloha. <span data-type="variable" data-id="step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello" data-label="hello" data-value="world">{{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello}}</span> world!',
        expected:
          'Aloha. <span data-type="variable" data-id="step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello" data-label="hello" data-value="world">{{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello}}</span> world!',
      },
    ]
    for (const t of testCases) {
      expect(substituteOldTemplates(t.input, varInfo)).toEqual(t.expected)
    }
  })

  it('should handle undefined values', () => {
    const testInputs = [undefined, null] as unknown as string[] // this is to force the value in
    for (const input of testInputs) {
      expect(substituteOldTemplates(input, varInfo)).toEqual('')
    }
  })

  it('should be not parse {{.}} inside element attributes', () => {
    const testCases = [
      {
        input:
          '<a href="https://form.gov.sg/abc?prefilled_value={{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello}}">Click here</a>',
        expected:
          '<a href="https://form.gov.sg/abc?prefilled_value={{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello}}">Click here</a>',
      },
      {
        input:
          '<img src="https://myownhosting.website/{{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello}}" >',
        expected:
          '<img src="https://myownhosting.website/{{step.ff5000f5-021c-4488-b6c2-c582c42ba3cf.hello}}" >',
      },
    ]
    for (const t of testCases) {
      expect(substituteOldTemplates(t.input, varInfo)).toEqual(t.expected)
    }
  })
})
