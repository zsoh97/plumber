import { testRunSingleStep } from '@/services/test-run'
import Context from '@/types/express/context'

const executeSingleStep = async (
  _parent: unknown,
  params: {
    input: { stepId: string }
  },
  ctx: Context,
) => {
  const { stepId } = params.input

  const untilStep = await ctx.currentUser
    .$relatedQuery('steps')
    .findById(stepId)
    .throwIfNotFound()

  const { executionStep } = await testRunSingleStep({ stepId })

  untilStep.executionSteps = [executionStep] // attach missing execution step into current step

  if (executionStep.isFailed) {
    throw new Error(JSON.stringify(executionStep.errorDetails))
  }

  if (executionStep.dataOut) {
    await untilStep.$query().patch({
      status: 'completed',
    })
  }

  return { data: executionStep.dataOut, step: untilStep }
}

export default executeSingleStep
