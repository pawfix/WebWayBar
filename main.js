const { app, BrowserWindow, ipcMain, dialog } = require("electron")
const path = require("path")

let win

app.whenReady().then(() => {
    win = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    win.loadFile("index.html")

    win.webContents.once("did-finish-load", () => {
        const defaultConfigPath = path.join(app.getAppPath(), "./test/json/default.json")

        win.webContents.send("config-file-path", {
            path: defaultConfigPath
        })
    })
})

ipcMain.handle("open-config-file", async () => {
    const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [{ name: "JSON", extensions: ["json"] }]
    })

    return result
})
