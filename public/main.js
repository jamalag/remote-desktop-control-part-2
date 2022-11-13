const {
    app,
    BrowserWindow,
    desktopCapturer,
    ipcMain,
    Menu,
} = require('electron')
const path = require('path')
let availableScreens
let mainWindow

const sendSelectedScreen = (item) => {
    mainWindow.webContents.send('SET_SOURCE_ID', item.id)
}

const createTray = () => {
    const screensMenu = availableScreens.map(item => {
        return {
            label: item.name,
            click: () => {
                sendSelectedScreen(item)
            }
        }
    })

    const menu = Menu.buildFromTemplate([
        {
            label: app.name,
            submenu: [
                { role: 'quit' }
            ]
        },
        {
            label: 'Screens',
            submenu: screensMenu
        }
    ])

    Menu.setApplicationMenu(menu)
}


const createWindow = () => {
    mainWindow = new BrowserWindow({
        show: false,
        width: 800,
        height: 600,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js')
        }
    })

    ipcMain.on('set-size', (event, size) => {
        const { width, height } = size
        try {
            console.log('electron dim..', width, height)
            // mainWindow.setSize(width, height || 500, true)
            mainWindow.setSize(width, height, true)
        } catch (e) {
            console.log(e)
        }
    })

    mainWindow.loadURL('http://localhost:4000/')

    mainWindow.once('ready-to-show', () => {
        mainWindow.show()
        mainWindow.setPosition(0, 0)

        desktopCapturer.getSources({
            types: ['screen']
            // types: ['window', 'screen']
        }).then(sources => {
            availableScreens = sources
            createTray()
            // for (const source of sources) {
            //     console.log(sources)
            //     if (source.name === 'Screen 1') {
            //         mainWindow.webContents.send('SET_SOURCE_ID', source.id)
            //         return
            //     }
            // }
        })
    })

    mainWindow.webContents.openDevTools()
}

app.on('ready', () => {
    createWindow()
})