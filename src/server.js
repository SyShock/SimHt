const http = require('http')
const https = require('https')
const fs = require('fs')
const os = require('os')
const uid = os.userInfo().username
const page = require("./page.js")
const logger = require("./logger.js")

let fileStream = null;

const printHelp = () => {
    const helpText = `
    simht <options> <path to serve>
    
    Options:
    -h Prints this message
    -l Enable writting to logfile (homeDirectory/.simht)
    `
    console.log(helpText); process.exit();
}

if (process.argv.length === 2) {
    printHelp();
}

process.argv.forEach((val, index) => {
    switch (val) {
        case '-l': logger.setWriteToFile(true); break;
        case '-h': printHelp(); break;
        default: break;
    }
});

let route = process.argv[process.argv.length-1]
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
    logger.log({
        ip: req.connection.remoteAddress,
        uid,
        filePath,
        protocol: req.httpVersion,
        request: req.method,
        fileSize: stat.size,
        responseCode: res.statusCode 
    })
    fs.createReadStream(filePath).pipe(res);
}

const handleFileUpload = (req, res) => {
    const fileName = req.headers[`file-name`]
    const path = `.${decodeURI(req.url)}/${fileName}`

    if (!fileStream) {
        logger.log({
            ip: req.connection.remoteAddress,
            uid,
            filePath: path,
            protocol: req.httpVersion,
            request: req.method,
            fileSize: req.headers['file-size'],
            responseCode: res.statusCode
        })

        fileStream = fs.createWriteStream(path);
    }

    req.on('data', chunk => fileStream.write(chunk));
    req.on('end', () => {
        if (req.headers['content-length'] == 0) {
            fileStream.end()
            res.end('ok')
            fileStream.destroy()
            fileStream = null
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
            try {
                const stat = fs.statSync(url)
                if (stat.isFile()) {
                    handleFileRequest(req, res, stat, url)
                } else {
                    handlePageRequest(req, res, url)
                }
            }
            catch (err) {
                console.error(err)
            }
        }
    }
    if (req.method === "POST") {
        handleFileUpload(req, res)
    }
})

let ip = '127.0.0.1';
const ifaces = os.networkInterfaces();
Object.keys(ifaces).forEach( ifname => {
    ifaces[ifname].forEach( (iface) => {
        if ('IPv4' === iface.family && iface.internal === false) {
            ip = iface.address;
        }
    });
});

module.exports = { 
    instance,
    ip 
}