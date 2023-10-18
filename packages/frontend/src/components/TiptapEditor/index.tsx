import './TiptapEditor.scss'

import { useCallback, useContext, useMemo, useRef, useState } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import { FormControl } from '@chakra-ui/react'
import { ClickAwayListener, Popper } from '@mui/material'
import { FormLabel } from '@opengovsg/design-system-react'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Suggestions from 'components/PowerInput/Suggestions'
import { genVariableInfoMap } from 'components/PowerInput/utils'
import { StepExecutionsContext } from 'contexts/StepExecutions'
import {
  extractVariables,
  filterVariables,
  StepWithVariables,
  Variable,
} from 'helpers/variables'

import { MenuBar } from './MenuBar'
import { StepVariable } from './StepVariable'

interface SuggestionsPopperProps {
  open: boolean
  anchorEl: HTMLDivElement | null
  data: StepWithVariables[]
  onSuggestionClick: (variable: Variable) => void
}

const SuggestionsPopper = (props: SuggestionsPopperProps) => {
  const { open, anchorEl, data, onSuggestionClick } = props

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      // Allow (ugly) scrolling in nested modals for small viewports; modals
      // can't account for popper overflow if it is portalled to body.
      disablePortal
      style={{
        width: anchorEl?.clientWidth,
        // FIXME (ogp-weeloong): HACKY, temporary workaround. Needed to render
        // sugestions within nested editors, since Chakra renders modals at 40
        // z-index. Will migrate to chakra Popover in separate PR if team is
        // agreeable to flip change.
        zIndex: 40,
      }}
      modifiers={[
        {
          name: 'flip',
          enabled: true,
        },
      ]}
    >
      <Suggestions data={data} onSuggestionClick={onSuggestionClick} />
    </Popper>
  )
}

const RichTextEditor = ({
  onChange,
  initialValue,
}: {
  onChange: (...event: any[]) => void
  initialValue: string
}) => {
  const priorStepsWithExecutions = useContext(StepExecutionsContext)
  const [showVarSuggestions, setShowVarSuggestions] = useState(false)
  const editorRef = useRef<HTMLDivElement | null>(null)

  const [stepsWithVariables] = useMemo(() => {
    const stepsWithVars = filterVariables(
      extractVariables(priorStepsWithExecutions),
      (variable) => (variable.type ?? 'text') === 'text',
    )
    const info = genVariableInfoMap(stepsWithVars)
    return [stepsWithVars, info]
  }, [priorStepsWithExecutions])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        HTMLAttributes: { rel: null, target: '_blank' },
      }),
      Underline,
      Table.configure({
        resizable: false,
        HTMLAttributes: {
          style: 'border-collapse:collapse;',
        },
      }),
      TableRow,
      TableHeader,
      TableCell.configure({
        HTMLAttributes: {
          style: 'border:1px solid black;',
        },
      }),
      StepVariable,
    ],
    content: initialValue,
    onUpdate: ({ editor }) => {
      console.log(editor.getHTML())
      onChange(editor.getHTML())
    },
  })
  const handleVariableClick = useCallback(
    (variable: Variable) => {
      editor?.commands.insertContent({
        type: StepVariable.name,
        attrs: {
          id: variable.name,
          label: variable.label,
          value: variable.value,
        },
      })
    },
    [editor],
  )

  return (
    <div className="editor">
      {editor && <MenuBar editor={editor} />}

      <ClickAwayListener
        mouseEvent="onMouseDown"
        onClickAway={() => {
          setShowVarSuggestions(false)
        }}
      >
        <div ref={editorRef}>
          <EditorContent
            className="editor__content"
            editor={editor}
            onFocus={() => setShowVarSuggestions(true)}
          />
        </div>
      </ClickAwayListener>
      <SuggestionsPopper
        open={showVarSuggestions}
        anchorEl={editorRef.current}
        data={stepsWithVariables}
        onSuggestionClick={handleVariableClick}
      />
    </div>
  )
}

const ControllerWrapper = ({
  required,
  defaultValue,
  name,
  label,
  description,
}: {
  required?: boolean
  defaultValue?: string
  name: string
  label?: string
  description?: string
}) => {
  const { control } = useFormContext()
  return (
    <FormControl>
      {label && (
        <FormLabel isRequired={required} description={description}>
          {label}
        </FormLabel>
      )}
      <Controller
        rules={{ required }}
        name={name}
        control={control}
        defaultValue={defaultValue}
        render={({ field: { onChange, value } }) => (
          <RichTextEditor onChange={onChange} initialValue={value} />
        )}
      />
    </FormControl>
  )
}

export default ControllerWrapper
