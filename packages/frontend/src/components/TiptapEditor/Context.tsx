import { createContext, ReactNode, useState } from 'react'

interface IEditorContext {
  rawHtml: string
  richTextValue: string
  setRichTextValue: (str: string) => void
  setRawHtml: (str: string) => void
}

export const EditorContext = createContext<IEditorContext>({
  rawHtml: '',
  richTextValue: '',
  setRichTextValue: () => null,
  setRawHtml: () => null,
})

export const EditorContextProvider = ({
  children,
}: {
  children: ReactNode
}) => {
  const [richTextValue, setRichTextValue] = useState('')
  const [rawHtml, setRawHtml] = useState('')
  return (
    <EditorContext.Provider
      value={{
        richTextValue,
        rawHtml,
        setRichTextValue,
        setRawHtml,
      }}
    >
      {children}
    </EditorContext.Provider>
  )
}
