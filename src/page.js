// utils
const bytesToSize = bytes => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes == 0) return '0 Byte';
    const i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
    return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
};

const permsNumToChar = perms => {
    const inDec = (perms & parseInt("777", 8)).toString(8)
    const owner = parseInt(inDec[0])
    const group = parseInt(inDec[1])
    const everyone = parseInt(inDec[2])
    return (perms & 0040000 ? 'd' : '-') +

        (owner & 4 ? 'r' : '-') +
        (owner & 2 ? 'w' : '-') +
        (owner & 1 ? 'x' : '-') +

        (group & 4 ? 'r' : '-') +
        (group & 2 ? 'w' : '-') +
        (group & 1 ? 'x' : '-') +

        (everyone & 4 ? 'r' : '-') +
        (everyone & 2 ? 'w' : '-') +
        (everyone & 1 ? 'x' : '-') 
}

// page
function readFiles() {
    const element = document.getElementById('file')
    const file = element.files[0];

    const fileSize = file.size;
    const chunkSize = 8 * 1024 * 1024; // bytes
    let offset = 0;

    const readEventHandler = (evt) => {
        if (evt.target.error == null) {
            offset += evt.target.result.byteLength;
            const body = {
                file: evt.target.result,
                fileName: file.name,
                size: fileSize
            }
            const opt = { offset, chunkSize, file }

            let proc = offset/fileSize * 100
            proc = Math.round(proc)
            document.getElementById('progress-bar').style = `width: ${proc}%`
            document.getElementById('progress').innerText = `${proc}% ${offset}/${fileSize} bytes`

            uploadFiles(body, opt);
        } else {
            console.log("Read error: " + evt.target.error);
            return;
        }
        if (offset >= fileSize) {
            console.log("Done reading file");
            return;
        }
    }

    readChunk = (_offset, length, _file) => {
        const r = new FileReader();
        const blob = _file.slice(_offset, length + _offset);
        r.onload = readEventHandler;
        r.readAsArrayBuffer(blob);
    }
    readChunk(offset, chunkSize, file);
}


function uploadFiles(body, opt) {
    const headers = new Headers()
    headers.set('file-name', body.fileName)
    headers.set('Content-Length', body.size);
    headers.set('file-size', opt.file.size);
    fetch(document.location, {
        method: 'POST',
        headers,
        body: body.file
    })
        .then((res) => res.text())
        .then((res) => {
            if (res === 'next') {
                console.log(opt)
                const { offset, chunkSize, file } = opt;
                readChunk(offset, chunkSize, file);
            }
            if (res === 'ok') {
                console.log('Finished')
                window.location.reload();
            }
        })
        .catch((error) => { console.log(error) })
}

const renderElement = data => {
    const { perms, size, name, path } = data
    return `
        <tr>
            ${!!perms ? `<td class='perms'>
                <code>${permsNumToChar(perms)}</code>
            </td>`: ''}
            ${!!size ? `<td class='size'>
                <code>${bytesToSize(size, 3)}</code>
            </td>`: ''}
            <td class='name'>
                <a href=${encodeURI(path)}>${name}</a>
            </td>
        </tr>
        `}

const meta = `
        <meta 
            name='viewport' 
            content='width=device-width, initial-scale=1.0, maximum-scale=0.9, user-scalable=0' 
        />
    `;

const style = `
        #content {
            padding-left: 1rem;
        }
        #upload {
            padding-bottom: 2rem;
        }
        #progress-bar {
            height: 1rem;
            width: 0%;
            background-color: green;
        }
        td {
            padding-right: 1rem;
        }
    `;

const handlers = [
    uploadFiles,
    readFiles
].reduce((previous, current) => {
    return previous + current.toString() + '\n'
})

const serveHTML = (content, url) => {
    return `<!DOCTYPE html>
    <html>
        <head>
            <title>SimHt ${url}</title>
            <script>${handlers}</script>
            <style>${style}</style>
            ${meta}
        </head>
        <body>
        <div id="content">
            <h2 id="header">Index of ${url}</h2>
            <div id="progress-bar"></div>
            <div id="upload">
                <input id="file" type="file">
                <button onClick="${readFiles.name}()">Upload</button>
                <label id="progress"></label>
            </div>
            <table>
                <tbody>
                    ${content}
                </tbody>
            </table>
        </div>
        </body>
    </html>`;
}

module.exports = {
    uploadFiles,
    serveHTML,
    renderElement
}