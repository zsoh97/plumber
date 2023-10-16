import './TiptapEditor.scss'

import { useCallback, useContext, useEffect } from 'react'
import { Controller, useFormContext } from 'react-hook-form'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Table from '@tiptap/extension-table'
import TableCell from '@tiptap/extension-table-cell'
import TableHeader from '@tiptap/extension-table-header'
import TableRow from '@tiptap/extension-table-row'
import Underline from '@tiptap/extension-underline'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import pretty from 'pretty'

import { EditorContext } from './Context'
import { MenuBar } from './MenuBar'

const RichTextEditor = ({
  required,
  defaultValue,
}: {
  required?: boolean
  defaultValue?: string
}) => {
  const { control } = useFormContext()
  const { richTextValue: initialValue, setRawHtml } = useContext(EditorContext)

  const onChange = useCallback(
    (newVal: string) => {
      setRawHtml(pretty(newVal))
    },
    [setRawHtml],
  )

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
      Image.configure({
        inline: true,
        HTMLAttributes: {
          width: '600px',
        },
      }),
    ],
    content: initialValue,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML())
    },
  })

  // this is required as value will not be set after the first render
  useEffect(() => {
    if (initialValue && editor) {
      editor.commands.setContent(initialValue)
    }
  }, [initialValue, editor])

  return (
    <Controller
      rules={{ required: true }}
      name="rich-text"
      control={control}
      defaultValue={defaultValue}
      render={({
        field: {
          value,
          onChange: controllerOnChange,
          onBlur: controllerOnBlur,
        },
      }) => (
        <div className="editor">
          {editor && <MenuBar editor={editor} />}
          <EditorContent className="editor__content" editor={editor} />
        </div>
      )}
    />
  )
}

export default RichTextEditor
