import * as vscode from 'vscode'

export function activate(context: vscode.ExtensionContext) {
  console.log('Congratulations, your extension "TailwindPxConverter" is now active!')

  // 创建状态栏按钮
  const statusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 0)
  statusBarItem.command = 'TailwindPxConverter.toggleConversion'
  context.subscriptions.push(statusBarItem)

  // 更新状态栏按钮文本
  const updateStatusBarItem = () => {
    const config = vscode.workspace.getConfiguration('TailwindPxConverter')
    const isConversionEnabled = config.get<boolean>('enabled', true)
    statusBarItem.text = isConversionEnabled ? '转换：✓' : '转换：✕'
    statusBarItem.show()
  }

  // 监听配置变化
  const configChangeDisposable = vscode.workspace.onDidChangeConfiguration((event) => {
    if (
      event.affectsConfiguration('TailwindPxConverter.enabled') ||
      event.affectsConfiguration('TailwindPxConverter.rules')
    ) {
      updateStatusBarItem()
    }
  })
  context.subscriptions.push(configChangeDisposable)

  // 注册切换转换命令，更新配置
  const toggleConversionCommand = vscode.commands.registerCommand('TailwindPxConverter.toggleConversion', async () => {
    const config = vscode.workspace.getConfiguration('TailwindPxConverter')
    const current = config.get<boolean>('enabled', true)
    await config.update('enabled', !current, vscode.ConfigurationTarget.Global)
  })
  context.subscriptions.push(toggleConversionCommand)

  // 初始化状态栏按钮
  updateStatusBarItem()

  const saveEventDisposable = vscode.workspace.onWillSaveTextDocument(async (event) => {
    const editor = vscode.window.activeTextEditor
    // 如果没有活动的编辑器，跳过处理
    if (!editor) {
      return
    }

    const config = vscode.workspace.getConfiguration('TailwindPxConverter')
    const isConversionEnabled = config.get<boolean>('enabled', true)

    if (isConversionEnabled && event.reason === vscode.TextDocumentSaveReason.Manual) {
      const document = event.document
      const supportedLanguages = ['vue', 'javascriptreact', 'typescriptreact']

      if (supportedLanguages.includes(document.languageId)) {
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
          event.waitUntil(vscode.workspace.applyEdit(workspaceEdit))
        }
      }
    }
  })
  context.subscriptions.push(saveEventDisposable)
}

export function deactivate() {}
