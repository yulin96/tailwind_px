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
    statusBarItem.text = isConversionEnabled ? '转换：✅' : '转换：🛑'
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

        for (const [key, value] of Object.entries(rules)) {
          const regex = new RegExp(`(class|:class)="[^"]*\\b${key}\\d+\\b[^"]*"`, 'g')
          let match: RegExpExecArray | null

          while ((match = regex.exec(text))) {
            const matchText = match[0]
            const newText = matchText.replace(
              new RegExp(`\\b${key}(\\d+)\\b`, 'g'),
              (m, p1) => `${value.replace('*', p1)}`
            )

            if (newText !== matchText) {
              const startPos = document.positionAt(match.index)
              const endPos = document.positionAt(match.index + matchText.length)
              const range = new vscode.Range(startPos, endPos)
              edits.push(vscode.TextEdit.replace(range, newText))
            }
          }
        }

        if (edits.length > 0) {
          const workspaceEdit = new vscode.WorkspaceEdit()
          workspaceEdit.set(document.uri, edits)
          await vscode.workspace.applyEdit(workspaceEdit)
        }
      }
    }
  })
  context.subscriptions.push(saveEventDisposable)
}

export function deactivate() {}
