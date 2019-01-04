const http = require('http')
const https = require('https')
const fs = require('fs')
const page = require("./page.js")

let body = null;

let route = process.argv[2]
route = route.replace(/\/$/g, '')

const listFiles = url => {
    const files = []
    const folders = []
    url = url.replace(/\/$/g, '')
    fs.readdirSync(url).forEach(item => {
        const path = `${url}/${item}`
        const stat = fs.statSync(path)
        if (stat.isFile()) {
            const data = {
                name: item,
                size: stat.size,
                perms: stat.mode,
                path
            }
            files.push(data)
        } else {
            const data = {
                name: item,
                perms: stat.mode,
                path: path.replace(/^\.\//g, '/')
            }
            folders.push(data)
        }
    })
    return folders.concat(files)
}

const handleFileRequest = (req, res, stat, filePath) => {
    let fileName = req.url.split('/')
    fileName = fileName.pop();

    res.setHeader('Content-Length', stat.size)
    res.setHeader('Content-Disposition', `attachment; filename=${fileName}`)
    fs.createReadStream(filePath).pipe(res);
}

const handleFileUpload = (req, res) => {
    const fileName = req.headers[`file-name`]
    const path = `.${decodeURI(req.url)}/${fileName}`

    if (!body) body = fs.createWriteStream(path);

    req.on('data', chunk => body.write(chunk));
    req.on('end', () => {
        if (req.headers['content-length'] == 0) {
            body.end()
            res.end('ok')
            body.destroy()
            body = null
        } else {
            res.end('next')
        }
    });
}

const handlePageRequest = (req, res, url) => {
    const files = listFiles(url)
    if (req.url !== '/') {
        const _url = url.split('/')
        _url.pop()
        files.unshift({
            name: `../`,
            path: _url.join('/').replace(/^\.\//g, '/')
        })
    }

    let content = ''
    files.forEach(file => content += page.renderElement(file))

    const html = page.serveHTML(content, url)
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
}


const instance = http.createServer((req, res) => {
    if (req.method === "GET") {
        if (req.url === './favicon.ico' || req.url === '/favicon.ico') return
        const url = route + decodeURI(req.url)
        if (req.url === '/') {
            handlePageRequest(req, res, url)
        } else {
            const stat = fs.statSync(url)
            if (stat.isFile()) {
                handleFileRequest(req, res, stat, url)
            } else {
                handlePageRequest(req, res, url)
            }
        }
    }
    if (req.method === "POST") {
        handleFileUpload(req, res)
    }
})

module.exports = { instance }