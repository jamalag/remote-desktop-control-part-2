const { ipcRenderer, contextBridge } = require("electron")
let screenId

// ipcRenderer.on('SET_SOURCE_ID', async (event, sourceId) => {
//     console.log(sourceId)
//     screenId = sourceId
// })

contextBridge.exposeInMainWorld('electronAPI', {
    setSize: (size) => ipcRenderer.send('set-size', size),
    getScreenId: (callback) => ipcRenderer.on('SET_SOURCE_ID', callback)
})
