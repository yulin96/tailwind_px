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

  vscode.workspace.onWillSaveTextDocument(async (event) => {
    if (isConversionEnabled && event.reason === vscode.TextDocumentSaveReason.Manual) {
      const document = event.document
      const supportedLanguages = ['vue', 'javascriptreact', 'typescriptreact']
      if (supportedLanguages.includes(document.languageId)) {
        const config = vscode.workspace.getConfiguration('TailwindPxConverter')
        const rules = config.get<{ [key: string]: string }>('rules', {})

        let text = document.getText()
        for (const [key, value] of Object.entries(rules)) {
          const regex = new RegExp(`(class|:class)="([^"]*\\b${key}(\\d+)\\b[^"]*)"`, 'g')
          text = text.replace(regex, (match, p1, p2) => {
            return `${p1}="${p2.replace(new RegExp(`\\b${key}(\\d+)\\b`, 'g'), value)}"`
          })
        }

        const edit = new vscode.WorkspaceEdit()
        const fullRange = new vscode.Range(document.positionAt(0), document.positionAt(text.length))
        edit.replace(document.uri, fullRange, text)
        await vscode.workspace.applyEdit(edit)
      }
    }
  })
}

export function deactivate() {}
