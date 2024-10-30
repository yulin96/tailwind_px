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

  // 缓存配置和正则表达式
  const config = vscode.workspace.getConfiguration('TailwindPxConverter')
  const supportedLanguages = ['vue', 'javascriptreact', 'typescriptreact']
  const classAttributeRegex = /(?:class|:class)="([^"]*)"/g

  const saveEventDisposable = vscode.workspace.onDidSaveTextDocument(async (event) => {
    const editor = vscode.window.activeTextEditor
    if (!editor) {
      return
    }

    const isConversionEnabled = config.get<boolean>('enabled', true)

    if (isConversionEnabled && supportedLanguages.includes(event.languageId)) {
      const rules = config.get<{ [key: string]: string }>('rules', {})
      const text = event.getText()
      const edits: vscode.TextEdit[] = []

      let classAttrMatch: RegExpExecArray | null

      while ((classAttrMatch = classAttributeRegex.exec(text))) {
        const fullMatch = classAttrMatch[0]
        const classContent = classAttrMatch[1]
        let newClassContent = classContent

        for (const [key, value] of Object.entries(rules)) {
          const classNameRegex = new RegExp(`(\\s|^)${key}(\\d+)(?=\\s|$)`, 'g')
          newClassContent = newClassContent.replace(classNameRegex, (m, p1, p2) => `${p1}${value.replace('$1', p2)}`)
        }

        if (newClassContent !== classContent) {
          const startPos = event.positionAt(classAttrMatch.index)
          const endPos = event.positionAt(classAttrMatch.index + fullMatch.length)
          const newFullMatch = fullMatch.replace(classContent, newClassContent)
          edits.push(vscode.TextEdit.replace(new vscode.Range(startPos, endPos), newFullMatch))
        }
      }

      if (edits.length > 0) {
        setTimeout(async () => {
          const workspaceEdit = new vscode.WorkspaceEdit()
          workspaceEdit.set(event.uri, edits)
          await vscode.workspace.applyEdit(workspaceEdit)
          await vscode.workspace.save(event.uri) // 保存文件
        }, 100)
      }
    }
  })

  context.subscriptions.push(saveEventDisposable)
}

export function deactivate() {}
