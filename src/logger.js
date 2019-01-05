const homedir = require('os').homedir();
const fs = require('fs')
let writeToFile = false


const black = "\x1b[30m"
const red = "\x1b[31m"
const green = "\x1b[32m"
const yellow = "\x1b[33m"
const blue = "\x1b[34m"
const magenta = "\x1b[35m"
const cyan = "\x1b[36m"
const white = "\x1b[37m"

const setWriteToFile = (bool) => {
    writeToFile = bool;
}

const formatDate = (date) => {
    const monthNames = [
        "Jan", "Feb", "Mar",
        "Apr", "May", "June", "July",
        "Aug", "Sep", "Oct",
        "Nov", "Dec"
    ];

    const seconds = date.getSeconds()
    const minutes = date.getMinutes()
    const hours = date.getHours()
    const day = date.getDate();
    const monthIndex = date.getMonth();
    const year = date.getFullYear();
    const offset = -(date.getTimezoneOffset() / 60)

    return {
        logformat: `[${day}/${monthNames[monthIndex]}/${year}:${hours}:${minutes}:${seconds} +${offset}]`,
        fileName: `${day}_${monthNames[monthIndex]}_${year}_${hours}_${minutes}_${seconds}.log`
    }
}

const _simhtPath = `${homedir}/.simht/`
const _filePath = _simhtPath+formatDate(new Date).fileName
if (!fs.existsSync(`${homedir}/.simht/`)){
    fs.mkdirSyncr(_simhtPath)
}

let file = null
const log = (data) => {
    if (!file && writeToFile) {
        file = fs.createWriteStream(_filePath, { flags: 'a+' })
    }
    const time = formatDate(new Date).logformat
    const { ip, uid, protocol, filePath, request, fileSize, responseCode } = data
    const string = `${time} ${uid} ${ip} ${request} ${filePath} HTTP${protocol} ${responseCode} ${fileSize}`
    if (file) file.write(string+'\n')
    console.log(green+string);
}

module.exports = {
    log,
    setWriteToFile
}