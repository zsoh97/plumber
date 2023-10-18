import 'remixicon/fonts/remixicon.css'
import './MenuBar.scss'

import { Editor } from '@tiptap/react'

const menuButtons = [
  {
    label: 'Bold',
    onClick: (editor: Editor) => editor.chain().focus().toggleBold().run(),
    icon: 'bold',
    isActive: (editor: Editor) => editor.isActive('bold'),
  },
  {
    label: 'Italic',
    onClick: (editor: Editor) => editor.chain().focus().toggleItalic().run(),
    icon: 'italic',
    isActive: (editor: Editor) => editor.isActive('italic'),
  },
  {
    label: 'Underline',
    icon: 'underline',
    onClick: (editor: Editor) => editor.chain().focus().toggleUnderline().run(),
    isActive: (editor: Editor) => editor.isActive('underline'),
  },
  {
    label: 'divider',
  },
  {
    label: 'Set link',
    icon: 'link',
    onClick: (editor: Editor) => {
      const previousUrl = editor.getAttributes('link').href
      const url = window.prompt('URL', previousUrl)

      // cancelled
      if (url === null) {
        return
      }

      // empty
      if (url === '') {
        editor.chain().focus().extendMarkRange('link').unsetLink().run()

        return
      }

      // update link
      editor
        .chain()
        .focus()
        .extendMarkRange('link')
        .setLink({ href: url })
        .run()
    },
  },
  {
    label: 'Remove link',
    icon: 'link-unlink-m',
    onClick: (editor: Editor) => editor.chain().focus().unsetLink().run(),
  },
  {
    label: 'divider',
  },
  {
    label: 'Paragraph',
    icon: 'paragraph',
    onClick: (editor: Editor) => editor.chain().focus().setParagraph().run(),
    isActive: (editor: Editor) => editor.isActive('paragraph'),
  },
  {
    label: 'Heading 1',
    icon: 'h-1',
    onClick: (editor: Editor) =>
      editor.chain().focus().toggleHeading({ level: 1 }).run(),
    isActive: (editor: Editor) => editor.isActive('heading', { level: 1 }),
  },
  {
    label: 'Heading 2',
    icon: 'h-2',
    onClick: (editor: Editor) =>
      editor.chain().focus().toggleHeading({ level: 2 }).run(),
    isActive: (editor: Editor) => editor.isActive('heading', { level: 2 }),
  },
  {
    label: 'Heading 3',
    icon: 'h-3',
    onClick: (editor: Editor) =>
      editor.chain().focus().toggleHeading({ level: 3 }).run(),
    isActive: (editor: Editor) => editor.isActive('heading', { level: 3 }),
  },
  {
    label: 'Heading 4',
    icon: 'h-4',
    onClick: (editor: Editor) =>
      editor.chain().focus().toggleHeading({ level: 4 }).run(),
    isActive: (editor: Editor) => editor.isActive('heading', { level: 4 }),
  },
  {
    label: 'Bullet List',
    icon: 'list-unordered',
    onClick: (editor: Editor) =>
      editor.chain().focus().toggleBulletList().run(),
    isActive: (editor: Editor) => editor.isActive('bulletList'),
  },
  {
    label: 'Ordered List',
    icon: 'list-ordered',
    onClick: (editor: Editor) =>
      editor.chain().focus().toggleOrderedList().run(),
    isActive: (editor: Editor) => editor.isActive('orderedList'),
  },
  {
    label: 'divider',
  },
  {
    label: 'Add Table',
    icon: 'table-2',
    onClick: (editor: Editor) =>
      editor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 3, withHeaderRow: false })
        .run(),
  },
  {
    label: 'Add column',
    icon: 'insert-column-right',
    onClick: (editor: Editor) => editor.chain().focus().addColumnAfter().run(),
  },
  {
    label: 'Remove column',
    icon: 'delete-column',
    onClick: (editor: Editor) => editor.chain().focus().deleteColumn().run(),
  },
  {
    label: 'Add row',
    icon: 'insert-row-bottom',
    onClick: (editor: Editor) => editor.chain().focus().addRowAfter().run(),
  },
  {
    label: 'Remove row',
    icon: 'delete-row',
    onClick: (editor: Editor) => editor.chain().focus().deleteRow().run(),
  },
  {
    label: 'divider',
  },
  {
    label: 'Horizontal Rule',
    icon: 'separator',
    onClick: (editor: Editor) =>
      editor.chain().focus().setHorizontalRule().run(),
  },
  {
    label: 'Clear Format',
    icon: 'format-clear',
    onClick: (editor: Editor) =>
      editor.chain().focus().clearNodes().unsetAllMarks().run(),
  },
  {
    label: 'Undo',
    icon: 'arrow-go-back-line',
    onClick: (editor: Editor) => editor.chain().focus().undo().run(),
  },
  {
    label: 'Redo',
    icon: 'arrow-go-forward-line',
    onClick: (editor: Editor) => editor.chain().focus().redo().run(),
  },
]

export const MenuBar = ({ editor }: { editor: Editor | null }) => {
  if (!editor) {
    return null
  }

  return (
    <div className="editor__header">
      {menuButtons.map(({ onClick, label, icon, isActive }, index) => {
        if (!onClick) {
          return <div className="divider" key={`${label}${index}`} />
        }
        return (
          <button
            key={`${label}${index}`}
            title={label}
            style={{
              borderRadius: '0.25rem',
              width: 'auto',
              minWidth: 0,
              backgroundColor: isActive?.(editor)
                ? 'rgba(0,0,0,0.1)'
                : 'transparent',
            }}
            className={`menu-item${isActive?.(editor) ? ' is-active' : ''}`}
            onClick={() => onClick(editor)}
          >
            <i className={`ri-${icon} ri-lg`}></i>
          </button>
        )
      })}
    </div>
  )
}
