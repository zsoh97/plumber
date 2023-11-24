import apps from '@/apps'
import { generateStepError } from '@/helpers/generate-step-error'
import ExecutionStep from '@/models/execution-step'
import Step from '@/models/step'
import { processAction } from '@/services/action'
import { processFlow } from '@/services/flow'
import { processTrigger } from '@/services/trigger'

type TestRunOptions = {
  stepId: string
}

const testRunSingleStep = async (options: TestRunOptions) => {
  let untilStep = await Step.query()
    .findById(options.stepId)
    .withGraphFetched({
      flow: {
        steps: true,
      },
    })

  //
  // Start test run
  //

  untilStep = await Step.query()
    .findById(options.stepId)
    .withGraphFetched({
      flow: {
        steps: true,
      },
    })
    .modifyGraph('flow.steps', (builder) => builder.orderBy('position', 'asc'))

  const flow = untilStep.flow
  const [triggerStep, ...actionSteps] = untilStep.flow.steps

  const { data, error: triggerError } = await processFlow({
    flowId: flow.id,
    testRun: true,
  })

  if (triggerError) {
    const { executionStep: triggerExecutionStepWithError } =
      await processTrigger({
        flowId: flow.id,
        stepId: triggerStep.id,
        error: triggerError,
        testRun: true,
      })

    return { executionStep: triggerExecutionStepWithError }
  }

  const firstTriggerItem = data[0]

  const { executionId, executionStep: triggerExecutionStep } =
    await processTrigger({
      flowId: flow.id,
      stepId: triggerStep.id,
      triggerItem: firstTriggerItem,
      testRun: true,
    })

  if (triggerStep.id === untilStep.id) {
    return { executionStep: triggerExecutionStep }
  }

  // Actions may redirect steps. We keep track here so that we can let users
  // know if an action would have been skipped due to redirection.
  let nextStepId = actionSteps[0]?.id

  for (const actionStep of actionSteps) {
    const { executionStep: actionExecutionStep, nextStep } =
      await processAction({
        flowId: flow.id,
        stepId: actionStep.id,
        executionId,
        testRun: true,
      })

    if (actionExecutionStep.isFailed || actionStep.id === untilStep.id) {
      return { executionStep: actionExecutionStep }
    }

    // Don't update next step ID if actionStep wouldn't have been run in real
    // life.
    if (actionStep.id === nextStepId) {
      nextStepId = nextStep?.id
    }
  }
}

const testRun = async (options: TestRunOptions) => {
  const untilStep = await Step.query()
    .findById(options.stepId)
    .withGraphFetched({
      flow: {
        steps: true,
      },
    })
    .modifyGraph('flow.steps', (builder) => builder.orderBy('position', 'asc'))

  const flow = untilStep.flow
  const [triggerStep, ..._actionSteps] = untilStep.flow.steps

  const untilStepIndex = untilStep.flow.steps.findIndex(
    (s) => s.id === untilStep.id,
  )

  // get latest executions for each step
  const latestExecutions = await ExecutionStep.query()
    .select(Step.raw('distinct on (steps.id) steps.*'), 'execution_steps.*')
    .rightJoin('steps', 'steps.id', 'execution_steps.step_id')
    .whereIn(
      'steps.id',
      untilStep.flow.steps.map((s) => s.id),
    )
    .where('execution_steps.status', 'success')
    .orderBy('steps.id', 'desc')
    .orderBy('execution_steps.created_at', 'desc')
  untilStep.flow.steps = untilStep.flow.steps.map((s) => {
    const latestExecution = latestExecutions.find((e) => e.stepId === s.id)
    if (!latestExecution) {
      s.executionSteps = []
      return s
    }
    s.executionSteps = [latestExecution]
    return s
  })

  const isThereUntestedPriorStep = untilStep.flow.steps
    .slice(0, untilStepIndex)
    .some((s) => s.executionSteps.length === 0)
  if (isThereUntestedPriorStep) {
    throw generateStepError(
      'At least one of the previous steps has not been setup and tested successfully.',
      'Please set them up and make sure test has been done successfully.',
      untilStepIndex + 1,
      apps[untilStep.appKey].name,
    )
  }

  if (triggerStep.id === untilStep.id) {
    const { executionStep: triggerExecutionStep } = await processTrigger({
      flowId: flow.id,
      stepId: triggerStep.id,
      testRun: true,
    })
    return { executionStep: triggerExecutionStep }
  }

  return processAction({
    flowId: flow.id,
    stepId: untilStep.id,
    executionId:
      untilStep.flow.steps[untilStepIndex - 1].executionSteps[0].executionId,
    testRun: true,
  })
}

export { testRun, testRunSingleStep }
