import {
  IDataOutMetadata,
  IDataOutMetadatum,
  IExecutionStep,
  IJSONObject,
} from '@plumber/types'

import { parseS3Id } from '@/helpers/s3'

function buildQuestionMetadatum(fieldData: IJSONObject): IDataOutMetadatum {
  const question: IDataOutMetadatum = {
    type: 'text',
    label: fieldData.order ? `Question ${fieldData.order}` : null,
    order: fieldData.order ? (fieldData.order as number) : null,
  }

  if (fieldData.fieldType === 'attachment') {
    question['isHidden'] = true
  }

  return question
}

function buildAnswerMetadatum(fieldData: IJSONObject): IDataOutMetadatum {
  const answer: IDataOutMetadatum = {
    label: fieldData.order ? `Response ${fieldData.order}` : null,
    order: fieldData.order ? (fieldData.order as number) + 0.1 : null,
  }

  switch (fieldData.fieldType) {
    case 'attachment':
      answer['type'] = 'file'
      // We encode the question as the label because we hide the actual question
      // as a variable.
      answer['label'] = fieldData.question as string
      // For attachments, answer _has_ to be a S3 ID or an empty string (e.g.
      // in optional fields).
      answer['displayedValue'] =
        parseS3Id(fieldData.answer as string)?.objectName ??
        (fieldData.answer as string)
      break
    default:
      answer['type'] = 'text'
      answer['label'] = fieldData.order ? `Response ${fieldData.order}` : null
  }

  return answer
}

async function getDataOutMetadata(
  executionStep: IExecutionStep,
): Promise<IDataOutMetadata> {
  const data = executionStep.dataOut
  if (!data) {
    return null
  }

  const fieldMetadata: IDataOutMetadata = Object.create(null)
  for (const [fieldId, fieldData] of Object.entries(data.fields)) {
    fieldMetadata[fieldId] = {
      question: buildQuestionMetadatum(fieldData),
      answer: buildAnswerMetadatum(fieldData),
      fieldType: { isHidden: true },
      order: { isHidden: true },
    }
  }

  const verifiedMetadata: IDataOutMetadata = Object.create(null)
  if (data.verifiedSubmitterInfo) {
    for (const key of Object.keys(data.verifiedSubmitterInfo)) {
      switch (key) {
        case 'uinFin':
          verifiedMetadata.uinFin = { label: 'NRIC/FIN (Verified)' }
          break
        case 'sgidUinFin':
          verifiedMetadata.sgidUinFin = { label: 'NRIC/FIN (Verified)' }
          break
        case 'cpUid':
          verifiedMetadata.cpUid = { label: 'CorpPass UID (Verified)' }
          break
        case 'cpUen':
          verifiedMetadata.cpUen = { label: 'CorpPass UEN (Verified)' }
          break
      }
    }
  }

  return {
    fields: fieldMetadata,
    ...(data.verifiedSubmitterInfo && {
      verifiedSubmitterInfo: verifiedMetadata,
    }),
    submissionId: {
      type: 'text',
      label: 'Submission ID',
    },
    submissionTime: {
      type: 'text',
      label: 'Submission Time',
    },
  }
}

export default getDataOutMetadata

// Reference dataOut
// ---
// {
//   fields: {
//     647edbd2026dc800116b21f9: {
//       answer: 'zzz',
//       question: 'What is the air speed velocity of an unladen swallow?',
//       fieldType: 'textfield',
//       order: 2
//     },
//     648fe18a9175ce001196b3d5: {
//       answer: 'aaaa',
//       question: 'What is your name?',
//       fieldType: 'textfield',
//       order: 1
//     }
//     649d3183c4c52f00124ceb16: {
//       question: 'Attach your sparrow velocity readings.',
//       answer: 's3:common-bucket:649306c1ac8851001149af0a/649d3183c4c52f00124ceb16/my readings.txt',
//       fieldType: 'attachment',
//       order: 3
//     },
//   },
//   # verifiedSubmitterInfo may not exist!
//   verifiedSubmitterInfo: {
//       uinFin: 'S1234567B',
//       sgidUinFin: 'S1234567A',
//       cpUid: 'U987654323PLUMBER',
//       cpUen: 'S7654321Z',
//     },
//   submissionId: '649306c1ac8851001149af0a',
//   submissionTime: '2023-07-06T18:26:27.505+08:00'
// }
