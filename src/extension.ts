import * as vscode from 'vscode'

let isConversionEnabled = true // 默认开启转换

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "TailwindPxConverter" is now active!')

  // 创建状态栏按钮
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0)
  statusBarItem.command = 'TailwindPxConverter.toggleConversion'
  context.subscriptions.push(statusBarItem)

  // 更新状态栏按钮文本
  const updateStatusBarItem = () => {
    statusBarItem.text = isConversionEnabled ? '转换：✓' : '转换：✕'
    statusBarItem.show()
  }

  // 注册切换转换命令
  const toggleConversionCommand = vscode.commands.registerCommand('TailwindPxConverter.toggleConversion', () => {
    isConversionEnabled = !isConversionEnabled
    updateStatusBarItem()
  })
  context.subscriptions.push(toggleConversionCommand)

  // 初始化状态栏按钮
  updateStatusBarItem()

  const saveEventDisposable = vscode.workspace.onWillSaveTextDocument(async (event) => {
    if (isConversionEnabled && event.reason === vscode.TextDocumentSaveReason.Manual) {
      const document = event.document
      const editor = vscode.window.activeTextEditor
      const supportedLanguages = ['vue', 'javascriptreact', 'typescriptreact']

      if (editor && supportedLanguages.includes(document.languageId)) {
        const config = vscode.workspace.getConfiguration('TailwindPxConverter')
        const rules = config.get<{ [key: string]: string }>('rules', {})

        const text = document.getText()
        const edits: vscode.TextEdit[] = []

        const classAttributeRegex = /(?:class|:class)="([^"]*)"/g
        let classAttrMatch: RegExpExecArray | null

        while ((classAttrMatch = classAttributeRegex.exec(text))) {
          const fullMatch = classAttrMatch[0]
          const classContent = classAttrMatch[1]
          console.log(`a${classContent}a`)

          let newClassContent = classContent

          for (const [key, value] of Object.entries(rules)) {
            const classNameRegex = new RegExp(`(\\s|^)${key}(\\d+)(?=\\s|$)`, 'g')
            newClassContent = newClassContent.replace(classNameRegex, (m, p1, p2) => `${p1}${value.replace('$1', p2)}`)
          }

          if (newClassContent !== classContent) {
            const startPos = document.positionAt(classAttrMatch.index)
            const endPos = document.positionAt(classAttrMatch.index + fullMatch.length)
            const newFullMatch = fullMatch.replace(classContent, newClassContent)
            edits.push(vscode.TextEdit.replace(new vscode.Range(startPos, endPos), newFullMatch))
          }
        }

        // 如果有编辑，应用更改
        if (edits.length > 0) {
          const workspaceEdit = new vscode.WorkspaceEdit()
          workspaceEdit.set(document.uri, edits)
          event.waitUntil(Promise.resolve(workspaceEdit))
        }
      }
    }
  })
  context.subscriptions.push(saveEventDisposable)
}

export function deactivate() {}
